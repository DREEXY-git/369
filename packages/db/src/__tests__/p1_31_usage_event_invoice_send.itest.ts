// Phase 1-31 統合テスト（要DB）: 非課金 UsageEvent emit（invoice-send のみ）の payload 仕様を DB レベルで検証。
// apps/web の実関数は直接叩かず、実メールも送らない。emit が生成する UsageEvent の形を再現して検証する。
// 重要: UsageEvent.metadata は非PIIの channel/status/kind のみ。
//        recipient/顧客情報/請求番号/請求金額/inv.total/inv.number/maskedBody/本文/金額/secret/invoiceId を入れない。
// emit するのは status が logged / sent のときだけ。failed / rejected / blocked / suppressed は emit しない（never_billable 相当）。
// Phase 1-31 では billing は usage_only のみ。billable_candidate / never_billable は使わない。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';

const T1 = `itest-p131-${Date.now()}-a`;
const T2 = `itest-p131-${Date.now()}-b`;

// emit payload を invoice-send と同一仕様で組み立てる（金額・finance値・PII・本文を含まない）。
function invoiceSendUsagePayload(tenantId: string, actorId: string, invoiceId: string, status: 'logged' | 'sent') {
  return {
    tenantId,
    actorId,
    actorType: 'user',
    eventType: 'external_send.invoice',
    category: 'external_send',
    billing: 'usage_only',
    unit: 'count',
    quantity: 1,
    sourceType: 'Invoice',
    sourceId: invoiceId,
    idempotencyKey: `usage:external_send.invoice:${invoiceId}`,
    metadata: { channel: 'email', status, kind: 'invoice' },
  } as const;
}

// runtime の emit 条件（logged / sent のみ emit、failed/rejected/blocked/suppressed は emit しない）を純関数で再現。
function shouldEmit(sendStatus: string): boolean {
  return sendStatus === 'logged' || sendStatus === 'sent';
}

afterAll(async () => {
  await prisma.usageEvent.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
});

describe('Phase 1-31 非課金 UsageEvent emit（invoice-send）', () => {
  it('external_send.invoice の UsageEvent を作成でき、payload が仕様どおり保存される', async () => {
    const ev = await prisma.usageEvent.create({ data: invoiceSendUsagePayload(T1, 'user-1', 'invoice-1', 'sent') });

    expect(ev.tenantId).toBe(T1);
    expect(ev.actorId).toBe('user-1');
    expect(ev.actorType).toBe('user');
    expect(ev.eventType).toBe('external_send.invoice');
    expect(ev.category).toBe('external_send');
    expect(ev.billing).toBe('usage_only');
    expect(ev.unit).toBe('count');
    expect(ev.quantity.toString()).toBe('1');
    expect(ev.sourceType).toBe('Invoice');
    expect(ev.sourceId).toBe('invoice-1');
    expect(ev.idempotencyKey).toBe('usage:external_send.invoice:invoice-1');
    expect(ev.metadata).toEqual({ channel: 'email', status: 'sent', kind: 'invoice' });
  });

  it('metadata は channel / status / kind のみ（finance値/PII/本文/金額/請求番号/recipient/invoiceId を含まない）', async () => {
    const ev = await prisma.usageEvent.create({ data: invoiceSendUsagePayload(T1, 'user-1', 'invoice-meta', 'logged') });
    const meta = (ev.metadata ?? {}) as Record<string, unknown>;
    expect(Object.keys(meta).sort()).toEqual(['channel', 'kind', 'status']);
    for (const forbidden of [
      'recipient', 'customer', 'email', 'name', 'subject', 'body', 'maskedBody',
      'amount', 'price', 'currency', 'total', 'number', 'receivable', 'invoiceId', 'secret', 'token',
    ]) {
      expect(meta).not.toHaveProperty(forbidden);
    }
    // 金額系フィールドはモデルにも存在しない。
    expect((ev as Record<string, unknown>).amount).toBeUndefined();
    expect((ev as Record<string, unknown>).price).toBeUndefined();
    expect((ev as Record<string, unknown>).currency).toBeUndefined();
  });

  it('billing は usage_only（billable_candidate / never_billable ではない）', async () => {
    const ev = await prisma.usageEvent.create({ data: invoiceSendUsagePayload(T1, 'user-1', 'invoice-billing', 'logged') });
    expect(ev.billing).toBe('usage_only');
    expect(ev.billing).not.toBe('billable_candidate');
    expect(ev.billing).not.toBe('never_billable');
  });

  it('emit 条件: logged / sent のみ emit、failed / rejected / blocked / suppressed は emit しない', () => {
    expect(shouldEmit('logged')).toBe(true);
    expect(shouldEmit('sent')).toBe(true);
    expect(shouldEmit('failed')).toBe(false);
    expect(shouldEmit('rejected')).toBe(false);
    expect(shouldEmit('blocked')).toBe(false);
    expect(shouldEmit('suppressed')).toBe(false);
  });

  it('同一 tenantId + idempotencyKey は二重作成できない（同じ Invoice 送信を二重計上しない）', async () => {
    await prisma.usageEvent.create({ data: invoiceSendUsagePayload(T1, 'user-1', 'invoice-dup', 'sent') });
    await expect(
      prisma.usageEvent.create({ data: invoiceSendUsagePayload(T1, 'user-1', 'invoice-dup', 'sent') }),
    ).rejects.toThrow();
  });

  it('別 tenant なら同じ idempotencyKey でも作成可能', async () => {
    const a = await prisma.usageEvent.create({ data: invoiceSendUsagePayload(T1, 'user-1', 'invoice-shared', 'logged') });
    const b = await prisma.usageEvent.create({ data: invoiceSendUsagePayload(T2, 'user-2', 'invoice-shared', 'logged') });
    expect(a.id).not.toBe(b.id);
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a.tenantId).toBe(T1);
    expect(b.tenantId).toBe(T2);
  });
});
