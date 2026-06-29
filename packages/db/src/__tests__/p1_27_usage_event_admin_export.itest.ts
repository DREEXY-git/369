// Phase 1-27 統合テスト（要DB）: 非課金 UsageEvent emit（admin danger-actions export のみ）の payload 仕様を DB レベルで検証。
// apps/web の Server Action は直接叩かず、emit が生成する UsageEvent の形（export.generated / usage_only）を再現して検証する。
// 重要: UsageEvent.metadata は固定の非PII値（scope/format/source）のみ。req.payloadAfter の実値・顧客情報・CSV本文・件数・金額・secret・実IDを入れない。
// Phase 1-27 では billing は usage_only のみ。billable_candidate / never_billable は使わない。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';

const T1 = `itest-p127-${Date.now()}-a`;
const T2 = `itest-p127-${Date.now()}-b`;

// emit payload を danger-actions export と同一仕様で組み立てる（金額・PII・実IDを含まない）。
function adminExportUsagePayload(tenantId: string, actorId: string, exportJobId: string) {
  return {
    tenantId,
    actorId,
    actorType: 'user',
    eventType: 'export.generated',
    category: 'export',
    billing: 'usage_only',
    unit: 'count',
    quantity: 1,
    sourceType: 'ExportJob',
    sourceId: exportJobId,
    idempotencyKey: `usage:export.generated:${exportJobId}`,
    metadata: { scope: 'admin_danger_actions_export', format: 'csv', source: 'admin_danger_actions' },
  } as const;
}

afterAll(async () => {
  await prisma.usageEvent.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
});

describe('Phase 1-27 非課金 UsageEvent emit（admin danger-actions export）', () => {
  it('export.generated の UsageEvent を作成でき、payload が仕様どおり保存される', async () => {
    const ev = await prisma.usageEvent.create({ data: adminExportUsagePayload(T1, 'user-1', 'exportjob-1') });

    expect(ev.tenantId).toBe(T1);
    expect(ev.actorId).toBe('user-1');
    expect(ev.actorType).toBe('user');
    expect(ev.eventType).toBe('export.generated');
    expect(ev.category).toBe('export');
    expect(ev.billing).toBe('usage_only');
    expect(ev.unit).toBe('count');
    expect(ev.quantity.toString()).toBe('1');
    expect(ev.sourceType).toBe('ExportJob');
    expect(ev.sourceId).toBe('exportjob-1');
    expect(ev.idempotencyKey).toBe('usage:export.generated:exportjob-1');
    expect(ev.metadata).toEqual({ scope: 'admin_danger_actions_export', format: 'csv', source: 'admin_danger_actions' });
  });

  it('metadata は許可キー（scope/format/source）のみ（PII/本文/金額/実IDを含まない）', async () => {
    const ev = await prisma.usageEvent.create({ data: adminExportUsagePayload(T1, 'user-1', 'exportjob-meta') });
    const meta = (ev.metadata ?? {}) as Record<string, unknown>;
    expect(Object.keys(meta).sort()).toEqual(['format', 'scope', 'source']);
    for (const forbidden of [
      'email', 'name', 'customer', 'body', 'csvBody', 'amount', 'price', 'currency',
      'count', 'secret', 'token', 'apiKey', 'DATABASE_URL', 'payloadAfter', 'approvalId', 'exportJobId',
    ]) {
      expect(meta).not.toHaveProperty(forbidden);
    }
    // 金額系フィールドはモデルにも存在しない。
    expect((ev as Record<string, unknown>).amount).toBeUndefined();
    expect((ev as Record<string, unknown>).price).toBeUndefined();
    expect((ev as Record<string, unknown>).currency).toBeUndefined();
  });

  it('billing は usage_only（billable_candidate / never_billable ではない）', async () => {
    const ev = await prisma.usageEvent.create({ data: adminExportUsagePayload(T1, 'user-1', 'exportjob-billing') });
    expect(ev.billing).toBe('usage_only');
    expect(ev.billing).not.toBe('billable_candidate');
    expect(ev.billing).not.toBe('never_billable');
  });

  it('同一 tenantId + idempotencyKey は二重作成できない（同じ ExportJob を二重計上しない）', async () => {
    await prisma.usageEvent.create({ data: adminExportUsagePayload(T1, 'user-1', 'exportjob-dup') });
    await expect(
      prisma.usageEvent.create({ data: adminExportUsagePayload(T1, 'user-1', 'exportjob-dup') }),
    ).rejects.toThrow();
  });

  it('別 tenant なら同じ idempotencyKey でも作成可能', async () => {
    const a = await prisma.usageEvent.create({ data: adminExportUsagePayload(T1, 'user-1', 'exportjob-shared') });
    const b = await prisma.usageEvent.create({ data: adminExportUsagePayload(T2, 'user-2', 'exportjob-shared') });
    expect(a.id).not.toBe(b.id);
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a.tenantId).toBe(T1);
    expect(b.tenantId).toBe(T2);
  });
});
