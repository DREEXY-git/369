// 発注（PurchaseOrder）の業務ロジック。Phase 1-9 保守リファクタ（action から切り出し）。
// 設計ルール: docs/audit/12_maintenance_architecture.md。Server Action はこのサービスを呼ぶだけ。
import { prisma, writeAudit } from '@/lib/db';
import { emitGrowthEvent } from '@/lib/growth';
import { createApprovalRequestTx } from '@/lib/approval';
import { applyInventoryMovement } from '@/lib/operations';
import { toNumber } from '@/lib/utils';
import { requiresApproval, growthCategoryOf, makeIdempotencyKey, isHumanUser, type DomainEventType, type RoleKey } from '@hokko/shared';

/** high-value 発注確定の tx 内で PO の draft→pending_approval claim に敗れた敗者シグナル。
 *  throw で承認申請＋監査ごと rollback し、孤児 PENDING/Audit を残さない。 */
class PoClaimLost extends Error {
  constructor() {
    super('po-claim-lost');
    this.name = 'PoClaimLost';
  }
}

/** 承認実行時の PO status/approvalId CAS 敗北（received/cancelled/別 approval/既 ordered）。差し戻さず fail-closed。 */
class PoNotClaimable extends Error {
  constructor() {
    super('po-not-claimable');
    this.name = 'PoNotClaimable';
  }
}

/** 承認実行時の ApprovalRequest claim 敗北（未 APPROVED/失効/既実行/tenant・action・対象不一致）。
 *  reason を保持して fail-closed（Codex PR#58 R5: claim〜終端を業務 tx と同一 tx に収める）。 */
class ApprovalNotClaimable extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'ApprovalNotClaimable';
  }
}

export interface Actor {
  tenantId: string;
  userId?: string | null;
  /** 実行主体のロール（**必須**）。発注確定/入庫/承認実行は人間専用のため、`isHumanUser`（正本
   *  packages/shared/src/rbac.ts）で role 由来 fail-closed 判定する。省略・空配列・AI_AGENT/AI_ASSISTANT
   *  を1つでも含む混在はすべて拒否（Codex PR#58 R8: 任意の自己申告 boolean で human を表現しない）。 */
  roles: RoleKey[];
  /** 署名 session 由来の AI フラグ（`User.isAiAgent` → session `isAi`・**必須**）。DB 上 roles と
   *  isAiAgent に整合制約はなく独立のため、**boolean 単独にも roles 単独にも依存せず両方を必要条件**
   *  にする（Codex PR#58 R9: `isAiAgent=true + OWNER` も `isAiAgent=false + AI role` も fail-closed）。 */
  sessionIsAi: boolean;
}

/** 人間 actor 判定（fail-closed）。sessionIsAi=true・roles 非配列/空/AI混在はすべて false。 */
function actorIsHuman(actor: Actor): boolean {
  return actor.sessionIsAi !== true && Array.isArray(actor.roles) && isHumanUser({ roles: actor.roles });
}

export interface ConfirmPurchaseOrderResult {
  found: boolean;
  requiresApproval: boolean;
  /** AI 主体（実確定不可）で DB 接触前に拒否した場合 true。 */
  forbidden?: boolean;
}

