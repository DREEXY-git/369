// 棚卸（Stocktake）lifecycle の業務ロジック。Phase 1-9 保守リファクタ＋P3-INV（Codex CR #4990223932 対応）。
// 設計ルール: docs/audit/12_maintenance_architecture.md。Server Action はこのサービスを呼ぶだけ。
//
// CR の要求と対応:
//  1. record/complete を domain service へ集約。**tenant-scoped 親 Stocktake を先に FOR UPDATE** →
//     対象 Line を lock/re-read（親→Line の決定論 lock 順で record/complete/reconcile を直列化）→
//     同一 transaction 内の条件付き CAS で状態遷移を確定する。
//  2. count 記録は**非終端 status（draft|counted・completedAt=null）かつ line.reconciled=false** の時だけ
//     許可。完了済み親/Line への replay は DB 書込・Audit・Event ゼロで fail-closed（親が counted へ
//     逆行して completedAt が残る恒久矛盾を構造的に排除）。
//  3. complete は **status='counted' からのみ**許可し、transaction 内（親 lock 保持下）で
//     「全 Line がカウント済み」「非ゼロ差異 Line がすべて reconciled（承認実行済みは executor が
//     reconciled=true を書く）」「対象 Line の stocktake_adjust PENDING 承認 0」を再確認する。
//     **ゼロ差異 Line は帳簿=実地のため反映不要（reconciled 不問）で完了できる**（明文化）。
//  4. Line 更新・親遷移・Audit・完了 DomainEvent＋OutboxMessage・GrowthEvent を all-or-nothing 化
//     （transactional outbox・emitGrowthEvent は独自 tx のため tx 合成版を本モジュールに実装）。
//  5. 人間主体のみ許可: `sessionIsAi === false`（厳密・欠落/null を fail-open にしない）**かつ**
//     roles 由来 `isHumanUser`（AI 単独・AI+OWNER 混在とも対象取得/書込前に拒否）。
//  6. 冪等キーは本モジュール専用の単射書式（reconcile movement は movement id・完了イベントは
//     stocktake id 成分・CAS により発火はちょうど1回）。schema 変更なし。
import { prisma } from '@/lib/db';
import type { Prisma } from '@hokko/db';
import { requireApprovalForDangerousAction } from '@/lib/approval';
import { applyInventoryMovementTx } from '@/lib/operations';
import {
  isLargeStocktakeDifference,
  stocktakeDifference,
  growthCategoryOf,
  growthTypeOfMovement,
  isHumanUser,
  type RoleKey,
} from '@hokko/shared';

export interface Actor {
  tenantId: string;
  userId?: string | null;
  /** 実行主体のロール（**必須**）。棚卸の記録/反映/確定は人間専用のため `isHumanUser` で fail-closed 判定。 */
  roles: RoleKey[];
  /** 署名 session 由来の AI フラグ（**必須**）。厳密に false のみ人間扱い（欠落/null は fail-closed）。 */
  sessionIsAi: boolean;
}

/** 人間 actor 判定（fail-closed・Codex PR#58 R10 と同型）。 */
function actorIsHuman(actor: Actor): boolean {
  return actor.sessionIsAi === false && Array.isArray(actor.roles) && isHumanUser({ roles: actor.roles });
}

/** 棚卸の非終端 status（count 記録・差異反映を許可する状態）。 */
const OPEN_STATUSES = ['draft', 'counted'] as const;

export type RecordCountResult =
  | { ok: true; stocktakeId: string }
  | { ok: false; reason: 'forbidden' }
  | { ok: false; reason: 'notfound' }
  | { ok: false; reason: 'invalid-state'; stocktakeId?: string };

export type CompleteResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'forbidden' | 'notfound' | 'already' | 'invalid-state' | 'uncounted-lines' | 'unreconciled-lines' | 'pending-approval';
    };

export interface ReconcileResult {
  status: 'reconciled' | 'pending_approval' | 'skip' | 'forbidden';
  stocktakeId?: string;
}

export interface StocktakeTestHooks {
  /** record: Line 更新後・親 CAS 前に throw させ、all-or-nothing を実証する（本番不到達）。 */
  __faultAfterLineForTest?: () => void;
  /** complete: 親 CAS 後・Audit/Event 前に throw させ、全 rollback を実証する（本番不到達）。 */
  __faultAfterCasForTest?: () => void;
  /** record/complete: 親 lock 取得直後の hook（record-vs-complete 真並行の barrier 用・本番不到達）。 */
  __gateAfterParentLockForTest?: () => Promise<void> | void;
}

