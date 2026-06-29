// Phase 1-29 統合テスト（要DB）: 非課金 UsageEvent emit（approvals outreach 送信のみ）の payload 仕様を DB レベルで検証。
// apps/web の Server Action は直接叩かず、実メールも送らない。emit が生成する UsageEvent の形を再現して検証する。
// 重要: UsageEvent.metadata は非PIIの channel/status のみ。toAddress/subject/body/draftId/leadId/顧客情報/金額/secret を入れない。
// emit するのは status が logged / sent のときだけ。suppressed / failed は emit しない（never_billable 相当）。
// Phase 1-29 では billing は usage_only のみ。billable_candidate / never_billable は使わない。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';

const T1 = `itest-p129-${Date.now()}-a`;
const T2 = `itest-p129-${Date.now()}-b`;

// emit payload を approvals outreach 送信と同一仕様で組み立てる（金額・PII・本文を含まない）。
function outreachUsagePayload(tenantId: string, actorId: string, logId: string, status: 'logged' | 'sent') {
  return {
    tenantId,
    actorId,
    actorType: 'user',
    eventType: 'external_send.outreach',
    category: 'external_send',
    billing: 'usage_only',
    unit: 'count',
    quantity: 1,
    sourceType: 'OutreachSendLog',
    sourceId: logId,
    idempotencyKey: `usage:external_send.outreach:${logId}`,
    metadata: { channel: 'email', status },
  } as const;
}

// runtime の emit 条件（logged / sent のみ emit、suppressed / failed は emit しない）を純関数で再現。
function shouldEmit(sendStatus: string): boolean {
  return sendStatus === 'logged' || sendStatus === 'sent';
}

afterAll(async () => {
  await prisma.usageEvent.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
});

describe('Phase 1-29 非課金 UsageEvent emit（approvals outreach 送信）', () => {
  it('external_send.outreach の UsageEvent を作成でき、payload が仕様どおり保存される', async () => {
    const ev = await prisma.usageEvent.create({ data: outreachUsagePayload(T1, 'user-1', 'outreachlog-1', 'sent') });

    expect(ev.tenantId).toBe(T1);
    expect(ev.actorId).toBe('user-1');
    expect(ev.actorType).toBe('user');
    expect(ev.eventType).toBe('external_send.outreach');
    expect(ev.category).toBe('external_send');
    expect(ev.billing).toBe('usage_only');
    expect(ev.unit).toBe('count');
    expect(ev.quantity.toString()).toBe('1');
    expect(ev.sourceType).toBe('OutreachSendLog');
    expect(ev.sourceId).toBe('outreachlog-1');
    expect(ev.idempotencyKey).toBe('usage:external_send.outreach:outreachlog-1');
    expect(ev.metadata).toEqual({ channel: 'email', status: 'sent' });
  });

  it('metadata は channel / status のみ（PII/本文/メール/件名/顧客情報/金額/ID を含まない）', async () => {
    const ev = await prisma.usageEvent.create({ data: outreachUsagePayload(T1, 'user-1', 'outreachlog-meta', 'logged') });
    const meta = (ev.metadata ?? {}) as Record<string, unknown>;
    expect(Object.keys(meta).sort()).toEqual(['channel', 'status']);
    for (const forbidden of [
      'toAddress', 'fromAddress', 'subject', 'body', 'email', 'target', 'name', 'customer',
      'draftId', 'leadId', 'placeId', 'amount', 'price', 'currency', 'secret', 'token',
    ]) {
      expect(meta).not.toHaveProperty(forbidden);
    }
    // 金額系フィールドはモデルにも存在しない。
    expect((ev as Record<string, unknown>).amount).toBeUndefined();
    expect((ev as Record<string, unknown>).currency).toBeUndefined();
  });

  it('billing は usage_only（billable_candidate / never_billable ではない）', async () => {
    const ev = await prisma.usageEvent.create({ data: outreachUsagePayload(T1, 'user-1', 'outreachlog-billing', 'logged') });
    expect(ev.billing).toBe('usage_only');
    expect(ev.billing).not.toBe('billable_candidate');
    expect(ev.billing).not.toBe('never_billable');
  });

  it('emit 条件: logged / sent のみ emit、suppressed / failed / rejected は emit しない', () => {
    expect(shouldEmit('logged')).toBe(true);
    expect(shouldEmit('sent')).toBe(true);
    expect(shouldEmit('suppressed')).toBe(false);
    expect(shouldEmit('failed')).toBe(false);
    expect(shouldEmit('rejected')).toBe(false);
    expect(shouldEmit('blocked')).toBe(false);
  });

  it('同一 tenantId + idempotencyKey は二重作成できない（同じ OutreachSendLog を二重計上しない）', async () => {
    await prisma.usageEvent.create({ data: outreachUsagePayload(T1, 'user-1', 'outreachlog-dup', 'sent') });
    await expect(
      prisma.usageEvent.create({ data: outreachUsagePayload(T1, 'user-1', 'outreachlog-dup', 'sent') }),
    ).rejects.toThrow();
  });

  it('別 tenant なら同じ idempotencyKey でも作成可能', async () => {
    const a = await prisma.usageEvent.create({ data: outreachUsagePayload(T1, 'user-1', 'outreachlog-shared', 'logged') });
    const b = await prisma.usageEvent.create({ data: outreachUsagePayload(T2, 'user-2', 'outreachlog-shared', 'logged') });
    expect(a.id).not.toBe(b.id);
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a.tenantId).toBe(T1);
    expect(b.tenantId).toBe(T2);
  });
});