/** 発注確定。高額（閾値以上）は承認申請（pending_approval）。少額は即 ordered。 */
export async function confirmPurchaseOrder(actor: Actor, poId: string): Promise<ConfirmPurchaseOrderResult> {
  // 発注確定は人間専用（AI/mixed-role/roles欠落 は action 境界に加え domain でも role 由来で
  // DB 接触前に拒否・Codex PR#58 R3 P2-1 / R8）。
  if (!actorIsHuman(actor)) return { found: false, requiresApproval: false, forbidden: true };
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, tenantId: actor.tenantId } });
  if (!po) return { found: false, requiresApproval: false };
  // 発注確定は draft からのみ許可する（STATE2 C2）。ordered/received/cancelled/pending_approval を
  // draft 前提の無条件 update で上書きすると、received 済み PO を ordered へ差し戻し、
  // receivePurchaseOrder の status CAS（ordered→received）を再成立させて在庫を二重計上できてしまう。
  // 確定ボタンは UI 上 draft のみ表示されるが、Server Action は直接 POST で到達可能なため server 側で弾く。
  if (po.status !== 'draft') return { found: true, requiresApproval: po.status === 'pending_approval' };
  const amount = toNumber(po.totalAmount);

  // 高額（閾値以上）は承認必須。承認申請＋監査の作成と PO の draft→pending_approval claim を
  // **単一 transaction** で原子化する（Codex PR#58 R2 #1）。従来は承認申請を PO CAS より先に prisma
  // 直で作っていたため、並行 confirm の CAS 敗者側で孤児 PENDING/Audit が残り、後段の承認実行から
  // received を ordered へ差し戻して二重入庫できた。tx 化により敗者は throw で承認ごと rollback され孤児 0。
  if (requiresApproval('purchase_order_issue', { amount })) {
    try {
      await prisma.$transaction(async (tx) => {
        const req = await createApprovalRequestTx(tx, {
          tenantId: actor.tenantId,
          action: 'purchase_order_issue',
          title: `発注確定: ${po.orderNo}（${amount}円）`,
          targetType: 'PurchaseOrder',
          targetId: poId,
          requestedById: actor.userId,
          riskLevel: 'MEDIUM',
          payloadAfter: { purchaseOrderId: poId },
        });
        // draft からのみ claim。並行敗者/非 draft は count!==1 → throw で承認申請＋監査を rollback。
        const claim = await tx.purchaseOrder.updateMany({
          where: { id: poId, tenantId: actor.tenantId, status: 'draft' },
          data: { status: 'pending_approval', approvalId: req.id },
        });
        if (claim.count !== 1) throw new PoClaimLost();
      });
    } catch (e) {
      if (e instanceof PoClaimLost) return { found: true, requiresApproval: true }; // 既に他者が pending_approval 化・孤児なし
      throw e;
    }
    return { found: true, requiresApproval: true };
  }
  // draft → ordered を条件付き単一更新で claim（received 等からの差し戻し不可・並行は1本に収束）。
  const orderedClaim = await prisma.purchaseOrder.updateMany({
    where: { id: poId, tenantId: actor.tenantId, status: 'draft' },
    data: { status: 'ordered' },
  });
  if (orderedClaim.count !== 1) return { found: true, requiresApproval: false };
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'inventory.purchase_order.created',
    title: `発注確定: ${po.orderNo}`,
    actorId: actor.userId,
    entityType: 'PurchaseOrder',
    entityId: poId,
    amount,
    alsoDomainEvent: { domainType: 'PURCHASE_ORDER_APPROVED' as DomainEventType, aggregateType: 'PurchaseOrder', aggregateId: poId },
  });
  return { found: true, requiresApproval: false };
}

export interface ExecuteApprovedPoResult {
  executed: boolean;
  reason?: string;
  /** legacy 半確定（旧 3-commit 経路の残骸）を完全 lineage 照合の上で executed へ収束した場合 true（Codex R6 #1）。 */
  reconciled?: boolean;
}

export interface ExecuteApprovedPoOptions {
  /** test-only: Approval claim 直後・PO CAS 前に例外を注入し、claim ごと全 rollback を検証（Codex PR#58 R5 #3）。 */
  __faultAfterApprovalClaimForTest?: () => void;
  /** test-only: Approval claim 直後・PO CAS 前に自 backend PID を渡して await する非同期 gate。
   *  「winner が claim 済み・row lock 保持中」を ready signal で固定し、loser の実 lock 競合を
   *  pg_blocking_pids で観測する 2 並列 evidence 用（Codex PR#58 R6 #2・本番不到達）。 */
  __gateAfterApprovalClaimForTest?: (backendPid: number) => Promise<void>;
  /** test-only: PO CAS 後・Audit 前に例外を注入し、tx 全 rollback（半確定なし）を検証（Codex PR#58 R4 #3）。 */
  __faultAfterCasForTest?: () => void;
  /** test-only: DomainEvent/Outbox 作成後・GrowthEvent 作成時に例外を注入し、全 rollback を検証（Codex PR#58 R4 #3）。 */
  __faultAfterEventsForTest?: () => void;
  /** test-only: 全 Evidence 作成後・Approval 終端化（executed）前に例外を注入し、全 rollback を検証（Codex PR#58 R5 #3）。 */
  __faultBeforeApprovalTerminalForTest?: () => void;
}

