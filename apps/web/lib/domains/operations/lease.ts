// リース予約（LeaseReservation）の業務ロジック。P3-INV-2（Codex CR #4970495097 対応）。
// 設計ルール: docs/audit/12_maintenance_architecture.md。Server Action はこのサービスを呼ぶだけ。
//
// CR の要求と対応:
//  High-1: 可用性判定を lock 前 snapshot で行っていた → 対象 ProductAsset を FOR UPDATE でロックした**後**、
//    同一 transaction 内で tenant-scoped に quantity/status を**再読取**して判定する（lock 待機中に別 tx が
//    数量を変更しても、常に最新在庫で予約可否を決める）。
//  P2-2: 予約ラインと InventoryMovement(reserve) / Movement Audit が別 commit だった → 予約ライン・
//    Asset 更新・Movement・Audit・GrowthEvent・DomainEvent＋OutboxMessage を**単一 transaction** で確定
//    （途中失敗は全 rollback = 「ラインだけ残って retry が自己競合する」復旧不能状態が構造的に発生しない）。
//  High-3: dispatch/return に状態 CAS と全明細 transaction がなかった → lifecycle を明示 CAS 化
//    （reserved → confirmed → dispatched → returned）。dispatch/return は
//    「reservation status の CAS claim → 全 Asset を id 昇順（決定論）で FOR UPDATE → 全 line の
//    Movement/Audit → 予約 status/time 確定 → Growth/Domain/Outbox」を**1つの transaction** で行う。
//    replay / 並行実行は CAS count=0 で敗者となり（already）、Movement / usageCount / Audit は増えない。
//    途中失敗（2件目 line の fault 等）は CAS ごと全 rollback され、解除後の retry がちょうど1回成功する。
//
// Growth/DomainEvent の接続: `emitGrowthEvent`（lib/growth.ts → lib/events.ts）は独自 transaction を張る
// ため本 transaction と合成できない。そのため本モジュールは GrowthEvent / DomainEvent / OutboxMessage を
// **同一 transaction 内で直接作成**する（transactional outbox）。冪等キーは本モジュール専用の単射書式
// （movement id / reservation id を成分エンコード）で構築し、schema 変更なし・frozen ファイル非接触。
import { prisma } from '@/lib/db';
import type { Prisma } from '@hokko/db';
import {
  availableQuantity,
  hasReservationConflict,
  growthCategoryOf,
  growthTypeOfMovement,
  type ReservationWindow,
} from '@hokko/shared';
import { applyInventoryMovementTx } from '@/lib/operations';

export interface LeaseActor {
  tenantId: string;
  userId?: string | null;
}

/** lifecycle 遷移の結果。already = 既に目標状態（冪等 no-op）・invalid-state = 遷移前提を満たさない。 */
export type LeaseLifecycleResult =
  | { ok: true }
  | { ok: false; reason: 'notfound' | 'invalid-state' | 'already' };

export type AddLeaseLineResult =
  | { ok: true; available: number; assetName: string }
  | { ok: false; reason: 'notfound' }
  | { ok: false; reason: 'invalid-state' }
  | { ok: false; reason: 'conflict'; available: number; assetName: string };

export interface LeaseTestHooks {
  /** transaction 開始直前の hook（High-1 barrier テスト用: lock 前 snapshot 時点で停止させ、競合更新を差し込む）。 */
  __gateBeforeTxForTest?: () => Promise<void> | void;
  /** add-asset: ライン作成後・Movement 前に throw させ、ライン/Movement/Audit の all-or-nothing を実証する。 */
  __faultAfterLineForTest?: () => void;
  /** dispatch/return: i 番目（0-origin）の line の Movement 適用後に throw させ、全明細 rollback を実証する。 */
  __faultAfterLineIndexForTest?: (index: number) => void;
}

/** 本モジュール専用の単射冪等キー（成分は encodeURIComponent・区切り注入不可）。 */
function movementEventKey(movementId: string): string {
  return `LEASE_MOVEMENT:mov:${encodeURIComponent(movementId)}`;
}
function reservationEventKey(eventType: string, reservationId: string): string {
  return `${eventType}:lease:${encodeURIComponent(reservationId)}`;
}

interface TxGrowthArgs {
  tenantId: string;
  actorId?: string | null;
  type: string; // GrowthEventType
  title: string;
  entityType: string;
  entityId: string;
  metric?: Record<string, unknown>;
  domain?: {
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    idempotencyKey: string;
  };
}

