// Wave2 統合テスト（要DB）: transitionOverdueReceivables（受取債権 期日超過→overdue 自動遷移）の実 DB 検証。
// worker RECEIVABLE_OVERDUE_JOB が呼ぶコアを直接叩く（実 worker/queue は起動しない）。
// 検証:
//  - open かつ dueDate < now のみ overdue へ遷移する（future / dueDate=null / collected / 既 overdue は不変）。
//  - 冪等（再実行で二重遷移せず transitioned=0・監査も増えない）。
//  - tenantId スコープ（別テナントの売掛は対象外）。
//  - count>0 のときだけ監査 receivable_overdue_transition を1件記録。
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { prisma } from '../client';
import { transitionOverdueReceivables } from '../receivables';

const STAMP = Date.now();
const T1 = `itest-wave2-ov-${STAMP}-a`;
const T2 = `itest-wave2-ov-${STAMP}-b`;
const NOW = new Date('2030-06-15T00:00:00Z');
const PAST = new Date('2030-06-01T00:00:00Z'); // < NOW
const FUTURE = new Date('2030-07-01T00:00:00Z'); // > NOW

async function mkReceivable(tenantId: string, tag: string, status: string, dueDate: Date | null) {
  const invoice = await prisma.invoice.create({
    data: { tenantId, number: `INV-${tenantId}-${tag}-${STAMP}`, total: 1000, dueDate },
  });
  return prisma.receivable.create({
    data: { tenantId, invoiceId: invoice.id, amount: 1000, status, dueDate },
  });
}

async function cleanup() {
  // Codex #4965087729 P2 hygiene: tenant 全体ではなく本テストが作る action のみを削除する
  //（合成 tenant T1/T2 だが、tenant 全体削除の型を残さない）。
  await prisma.auditLog.deleteMany({ where: { tenantId: { in: [T1, T2] }, action: 'receivable_overdue_transition' } });
  await prisma.receivable.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
  await prisma.invoice.deleteMany({ where: { tenantId: { in: [T1, T2] } } });
}

beforeEach(cleanup);
afterAll(cleanup);

describe('Wave2 transitionOverdueReceivables（期日超過→overdue 自動遷移）', () => {
  it('open かつ期日超過のみ overdue に遷移し、それ以外は不変', async () => {
    const pastOpen = await mkReceivable(T1, 'pastopen', 'open', PAST);
    const futureOpen = await mkReceivable(T1, 'futureopen', 'open', FUTURE);
    const nullDue = await mkReceivable(T1, 'nulldue', 'open', null);
    const collected = await mkReceivable(T1, 'collected', 'collected', PAST);
    const already = await mkReceivable(T1, 'already', 'overdue', PAST);

    const res = await transitionOverdueReceivables({ tenantId: T1, now: NOW });
    expect(res.transitioned).toBe(1);

    expect((await prisma.receivable.findUnique({ where: { id: pastOpen.id } }))!.status).toBe('overdue');
    expect((await prisma.receivable.findUnique({ where: { id: futureOpen.id } }))!.status).toBe('open');
    expect((await prisma.receivable.findUnique({ where: { id: nullDue.id } }))!.status).toBe('open');
    expect((await prisma.receivable.findUnique({ where: { id: collected.id } }))!.status).toBe('collected');
    expect((await prisma.receivable.findUnique({ where: { id: already.id } }))!.status).toBe('overdue');

    const audits = await prisma.auditLog.findMany({ where: { tenantId: T1, action: 'receivable_overdue_transition' } });
    expect(audits).toHaveLength(1);
    expect(audits[0]!.actorType).toBe('system');
    expect(audits[0]!.entityType).toBe('Receivable');
  });

  it('冪等: 再実行で二重遷移せず transitioned=0・監査も増えない', async () => {
    await mkReceivable(T1, 'pastopen', 'open', PAST);
    const first = await transitionOverdueReceivables({ tenantId: T1, now: NOW });
    expect(first.transitioned).toBe(1);
    const second = await transitionOverdueReceivables({ tenantId: T1, now: NOW });
    expect(second.transitioned).toBe(0);

    const overdueCount = await prisma.receivable.count({ where: { tenantId: T1, status: 'overdue' } });
    expect(overdueCount).toBe(1);
    const audits = await prisma.auditLog.count({ where: { tenantId: T1, action: 'receivable_overdue_transition' } });
    expect(audits).toBe(1); // 2回目は count=0 のため監査を追記しない
  });

  it('tenantId スコープ: 指定テナント以外の期日超過売掛は遷移しない', async () => {
    const t1Past = await mkReceivable(T1, 'pastopen', 'open', PAST);
    const t2Past = await mkReceivable(T2, 'pastopen', 'open', PAST);

    const res = await transitionOverdueReceivables({ tenantId: T1, now: NOW });
    expect(res.transitioned).toBe(1);

    expect((await prisma.receivable.findUnique({ where: { id: t1Past.id } }))!.status).toBe('overdue');
    expect((await prisma.receivable.findUnique({ where: { id: t2Past.id } }))!.status).toBe('open');
  });
});