/** 承認済み高額発注を確定（pending_approval→ordered）。二重実行防止つき。
 *  堅牢化（Codex PR#58 R2 #2 / R4 / **R5**）:
 *   - `status='pending_approval' AND approvalId=この承認` の CAS でのみ ordered 化。received/cancelled/ordered
 *     や別 approval の PO は count!==1 で弾き、received→ordered の差し戻し（＝二重入庫の再開）を構造的に不可能にする。
 *   - **R5 all-or-nothing（claim〜終端まで同一 tx）**: ApprovalRequest の claim（APPROVED・未失効・未実行・同 tenant・
 *     requestedForAction=purchase_order_issue・対象 entity 一致 を条件に executedAt を CAS で claim）から、
 *     PO CAS・必須 Audit・DomainEvent(+Outbox)・GrowthEvent、そして Approval の `executed` 終端化までを
 *     **単一 $transaction** で確定する。途中 fault（PO CAS 後・Evidence 作成後・終端前 いずれも）は
 *     ApprovalRequest の claim を含め **全 rollback** され、「PO=ordered・Evidence 済みなのに Approval だけ
 *     executing/failed で終端に収束しない」半確定を残さない（Codex R5）。executor commit と Approval 終端更新を
 *     別 commit にしていた旧実装（executeApprovedAction 経由）の分離を解消する。
 *   - claim の CAS（executedAt=null 限定）が行ロック＋exactly-once ゲートを兼ね、逐次 retry・並行 2 本でも
 *     PO/Audit/Domain/Outbox/Growth 各 1・Approval は exactly-once で executed に収束する。
 *  DomainEvent は (tenant, PURCHASE_ORDER_APPROVED, poId, dedupe=approvalId) の固定 idempotency key で作られ、
 *  Outbox 経由 worker 配送が失敗しても既存 outbox 機構で再開可能（Evidence lineage を保つ）。 */
