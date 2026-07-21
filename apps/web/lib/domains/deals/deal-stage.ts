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
  | { ok: false; reason: 'notfound' | 'invalid-stage' | 'already' | 'stale' };

/**
 * 案件ステージ変更の testable core（Server Action から切り出し・fault 注入で証拠化）。
 * enum 検証 → **expectedStage（画面表示時の stage）を CAS 条件**にして stale-intent を弾く → 履歴＋監査を
 * 単一 $transaction で確定。expectedStage を固定条件にすることで、古い画面からの上書きや、実行時に現 stage を
 * 読み直すことによる「異なる次stageへの並行変更が両方成功」（E2-02/F-02）を構造的に排除する。
 * 敗者は lock 下で現 stage を確定読みし、target 済み=already / それ以外=stale（画面が古い）へ分岐。
 * expectedStage 未指定時は後方互換で現 stage を採用。
 */
export async function updateDealStageCore(
  actor: { tenantId: string; userId?: string | null },
  input: { dealId: string; stage: string; expectedStage?: string; lostReason?: string },
  opts: DealStageTestHooks = {},
): Promise<UpdateDealStageResult> {
  if (!(DEAL_STAGES as readonly string[]).includes(input.stage)) return { ok: false, reason: 'invalid-stage' };
  const deal = await prisma.deal.findFirst({ where: { id: input.dealId, tenantId: actor.tenantId }, select: { title: true, stage: true } });
  if (!deal) return { ok: false, reason: 'notfound' };
  // 期待 stage = 画面表示時の stage（form の hidden）。妥当な enum のみ採用・無ければ現 stage で後方互換。
  const expected: DealStage =
    input.expectedStage && (DEAL_STAGES as readonly string[]).includes(input.expectedStage)
      ? (input.expectedStage as DealStage)
      : deal.stage;

  const outcome = await prisma.$transaction(async (tx) => {
    // 対象 Deal を FOR UPDATE で直列化してから、expected を CAS 条件にする（lease.ts と同型の barrier）。
    await tx.$queryRaw`SELECT id FROM "Deal" WHERE id = ${input.dealId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
    // LOST への遷移時のみ失注理由を記録（Deal.lostReason は既存 field・migration 不要）。他 stage では触らない（後方互換）。
    const lostReason = input.stage === 'LOST' && input.lostReason ? input.lostReason.slice(0, 200) : undefined;
    const claim = await tx.deal.updateMany({
      where: { id: input.dealId, tenantId: actor.tenantId, stage: expected },
      data: { stage: input.stage as DealStage, ...(lostReason ? { lostReason } : {}) },
    });
    if (claim.count !== 1) {
      // 敗者: lock 下で現 stage を確定読み。target 済み=already（冪等 no-op）／それ以外=stale（画面が古い＝要再読込）。
      const cur = await tx.deal.findFirst({ where: { id: input.dealId, tenantId: actor.tenantId }, select: { stage: true } });
      return cur?.stage === input.stage ? 'already' : 'stale';
    }
    await tx.dealStageHistory.create({
      data: { tenantId: actor.tenantId, dealId: input.dealId, fromStage: expected, toStage: input.stage as DealStage, changedById: actor.userId ?? null },
    });
    if (opts.__faultBetweenWritesForTest) opts.__faultBetweenWritesForTest();
    await tx.auditLog.create({
      data: { tenantId: actor.tenantId, actorId: actor.userId ?? null, actorType: 'user', action: 'update', entityType: 'Deal', entityId: input.dealId, summary: `案件「${deal.title}」のステージを ${input.stage} に変更` },
    });
    return 'ok' as const;
  });
  if (outcome === 'ok') return { ok: true };
  return { ok: false, reason: outcome };
}