/** 本モジュール専用の単射冪等キー（成分は encodeURIComponent・区切り注入不可）。 */
function stocktakeEventKey(eventType: string, stocktakeId: string): string {
  return `${eventType}:stocktake:${encodeURIComponent(stocktakeId)}`;
}
function movementEventKey(movementId: string): string {
  return `STOCKTAKE_MOVEMENT:mov:${encodeURIComponent(movementId)}`;
}

/** GrowthEvent（＋DomainEvent/OutboxMessage）を呼び出し側 transaction 内で作成（transactional outbox）。 */
async function createGrowthWithEventTx(
  tx: Prisma.TransactionClient,
  args: {
    tenantId: string;
    actorId?: string | null;
    type: string;
    title: string;
    entityType: string;
    entityId: string;
    metric?: Record<string, unknown>;
    domain?: { eventType: string; aggregateType: string; aggregateId: string; idempotencyKey: string };
  },
): Promise<void> {
  let domainEventId: string | null = null;
  if (args.domain) {
    const payload = { growthType: args.type } as Prisma.InputJsonValue;
    const ev = await tx.domainEvent.create({
      data: {
        tenantId: args.tenantId,
        eventType: args.domain.eventType,
        aggregateType: args.domain.aggregateType,
        aggregateId: args.domain.aggregateId,
        actorId: args.actorId ?? null,
        actorType: 'user',
        payload,
        idempotencyKey: args.domain.idempotencyKey,
        status: 'pending',
      },
      select: { id: true },
    });
    await tx.outboxMessage.create({
      data: { tenantId: args.tenantId, eventId: ev.id, eventType: args.domain.eventType, payload, status: 'pending' },
    });
    domainEventId = ev.id;
  }
  await tx.growthEvent.create({
    data: {
      tenantId: args.tenantId,
      type: args.type,
      category: growthCategoryOf(args.type),
      title: args.title,
      description: '',
      actorId: args.actorId ?? null,
      actorType: 'user',
      entityType: args.entityType,
      entityId: args.entityId,
      metric: (args.metric ?? undefined) as Prisma.InputJsonValue | undefined,
      domainEventId,
    },
  });
}

/** 親 Stocktake を tenant-scoped に FOR UPDATE（record/complete/reconcile 共通の第一 lock・直列化点）。 */
async function lockStocktake(tx: Prisma.TransactionClient, tenantId: string, stocktakeId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Stocktake" WHERE id = ${stocktakeId} AND "tenantId" = ${tenantId} FOR UPDATE`;
  return rows.length === 1;
}

/**
 * 実地カウントを記録（CR #1/#2）。単一 transaction:
 *   親 FOR UPDATE → 親が非終端（draft|counted・completedAt=null）であることを lock 下で確認 →
 *   Line FOR UPDATE・re-read（reconciled=false 確認）→ Line 更新（counted/difference）→
 *   親 CAS（draft|counted→counted・completedAt=null 条件）→ Audit。
 * 完了済み親/Line への replay は書込・Audit ゼロで fail-closed。再カウント（非終端・未反映）は許可。
 */