export async function executeApprovedPurchaseOrderIssue(
  actor: Actor,
  approvalId: string,
  poId: string,
  opts: ExecuteApprovedPoOptions = {},
): Promise<ExecuteApprovedPoResult> {
  // 承認済み発注の実行も人間専用（AI/mixed-role/roles欠落 は role 由来で DB 接触前に拒否・R3 P2-1 / R8）。
  if (!actorIsHuman(actor)) return { executed: false, reason: 'forbidden' };
  try {
    return await prisma.$transaction(async (tx) => {
      // legacy 半確定（main の旧 3-commit 経路が残した「PO/Evidence 完了・Approval 未終端」）の完全 lineage 照合
      // （Codex R6 #1）。tenant/approvalId を含む PO 到達（ordered、または実行後に正規 receive 済みの received）と、
      // 旧経路が作った必須 Evidence（Audit / DomainEvent / Outbox / Growth）の**全在**を確認する。
      const legacyPoReached = async (): Promise<boolean> => {
        const po = await tx.purchaseOrder.findFirst({
          where: { id: poId, tenantId: actor.tenantId, approvalId, status: { in: ['ordered', 'received'] } },
          select: { id: true },
        });
        return !!po;
      };
      const legacyEvidenceComplete = async (): Promise<boolean> => {
        if (!(await legacyPoReached())) return false;
        // Audit はこの approval に**結合**したものだけを数える（Codex R7）。旧 main / 新経路とも承認実行
        // Audit の summary は `（approval=<approvalId>）` を含む。別 approval・発注作成 Audit の寄せ集めを
        // 完全 lineage と誤認しない。
        const audit = await tx.auditLog.count({
          where: { tenantId: actor.tenantId, entityType: 'PurchaseOrder', entityId: poId, action: 'purchase_order_issue', summary: { contains: `approval=${approvalId}` } },
        });
        if (audit < 1) return false;
        // DomainEvent も **current approval へ結合**したものだけを Evidence にする（Codex R9 #2）。
        // 新経路の event は canonical key（dedupe=approvalId）で approval 帰属を無損失に証明できる。
        const canonicalEvKey = makeIdempotencyKey({ tenantId: actor.tenantId, eventType: 'PURCHASE_ORDER_APPROVED', aggregateId: poId, dedupe: approvalId });
        let evs = await tx.domainEvent.findMany({
          where: { tenantId: actor.tenantId, aggregateId: poId, eventType: 'PURCHASE_ORDER_APPROVED', idempotencyKey: canonicalEvKey },
          select: { id: true },
        });
        if (evs.length < 1) {
          // legacy event（旧 emitGrowthEvent は payload={growthType}・dedupe 省略で approval identity を
          // 保存しない）。この PO の issue-approval が**過去含め唯一**のときだけ帰属を一意に確定できる。
          // 複数 approval が存在する場合（別 approval の event/outbox/growth の寄せ集めの可能性）は
          // 自動収束せず HOLD（Human Gate: CLAUDE_HUMAN_GATE_V90_SCHEMA_OR_DATA_PR58）。
          const approvalCount = await tx.approvalRequest.count({
            where: { tenantId: actor.tenantId, requestedForAction: 'purchase_order_issue', entityType: 'PurchaseOrder', entityId: poId },
          });
          if (approvalCount !== 1) return false;
          evs = await tx.domainEvent.findMany({ where: { tenantId: actor.tenantId, aggregateId: poId, eventType: 'PURCHASE_ORDER_APPROVED' }, select: { id: true } });
          if (evs.length < 1) return false;
        }
        const outbox = await tx.outboxMessage.count({ where: { tenantId: actor.tenantId, eventId: { in: evs.map((e) => e.id) } } });
        if (outbox < 1) return false;
        // Growth は **PURCHASE_ORDER_APPROVED event へ domainEventId で結合**したものだけを数える（Codex R7）。
        // 発注作成時 Growth は同じ type だが PURCHASE_ORDER_CREATED event に結合しており、承認実行用 Growth の
        // 欠落（旧 3-commit 経路の Growth create 前 fault）をここで正しく検出する（誤 terminalize しない）。
        const growth = await tx.growthEvent.count({
          where: { tenantId: actor.tenantId, entityType: 'PurchaseOrder', entityId: poId, type: 'inventory.purchase_order.created', domainEventId: { in: evs.map((e) => e.id) } },
        });
        return growth >= 1;
      };

      // 1) ApprovalRequest を DB barrier 内で claim（Codex R5 #1/#2）。
      //    APPROVED・未失効・未実行(executedAt=null)・同 tenant・requestedForAction=purchase_order_issue・
      //    対象 entity 一致 を条件に executedAt を CAS で claim。updateMany の行ロックが並行 2 本を直列化し
      //    （敗者は先行 commit 後に executedAt!=null を見て count=0）、exactly-once を保証する。
      const now = new Date();
      const approvalClaim = await tx.approvalRequest.updateMany({
        where: {
          id: approvalId,
          tenantId: actor.tenantId,
          status: 'APPROVED',
          requestedForAction: 'purchase_order_issue',
          entityType: 'PurchaseOrder',
          entityId: poId,
          executedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        data: { executedAt: now, executedById: actor.userId ?? null, executionStatus: 'executing' },
      });
      if (approvalClaim.count !== 1) {
        // claim 敗北の理由判定。tenant/action/entity 完全一致の行だけを対象に読む。
        const cur = await tx.approvalRequest.findFirst({
          where: { id: approvalId, tenantId: actor.tenantId, requestedForAction: 'purchase_order_issue', entityType: 'PurchaseOrder', entityId: poId },
          select: { status: true, executedAt: true, executionStatus: true },
        });
        if (!cur || cur.status !== 'APPROVED' || !cur.executedAt) {
          throw new ApprovalNotClaimable(cur?.executedAt ? 'already-executed' : 'approval-invalid-or-expired');
        }
        if (cur.executionStatus === 'executed') throw new ApprovalNotClaimable('already-executed');
        // **legacy state2（Codex R6 #1）**: executedAt!=null なのに executed へ終端していない
        //（旧 3-commit 経路で executor commit 後に process crash → Approval=executing のまま）。
        // 完全 lineage（PO 到達＋全 Evidence）が確証できたときだけ、Approval を executed へ終端 CAS で収束
        //（exactly-once）。部分 Evidence は誤 terminalize せず明示 HOLD（fail-closed）。
        if (!(await legacyEvidenceComplete())) throw new ApprovalNotClaimable('legacy-partial-evidence-hold');
        const term = await tx.approvalRequest.updateMany({
          where: { id: approvalId, tenantId: actor.tenantId, status: 'APPROVED', requestedForAction: 'purchase_order_issue', entityType: 'PurchaseOrder', entityId: poId, executionStatus: { not: 'executed' } },
          data: { executionStatus: 'executed' },
        });
        if (term.count !== 1) throw new ApprovalNotClaimable('already-executed');
        return { executed: true, reconciled: true };
      }

      // test-only: Approval claim 直後・PO CAS 前 fault（本番不到達）→ claim ごと全 rollback を検証（R5 #3）。
      if (opts.__faultAfterApprovalClaimForTest) opts.__faultAfterApprovalClaimForTest();
      // test-only: claim 保持のまま停止する非同期 gate（2 並列の実 lock 競合 evidence 用・R6 #2・本番不到達）。
      if (opts.__gateAfterApprovalClaimForTest) {
        const pidRows = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
        await opts.__gateAfterApprovalClaimForTest(pidRows[0]!.pid);
      }

      // 2) PO CAS: pending_approval AND approvalId=この承認 → ordered（received/cancelled/別 approval は count=0）。
      const claim = await tx.purchaseOrder.updateMany({
        where: { id: poId, tenantId: actor.tenantId, status: 'pending_approval', approvalId },
        data: { status: 'ordered' },
      });
      if (claim.count !== 1) {
        // **legacy state1（Codex R6 #1）**: Approval は failed/executedAt=null（claim は成功する）が、
        // PO は旧 3-commit 経路で既に ordered＋Evidence 作成済み → 新 CAS は count=0。
        // この approval で PO へ到達済みかを照合し、無関係（stale/別 approval/received 差し戻し攻撃）は
        // 従来どおり po-not-claimable。到達済みで Evidence が完全なときだけ Approval を executed へ終端し
        // 収束（claim は本 tx で保持済み＝exactly-once）。部分 Evidence は明示 HOLD（throw で claim ごと rollback）。
        if (!(await legacyPoReached())) throw new PoNotClaimable();
        if (!(await legacyEvidenceComplete())) throw new ApprovalNotClaimable('legacy-partial-evidence-hold');
        await tx.approvalRequest.update({ where: { id: approvalId }, data: { executionStatus: 'executed' } });
        return { executed: true, reconciled: true };
      }

      // test-only: PO CAS 後・Audit 前 fault（本番不到達）。
      if (opts.__faultAfterCasForTest) opts.__faultAfterCasForTest();

      const po = await tx.purchaseOrder.findFirst({ where: { id: poId, tenantId: actor.tenantId }, select: { orderNo: true, totalAmount: true } });
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          actorId: actor.userId ?? null,
          actorType: 'user',
          action: 'purchase_order_issue',
          entityType: 'PurchaseOrder',
          entityId: poId,
          summary: `高額発注を承認確定: ${po?.orderNo ?? poId}（approval=${approvalId}）`,
        },
      });

      // transactional outbox: DomainEvent(+Outbox)+GrowthEvent を tx 内で原子的に作成。
      // 固定 idempotency key（dedupe=approvalId）で 1 実行=1 lineage。post-commit 消失（fault window）を排除。
      const growthType = 'inventory.purchase_order.created';
      const key = makeIdempotencyKey({ tenantId: actor.tenantId, eventType: 'PURCHASE_ORDER_APPROVED', aggregateId: poId, dedupe: approvalId });
      const ev = await tx.domainEvent.create({
        data: { tenantId: actor.tenantId, eventType: 'PURCHASE_ORDER_APPROVED', aggregateType: 'PurchaseOrder', aggregateId: poId, actorId: actor.userId ?? null, actorType: 'user', payload: { growthType } as any, idempotencyKey: key, status: 'pending' },
      });
      await tx.outboxMessage.create({ data: { tenantId: actor.tenantId, eventId: ev.id, eventType: 'PURCHASE_ORDER_APPROVED', payload: { growthType } as any, status: 'pending' } });

      // test-only: DomainEvent/Outbox 作成後・GrowthEvent 作成時 fault（本番不到達）。
      if (opts.__faultAfterEventsForTest) opts.__faultAfterEventsForTest();

      await tx.growthEvent.create({
        data: { tenantId: actor.tenantId, type: growthType, category: growthCategoryOf(growthType), title: `発注確定: ${po?.orderNo ?? poId}`, description: '', actorId: actor.userId ?? null, actorType: 'user', entityType: 'PurchaseOrder', entityId: poId, amount: Number(po?.totalAmount ?? 0), revenueImpact: null, domainEventId: ev.id },
      });

      // test-only: 全 Evidence 作成後・Approval 終端化前 fault（本番不到達）→ Approval claim を含め全 rollback を検証（R5 #3）。
      if (opts.__faultBeforeApprovalTerminalForTest) opts.__faultBeforeApprovalTerminalForTest();

      // 3) Approval を executed へ終端化（同一 tx）。claim〜終端が原子確定し、半確定を残さない（Codex R5）。
      await tx.approvalRequest.update({ where: { id: approvalId }, data: { executionStatus: 'executed' } });

      return { executed: true };
    });
  } catch (e) {
    if (e instanceof ApprovalNotClaimable) return { executed: false, reason: e.reason };
    if (e instanceof PoNotClaimable) return { executed: false, reason: 'po-not-claimable' };
    throw e;
  }
}