/**
 * GrowthEvent（＋任意で DomainEvent/OutboxMessage）を呼び出し側 transaction 内で作成する
 * （transactional outbox・emitGrowthEvent の tx 合成可能版）。rollback 時は全て消える。
 */
async function createGrowthWithEventTx(tx: Prisma.TransactionClient, args: TxGrowthArgs): Promise<void> {
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

/** 対象 Asset 群を id 昇順（決定論）で FOR UPDATE ロックする（deadlock 回避・tenant-scoped）。 */
async function lockAssetsInOrder(tx: Prisma.TransactionClient, tenantId: string, assetIds: string[]): Promise<void> {
  const unique = Array.from(new Set(assetIds)).sort();
  for (const id of unique) {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "ProductAsset" WHERE id = ${id} AND "tenantId" = ${tenantId} FOR UPDATE`;
    if (locked.length === 0) throw new Error(`asset not found: ${id}`);
  }
}

/**
 * 予約に商品ラインを追加（High-1 / P2-2 対応）。
 * 単一 transaction: 予約 status ガード → Asset FOR UPDATE → **lock 後に同 tx で quantity 再読取** →
 * 既存ライン再読取（ロック下）→ 可用性判定 → ライン作成 → reserve Movement＋Audit →
 * Growth/Domain/Outbox。衝突・途中失敗はラインを一切残さない。
 */
export async function addAssetToLeaseReservation(
  actor: LeaseActor,
  input: { reservationId: string; assetId: string; quantity: number },
  opts: LeaseTestHooks = {},
): Promise<AddLeaseLineResult> {
  const quantity = Math.max(1, Math.floor(input.quantity) || 1);
  // 事前読取は存在確認と表示名のみに使う（可用性判定には**使わない** — 判定は lock 後の再読取値で行う）。
  const [reservation, assetPre] = await Promise.all([
    prisma.leaseReservation.findFirst({ where: { id: input.reservationId, tenantId: actor.tenantId }, select: { id: true } }),
    prisma.productAsset.findFirst({ where: { id: input.assetId, tenantId: actor.tenantId }, select: { id: true } }),
  ]);
  if (!reservation || !assetPre) return { ok: false, reason: 'notfound' };

  if (opts.__gateBeforeTxForTest) await opts.__gateBeforeTxForTest();

  return prisma.$transaction(async (tx) => {
    // 予約行を FOR UPDATE でロックしてから status を読む — dispatch/return の CAS（同じ行をロックする）と
    // 直列化され、「status 確認後に出庫が commit されて Movement なしラインが残る」隙間を塞ぐ。
    await tx.$queryRaw`SELECT id FROM "LeaseReservation" WHERE id = ${input.reservationId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
    const resRow = await tx.leaseReservation.findFirst({
      where: { id: input.reservationId, tenantId: actor.tenantId },
      select: { status: true, startAt: true, endAt: true, eventName: true },
    });
    if (!resRow) return { ok: false, reason: 'notfound' } as const;
    // 出庫済み/返却済みの予約へはライン追加不可（lifecycle CAS と整合・fail-closed）。
    if (resRow.status !== 'reserved' && resRow.status !== 'confirmed') return { ok: false, reason: 'invalid-state' } as const;

    await lockAssetsInOrder(tx, actor.tenantId, [input.assetId]);
    // ★ High-1: lock 取得後に同 tx で quantity/name を**再読取**（lock 前 snapshot を判定に使わない）。
    const fresh = await tx.productAsset.findFirst({
      where: { id: input.assetId, tenantId: actor.tenantId },
      select: { quantity: true, name: true },
    });
    if (!fresh) return { ok: false, reason: 'notfound' } as const;

    const existingLines = await tx.leaseReservationLine.findMany({
      where: { tenantId: actor.tenantId, assetId: input.assetId },
      include: { reservation: true },
    });
    const existing: ReservationWindow[] = existingLines.map((l) => ({
      assetId: input.assetId,
      quantity: l.quantity,
      startAt: l.reservation.startAt,
      endAt: l.reservation.endAt,
    }));
    const window = { startAt: resRow.startAt, endAt: resRow.endAt };
    const conflict = hasReservationConflict({ assetId: input.assetId, quantity, ...window }, existing, fresh.quantity);
    const avail = availableQuantity(input.assetId, fresh.quantity, window, existing);
    if (conflict) return { ok: false, reason: 'conflict', available: avail, assetName: fresh.name } as const;

    await tx.leaseReservationLine.create({
      data: { tenantId: actor.tenantId, reservationId: input.reservationId, assetId: input.assetId, quantity },
    });
    if (opts.__faultAfterLineForTest) opts.__faultAfterLineForTest();

    // P2-2: reserve Movement＋Audit を同一 tx で確定（別 commit の復旧不能な半確定を排除）。
    const { movement, updated, asset, beforeStatus } = await applyInventoryMovementTx(tx, {
      tenantId: actor.tenantId,
      actorId: actor.userId,
      assetId: input.assetId,
      type: 'reserve',
      quantity,
      reservationId: input.reservationId,
      note: `リース予約 ${resRow.eventName} に割当`,
    });
    // Growth/Domain/Outbox も同一 tx（transactional outbox）。
    await createGrowthWithEventTx(tx, {
      tenantId: actor.tenantId,
      actorId: actor.userId,
      type: growthTypeOfMovement('reserve'),
      title: `予約引当: ${asset.name}`,
      entityType: 'InventoryMovement',
      entityId: movement.id,
      metric: { assetId: asset.id, quantity, beforeStatus, afterStatus: updated.status },
      domain: {
        eventType: beforeStatus !== updated.status ? 'INVENTORY_STATUS_CHANGED' : 'INVENTORY_MOVEMENT_CREATED',
        aggregateType: 'ProductAsset',
        aggregateId: asset.id,
        idempotencyKey: movementEventKey(movement.id),
      },
    });
    return { ok: true, available: avail, assetName: fresh.name } as const;
  });
}

/** 予約確定（reserved → confirmed の CAS）。監査・Growth/Domain/Outbox を同一 transaction で確定。 */
export async function confirmLeaseReservation(actor: LeaseActor, reservationId: string): Promise<LeaseLifecycleResult> {
  return transitionLeaseReservation(actor, reservationId, {
    from: 'reserved',
    to: 'confirmed',
    data: {},
    audit: (name) => `リース予約を確定: ${name}`,
    growthType: 'rental.reservation.confirmed',
    growthTitle: (name) => `リース予約確定: ${name}`,
    domainEventType: 'LEASE_RESERVATION_CONFIRMED',
  });
}

/**
 * 出庫（confirmed → dispatched の CAS ＋ 全 line の dispatch Movement を単一 transaction）。
 * replay / 並行は CAS 敗者 = already（Movement/usageCount/Audit 不増）。途中失敗は全 rollback。
 */
export async function dispatchLeaseReservation(
  actor: LeaseActor,
  reservationId: string,
  opts: LeaseTestHooks = {},
): Promise<LeaseLifecycleResult> {
  return transitionLeaseReservation(actor, reservationId, {
    from: 'confirmed',
    to: 'dispatched',
    data: { deliveryAt: new Date() },
    audit: (name) => `リース出庫: ${name}`,
    growthType: 'rental.item.dispatched',
    growthTitle: (name) => `リース出庫: ${name}`,
    domainEventType: 'LEASE_ITEM_DISPATCHED',
    movementType: 'dispatch',
    movementNote: (name) => `出庫: ${name}`,
    opts,
  });
}

/** 返却（dispatched → returned の CAS ＋ 全 line の return Movement を単一 transaction）。 */
export async function returnLeaseReservation(
  actor: LeaseActor,
  reservationId: string,
  opts: LeaseTestHooks = {},
): Promise<LeaseLifecycleResult> {
  return transitionLeaseReservation(actor, reservationId, {
    from: 'dispatched',
    to: 'returned',
    data: { returnAt: new Date() },
    audit: (name) => `リース返却: ${name}`,
    growthType: 'rental.item.returned',
    growthTitle: (name) => `リース返却: ${name}`,
    domainEventType: 'LEASE_ITEM_RETURNED',
    movementType: 'return',
    movementNote: (name) => `返却: ${name}`,
    opts,
  });
}

interface TransitionSpec {
  from: string;
  to: string;
  data: Record<string, unknown>;
  audit: (eventName: string) => string;
  growthType: string;
  growthTitle: (eventName: string) => string;
  domainEventType: string;
  /** 指定時: 全 line へ本 type の Movement を同一 tx で適用（dispatch/return）。 */
  movementType?: 'dispatch' | 'return';
  movementNote?: (eventName: string) => string;
  opts?: LeaseTestHooks;
}

/**
 * lifecycle 遷移の共通実装: **単一 transaction** で
 *   status CAS（from → to・tenant-scoped・updateMany count===1）→ [movementType 指定時]
 *   全 line の Asset を id 昇順 FOR UPDATE → 各 line の Movement＋Audit → 予約レベル Audit →
 *   Growth/Domain/Outbox を確定する。
 * CAS 敗者（並行 / replay / 順序違反）は書き込みゼロで already / invalid-state を返す。
 */
async function transitionLeaseReservation(
  actor: LeaseActor,
  reservationId: string,
  spec: TransitionSpec,
): Promise<LeaseLifecycleResult> {
  return prisma.$transaction(async (tx) => {
    // 明示 CAS を**最初**に行う: from 状態からのみ to へ遷移（勝者1本）。updateMany が予約行をロックし、
    // 並行 dispatch/return も addAsset（予約行 FOR UPDATE）も直列化される。CAS 後に読む lines は
    // 以後追加され得ない（addAsset は非 reserved/confirmed を拒否）ため、全明細を漏れなく処理できる。
    const claim = await tx.leaseReservation.updateMany({
      where: { id: reservationId, tenantId: actor.tenantId, status: spec.from },
      data: { status: spec.to, ...spec.data },
    });
    if (claim.count !== 1) {
      // 敗者/順序違反: 書き込みゼロで返す（現在状態で already と invalid-state を区別）。
      const current = await tx.leaseReservation.findFirst({
        where: { id: reservationId, tenantId: actor.tenantId },
        select: { status: true },
      });
      if (!current) return { ok: false, reason: 'notfound' } as const;
      return { ok: false, reason: current.status === spec.to ? 'already' : 'invalid-state' } as const;
    }
    const reservation = await tx.leaseReservation.findFirst({
      where: { id: reservationId, tenantId: actor.tenantId },
      include: { lines: { orderBy: { id: 'asc' } } },
    });
    if (!reservation) return { ok: false, reason: 'notfound' } as const;

    if (spec.movementType) {
      // 全対象 Asset を id 昇順（決定論）でロックしてから、line 順に Movement＋Audit を適用。
      await lockAssetsInOrder(tx, actor.tenantId, reservation.lines.map((l) => l.assetId));
      for (const [i, l] of reservation.lines.entries()) {
        const { movement, updated, asset, beforeStatus } = await applyInventoryMovementTx(tx, {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          assetId: l.assetId,
          type: spec.movementType,
          quantity: l.quantity,
          reservationId,
          note: spec.movementNote!(reservation.eventName),
        });
        await createGrowthWithEventTx(tx, {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          type: growthTypeOfMovement(spec.movementType),
          title: `${spec.growthTitle(reservation.eventName)}: ${asset.name}`,
          entityType: 'InventoryMovement',
          entityId: movement.id,
          metric: { assetId: asset.id, quantity: l.quantity, beforeStatus, afterStatus: updated.status },
          domain: {
            eventType: beforeStatus !== updated.status ? 'INVENTORY_STATUS_CHANGED' : 'INVENTORY_MOVEMENT_CREATED',
            aggregateType: 'ProductAsset',
            aggregateId: asset.id,
            idempotencyKey: movementEventKey(movement.id),
          },
        });
        if (spec.opts?.__faultAfterLineIndexForTest) spec.opts.__faultAfterLineIndexForTest(i);
      }
    }

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        actorId: actor.userId ?? null,
        actorType: 'user',
        action: 'update',
        entityType: 'LeaseReservation',
        entityId: reservationId,
        summary: spec.audit(reservation.eventName),
      },
    });
    // 予約レベルの Growth/Domain/Outbox（CAS 勝者は1本のため reservation id キーで単射）。
    await createGrowthWithEventTx(tx, {
      tenantId: actor.tenantId,
      actorId: actor.userId,
      type: spec.growthType,
      title: spec.growthTitle(reservation.eventName),
      entityType: 'LeaseReservation',
      entityId: reservationId,
      domain: {
        eventType: spec.domainEventType,
        aggregateType: 'LeaseReservation',
        aggregateId: reservationId,
        idempotencyKey: reservationEventKey(spec.domainEventType, reservationId),
      },
    });
    return { ok: true } as const;
  });
}
