import { DEAL_STAGES, type DealStage } from '@hokko/shared';
import { prisma } from '@/lib/db';

// 案件ステージ変更の production-shared core（Codex M1-b E-03 / CAS misc）。
// Server Action（app/(app)/deals/actions.ts）の本体をここへ切り出し、実 PostgreSQL 証拠 spec が
// fault hook 付きで直接呼べるようにする（lib/domains/operations/lease.ts の LeaseTestHooks /
// __faultAfterLineForTest と同じ様式・next/cache 非依存で test loader から import 可能）。
// hook 未指定時は本番挙動と同一。

/** M1-b 証拠用 test-only fault フック（本番未指定時は無作用）。 */
export interface DealStageTestHooks {
  /** tx 内で History 作成後・Audit 作成前に throw させ、CAS ごと全 rollback（stage 不変）を実証する。 */
  __faultBetweenWritesForTest?: () => void;
}

export type UpdateDealStageResult =
  | { ok: true }
  | { ok: false; reason: 'notfound' | 'invalid-stage' | 'already' };

/**
 * 案件ステージ変更の testable core（Server Action から切り出し・fault 注入で証拠化）。
 * enum 検証（任意文字列の書き込み排除）→ 現ステージ CAS（fromStage 一致時のみ・並行変更を1本に収束）→
 * 履歴＋監査を単一 $transaction で確定。CAS count≠1（並行敗者/replay）は書き込みゼロで already。
 */
export async function updateDealStageCore(
  actor: { tenantId: string; userId?: string | null },
  input: { dealId: string; stage: string },
  opts: DealStageTestHooks = {},
): Promise<UpdateDealStageResult> {
  if (!(DEAL_STAGES as readonly string[]).includes(input.stage)) return { ok: false, reason: 'invalid-stage' };
  const deal = await prisma.deal.findFirst({ where: { id: input.dealId, tenantId: actor.tenantId } });
  if (!deal) return { ok: false, reason: 'notfound' };

  const changed = await prisma.$transaction(async (tx) => {
    const claim = await tx.deal.updateMany({
      where: { id: input.dealId, tenantId: actor.tenantId, stage: deal.stage },
      data: { stage: input.stage as DealStage },
    });
    if (claim.count !== 1) return false;
    await tx.dealStageHistory.create({
      data: { tenantId: actor.tenantId, dealId: input.dealId, fromStage: deal.stage, toStage: input.stage as DealStage, changedById: actor.userId ?? null },
    });
    if (opts.__faultBetweenWritesForTest) opts.__faultBetweenWritesForTest();
    await tx.auditLog.create({
      data: { tenantId: actor.tenantId, actorId: actor.userId ?? null, actorType: 'user', action: 'update', entityType: 'Deal', entityId: input.dealId, summary: `案件「${deal.title}」のステージを ${input.stage} に変更` },
    });
    return true;
  });
  return changed ? { ok: true } : { ok: false, reason: 'already' };
}