/** 入庫処理。各ラインの数量を ProductAsset へ入庫（InventoryMovement type=receive）。
 *  二重入庫（在庫水増し）の根絶: status を `ordered → received` へ**条件付き単一更新でclaim**してから
 *  入庫処理を行う。二重クリック / リトライ / 並行呼び出しは claim.count=0 となり入庫をスキップ（冪等）。
 *  claim を勝ち取った1回だけが InventoryMovement を発行するため、同一 PO の再入庫で在庫が水増しされない。
 *  （applyInventoryMovement 自体は PR#47 で行ロック＋単一transaction 済み＝各入庫は原子的。） */
export async function receivePurchaseOrder(actor: Actor, poId: string): Promise<boolean> {
  // 入庫も人間専用（AI/mixed-role は DB 接触前に拒否・Codex PR#58 R3 P2-1）。
  if (!actorIsHuman(actor)) return false;
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, tenantId: actor.tenantId }, include: { lines: true } });
  if (!po) return false;

  // ordered のときのみ received へ遷移させる atomic claim。ここで勝者を1本に絞り、二重入庫を構造的に排除する。
  const claim = await prisma.purchaseOrder.updateMany({
    where: { id: poId, tenantId: actor.tenantId, status: 'ordered' },
    data: { status: 'received', receivedAt: new Date() },
  });
  if (claim.count !== 1) return false; // 既に received / cancelled / 未確定（draft・承認待ち）→ no-op（二重入庫なし）。

  for (const l of po.lines) {
    if (l.assetId) {
      await applyInventoryMovement({
        tenantId: actor.tenantId,
        actorId: actor.userId,
        assetId: l.assetId,
        type: 'receive',
        quantity: l.quantity,
        note: `発注入庫: ${po.orderNo}`,
      });
    }
    await prisma.purchaseOrderLine.update({ where: { id: l.id }, data: { receivedQuantity: l.quantity } });
  }
  // status/receivedAt は上の claim で確定済み（重複更新しない）。
  await emitGrowthEvent({
    tenantId: actor.tenantId,
    type: 'inventory.purchase_order.received',
    title: `入庫完了: ${po.orderNo}`,
    actorId: actor.userId,
    entityType: 'PurchaseOrder',
    entityId: poId,
    alsoDomainEvent: { domainType: 'PURCHASE_ORDER_RECEIVED' as DomainEventType, aggregateType: 'PurchaseOrder', aggregateId: poId },
  });
  return true;
}