export async function recordStocktakeCount(
  actor: Actor,
  lineId: string,
  countedQuantity: number,
  opts: StocktakeTestHooks = {},
): Promise<RecordCountResult> {
  if (!actorIsHuman(actor)) return { ok: false, reason: 'forbidden' };
  const counted = Math.max(0, Math.floor(countedQuantity) || 0);
  return prisma.$transaction(async (tx) => {
    // 親 id の発見のみ（判定には使わない — 判定はすべて lock 下の再読取値）。
    const pre = await tx.stocktakeLine.findFirst({
      where: { id: lineId, tenantId: actor.tenantId },
      select: { stocktakeId: true },
    });
    if (!pre) return { ok: false, reason: 'notfound' } as const;
    if (!(await lockStocktake(tx, actor.tenantId, pre.stocktakeId))) return { ok: false, reason: 'notfound' } as const;
    if (opts.__gateAfterParentLockForTest) await opts.__gateAfterParentLockForTest();
    const parent = await tx.stocktake.findFirst({
      where: { id: pre.stocktakeId, tenantId: actor.tenantId },
      select: { status: true, completedAt: true },
    });
    if (!parent) return { ok: false, reason: 'notfound' } as const;
    // 終端（reconciled/approved/completedAt あり）への再記録は fail-closed（親の counted 逆行を排除）。
    if (!OPEN_STATUSES.includes(parent.status as (typeof OPEN_STATUSES)[number]) || parent.completedAt) {
      return { ok: false, reason: 'invalid-state', stocktakeId: pre.stocktakeId } as const;
    }
    await tx.$queryRaw`SELECT id FROM "StocktakeLine" WHERE id = ${lineId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
    const line = await tx.stocktakeLine.findFirst({
      where: { id: lineId, tenantId: actor.tenantId },
      include: { asset: { select: { name: true } } },
    });
    if (!line) return { ok: false, reason: 'notfound' } as const;
    // 反映済み Line の再記録は fail-closed（Asset/Movement と Line の乖離を作らせない）。
    if (line.reconciled) return { ok: false, reason: 'invalid-state', stocktakeId: pre.stocktakeId } as const;

    const diff = stocktakeDifference(line.expectedQuantity, counted);
    await tx.stocktakeLine.update({ where: { id: lineId }, data: { countedQuantity: counted, difference: diff } });
    if (opts.__faultAfterLineForTest) opts.__faultAfterLineForTest();
    // 親遷移も同一 tx・条件付き CAS（親 lock 保持中のため count!==1 は到達不能だが fail-closed に倒す）。
    const cas = await tx.stocktake.updateMany({
      where: { id: pre.stocktakeId, tenantId: actor.tenantId, status: { in: [...OPEN_STATUSES] }, completedAt: null },
      data: { status: 'counted' },
    });
    if (cas.count !== 1) throw new Error('stocktake-count-cas-failed');
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        actorId: actor.userId ?? null,
        actorType: 'user',
        action: 'update',
        entityType: 'StocktakeLine',
        entityId: lineId,
        summary: `実地カウントを記録: ${line.asset.name}（実地${counted}・差異${diff >= 0 ? '+' : ''}${diff}）`,
      },
    });
    return { ok: true, stocktakeId: pre.stocktakeId } as const;
  });
}

/**
 * 棚卸を完了（CR #3/#4）。単一 transaction:
 *   親 FOR UPDATE → lock 下で「status='counted'」「全 Line カウント済み」「非ゼロ差異 Line が全て
 *   reconciled」「対象 Line の stocktake_adjust PENDING 承認 0」を再確認 → CAS（counted→reconciled・
 *   completedAt 設定）→ Audit → 完了 DomainEvent＋Outbox＋Growth（transactional outbox）。
 * 条件を満たさない complete は書込・Event ゼロで fail-closed。
 */
export async function completeStocktake(
  actor: Actor,
  stocktakeId: string,
  opts: StocktakeTestHooks = {},
): Promise<CompleteResult> {
  if (!actorIsHuman(actor)) return { ok: false, reason: 'forbidden' };
  return prisma.$transaction(async (tx) => {
    if (!(await lockStocktake(tx, actor.tenantId, stocktakeId))) return { ok: false, reason: 'notfound' } as const;
    if (opts.__gateAfterParentLockForTest) await opts.__gateAfterParentLockForTest();
    const st = await tx.stocktake.findFirst({
      where: { id: stocktakeId, tenantId: actor.tenantId },
      include: { lines: { orderBy: { id: 'asc' } } },
    });
    if (!st) return { ok: false, reason: 'notfound' } as const;
    if (st.status === 'reconciled' || st.completedAt) return { ok: false, reason: 'already' } as const;
    if (st.status !== 'counted') return { ok: false, reason: 'invalid-state' } as const; // draft = 未カウント
    // tx 内再検証（UI の表示制御に依存しない・direct POST も遮断）:
    if (st.lines.some((l) => l.countedQuantity == null)) return { ok: false, reason: 'uncounted-lines' } as const;
    // 承認待ちを先に判定（承認中の Line は未反映でもあるため、より具体的な理由を返す）。
    const pending = await tx.approvalRequest.count({
      where: {
        tenantId: actor.tenantId,
        requestedForAction: 'stocktake_adjust',
        status: 'PENDING',
        entityType: 'StocktakeLine',
        entityId: { in: st.lines.map((l) => l.id) },
      },
    });
    if (pending > 0) return { ok: false, reason: 'pending-approval' } as const;
    // 非ゼロ差異は反映済み必須（承認経路は executor が reconciled=true を書く）。ゼロ差異は反映不要。
    if (st.lines.some((l) => l.difference !== 0 && !l.reconciled)) return { ok: false, reason: 'unreconciled-lines' } as const;

    const cas = await tx.stocktake.updateMany({
      where: { id: stocktakeId, tenantId: actor.tenantId, status: 'counted', completedAt: null },
      data: { status: 'reconciled', completedAt: new Date() },
    });
    if (cas.count !== 1) throw new Error('stocktake-complete-cas-failed');
    if (opts.__faultAfterCasForTest) opts.__faultAfterCasForTest();
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        actorId: actor.userId ?? null,
        actorType: 'user',
        action: 'update',
        entityType: 'Stocktake',
        entityId: stocktakeId,
        summary: `棚卸を完了: ${st.title}（${st.lines.length}品目）`,
      },
    });
    // 完了 Evidence（Growth/Domain/Outbox）も同一 tx（CAS 勝者1本のため stocktake id キーで単射）。
    await createGrowthWithEventTx(tx, {
      tenantId: actor.tenantId,
      actorId: actor.userId,
      type: 'inventory.stocktake.reconciled',
      title: `棚卸完了: ${st.title}`,
      entityType: 'Stocktake',
      entityId: stocktakeId,
      domain: {
        eventType: 'STOCKTAKE_RECONCILED',
        aggregateType: 'Stocktake',
        aggregateId: stocktakeId,
        idempotencyKey: stocktakeEventKey('STOCKTAKE_RECONCILED', stocktakeId),
      },
    });
    return { ok: true } as const;
  });
}

/**
 * 差異を在庫へ反映。大幅差異(|Δ|≥閾値)は承認申請（直接反映しない・状態も変更しない）。小差異は
 * **単一 transaction**（親 FOR UPDATE → 親非終端確認 → Line FOR UPDATE re-read → adjust Movement＋
 * Audit → Line.reconciled → Movement Growth/Domain/Outbox）で即 adjust（CR #4: 別 commit の
 * 「Movement 済みだが Line 未反映」半確定を排除。adjust は絶対数量のため retry も安全）。
 */
export async function reconcileStocktakeLine(actor: Actor, lineId: string): Promise<ReconcileResult> {
  if (!actorIsHuman(actor)) return { status: 'forbidden' };
  const pre = await prisma.stocktakeLine.findFirst({
    where: { id: lineId, tenantId: actor.tenantId },
    include: { asset: { select: { name: true } } },
  });
  if (!pre || pre.countedQuantity == null || pre.reconciled) return { status: 'skip', stocktakeId: pre?.stocktakeId };

  if (isLargeStocktakeDifference(pre.difference)) {
    // 承認申請のみ（状態は変更しない・実行は承認 executor が担う）。
    await requireApprovalForDangerousAction({
      tenantId: actor.tenantId,
      action: 'stocktake_adjust',
      title: `大幅棚卸差異の反映: ${pre.asset.name}（差異 ${pre.difference >= 0 ? '+' : ''}${pre.difference}）`,
      targetType: 'StocktakeLine',
      targetId: lineId,
      requestedById: actor.userId,
      riskLevel: 'HIGH',
      amount: pre.difference,
      payloadAfter: { assetId: pre.assetId, newQuantity: pre.countedQuantity, lineId },
    });
    return { status: 'pending_approval', stocktakeId: pre.stocktakeId };
  }

  return prisma.$transaction(async (tx) => {
    if (!(await lockStocktake(tx, actor.tenantId, pre.stocktakeId))) return { status: 'skip' as const };
    const parent = await tx.stocktake.findFirst({
      where: { id: pre.stocktakeId, tenantId: actor.tenantId },
      select: { status: true, completedAt: true },
    });
    // 完了済み棚卸への反映は fail-closed（完了後の Asset 変更を作らせない）。
    if (!parent || !OPEN_STATUSES.includes(parent.status as (typeof OPEN_STATUSES)[number]) || parent.completedAt) {
      return { status: 'skip' as const, stocktakeId: pre.stocktakeId };
    }
    await tx.$queryRaw`SELECT id FROM "StocktakeLine" WHERE id = ${lineId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
    const line = await tx.stocktakeLine.findFirst({ where: { id: lineId, tenantId: actor.tenantId } });
    if (!line || line.countedQuantity == null || line.reconciled) return { status: 'skip' as const, stocktakeId: pre.stocktakeId };

    const { movement, updated, asset, beforeStatus } = await applyInventoryMovementTx(tx, {
      tenantId: actor.tenantId,
      actorId: actor.userId,
      assetId: line.assetId,
      type: 'adjust',
      setQuantity: line.countedQuantity,
      note: `棚卸差異反映（${line.difference >= 0 ? '+' : ''}${line.difference}）`,
    });
    await tx.stocktakeLine.update({ where: { id: lineId }, data: { reconciled: true } });
    await createGrowthWithEventTx(tx, {
      tenantId: actor.tenantId,
      actorId: actor.userId,
      type: growthTypeOfMovement('adjust'),
      title: `棚卸差異反映: ${asset.name}`,
      entityType: 'InventoryMovement',
      entityId: movement.id,
      metric: { assetId: asset.id, quantity: line.countedQuantity, beforeStatus, afterStatus: updated.status },
      domain: {
        eventType: beforeStatus !== updated.status ? 'INVENTORY_STATUS_CHANGED' : 'INVENTORY_MOVEMENT_CREATED',
        aggregateType: 'ProductAsset',
        aggregateId: asset.id,
        idempotencyKey: movementEventKey(movement.id),
      },
    });
    return { status: 'reconciled' as const, stocktakeId: pre.stocktakeId };
  });
}
