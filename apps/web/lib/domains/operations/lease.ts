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
//
// R2（CR #4992497297・booking request idempotency）:
//  1. 予約作成・商品追加の双方に canonical `requestId` ＋ payload fingerprint を導入。durable barrier は
//     DomainEvent の `@@unique([tenantId, idempotencyKey])`（tenant-scoped）を使い、キーは
//     `LEASE_BOOKING:create:enc(requestId)` / `LEASE_BOOKING:add-line:enc(requestId)`（request 由来・単射）。
//     この DomainEvent は「実イベント」と「idempotency anchor」を兼ね、metadata に {requestId, fp, 結果}
//     を保持する。same key + same payload は同一結果へ収束（replayed=true・書き込みゼロ）、
//     same key + different payload は**書き込み前に** idempotency-mismatch で拒否。
//     別 requestId なら同一 Asset の意図的な複数 Line は従来どおり許可。
//  2. 予約作成も Reservation・Audit・Growth/Domain/Outbox を**単一 transaction** で確定（分割 commit 廃止）。
//  3. 可用性 telemetry（inventory.availability.checked）は core commit 後の best-effort とし、
//     **catch で非致命化**（telemetry 失敗が commit 済み成功を retryable failure へ変換しない）。
//  requestId は fail-closed（書式不一致は invalid-request-id で書き込みゼロ）。schema 変更なし。
import { createHash } from 'node:crypto';
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
import { emitGrowthEvent } from '@/lib/growth';

export interface LeaseActor {
  tenantId: string;
  userId?: string | null;
}

/** lifecycle 遷移の結果。already = 既に目標状態（冪等 no-op）・invalid-state = 遷移前提を満たさない。 */
export type LeaseLifecycleResult =
  | { ok: true }
  | { ok: false; reason: 'notfound' | 'invalid-state' | 'already' };

export type AddLeaseLineResult =
  | { ok: true; available: number; assetName: string; replayed: boolean }
  | { ok: false; reason: 'notfound' }
  | { ok: false; reason: 'invalid-state' }
  | { ok: false; reason: 'invalid-request-id' }
  | { ok: false; reason: 'idempotency-mismatch' }
  | { ok: false; reason: 'conflict'; available: number; assetName: string };

export type CreateLeaseReservationResult =
  | { ok: true; reservationId: string; replayed: boolean }
  | { ok: false; reason: 'invalid-request-id' | 'idempotency-mismatch' };

export interface LeaseTestHooks {
  /** add-asset: ライン作成後・Movement 前に throw させ、ライン/Movement/Audit の all-or-nothing を実証する。 */
  __faultAfterLineForTest?: () => void;
  /** dispatch/return: i 番目（0-origin）の line の Movement 適用後に throw させ、全明細 rollback を実証する。 */
  __faultAfterLineIndexForTest?: (index: number) => void;
  /** create: Reservation 作成後・Audit/Growth 前に throw させ、予約作成の all-or-nothing を実証する。 */
  __faultAfterReservationForTest?: () => void;
  /** add-asset: core commit 後の telemetry を失敗させ、非致命化（catch）を実証する。 */
  __telemetryFaultForTest?: () => void;
}

/** 本モジュール専用の単射冪等キー（成分は encodeURIComponent・区切り注入不可）。 */
function movementEventKey(movementId: string): string {
  return `LEASE_MOVEMENT:mov:${encodeURIComponent(movementId)}`;
}
function reservationEventKey(eventType: string, reservationId: string): string {
  return `${eventType}:lease:${encodeURIComponent(reservationId)}`;
}
/** booking request 由来の durable idempotency anchor キー（tenant-scoped unique と組で barrier になる）。 */
function leaseBookingKey(kind: 'create' | 'add-line', requestId: string): string {
  return `LEASE_BOOKING:${kind}:${encodeURIComponent(requestId)}`;
}

/** canonical requestId の書式（fail-closed: 不一致は invalid-request-id・書き込みゼロ）。 */
const LEASE_REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,128}$/;

/** キー順序に依存しない決定論的直列化（fingerprint 用・undefined は除外）。 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function payloadFingerprint(payload: Record<string, unknown>): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

/** DomainEvent の (tenantId, idempotencyKey) unique 違反か（他の unique 失敗は収束させない）。 */
function isIdempotencyKeyViolation(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const err = e as { code?: string; meta?: { target?: unknown } };
  if (err.code !== 'P2002') return false;
  const target = err.meta?.target;
  if (Array.isArray(target)) return target.includes('idempotencyKey');
  if (typeof target === 'string') return target.includes('idempotencyKey');
  // target 情報がない場合も P2002 は anchor 再読取で確定判定するため true 扱い（再読取で無ければ rethrow）。
  return true;
}

/** 既存 anchor（DomainEvent）の metadata を読む。無ければ null。 */
async function readBookingAnchor(tenantId: string, key: string): Promise<Record<string, unknown> | null> {
  const ev = await prisma.domainEvent.findUnique({
    where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: key } },
    select: { metadata: true },
  });
  if (!ev) return null;
  return (ev.metadata ?? {}) as Record<string, unknown>;
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
    /** booking anchor 用: {requestId, fp, 収束応答} を DomainEvent.metadata へ保持する。 */
    metadata?: Record<string, unknown>;
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
        metadata: (args.domain.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
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

/** create anchor の収束判定: same fp → 同一結果（replayed）、different fp → 書き込み前 conflict。 */
function convergeCreateAnchor(anchor: Record<string, unknown>, fp: string): CreateLeaseReservationResult {
  if (anchor.fp !== fp || typeof anchor.reservationId !== 'string') {
    return { ok: false, reason: 'idempotency-mismatch' };
  }
  return { ok: true, reservationId: anchor.reservationId, replayed: true };
}

/**
 * リース予約を作成（R2: request idempotency ＋ 単一 transaction）。
 * Reservation・Audit・Growth/Domain/Outbox を1 transaction で確定し、DomainEvent
 * `LEASE_RESERVATION_CREATED` を `LEASE_BOOKING:create:enc(requestId)` キーの durable anchor として作成する。
 * 同一 requestId の replay（応答喪失・再送・並行）は P2002 / fast-path で既存 anchor へ収束し、
 * payload が異なる場合は書き込みゼロで idempotency-mismatch。
 */
export async function createLeaseReservation(
  actor: LeaseActor,
  input: { eventName: string; venue: string | null; startAt: Date; endAt: Date; requestId: string },
  opts: LeaseTestHooks = {},
): Promise<CreateLeaseReservationResult> {
  if (!LEASE_REQUEST_ID_RE.test(input.requestId)) return { ok: false, reason: 'invalid-request-id' };
  const key = leaseBookingKey('create', input.requestId);
  const fp = payloadFingerprint({
    tenantId: actor.tenantId,
    eventName: input.eventName,
    venue: input.venue,
    startAt: input.startAt.toISOString(),
    endAt: input.endAt.toISOString(),
  });
  // fast-path: 既存 anchor（= 同一 requestId の確定済み要求）へ書き込みゼロで収束。
  const seen = await readBookingAnchor(actor.tenantId, key);
  if (seen) return convergeCreateAnchor(seen, fp);

  try {
    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.leaseReservation.create({
        data: {
          tenantId: actor.tenantId,
          eventName: input.eventName,
          venue: input.venue,
          status: 'reserved',
          startAt: input.startAt,
          endAt: input.endAt,
        },
        select: { id: true },
      });
      if (opts.__faultAfterReservationForTest) opts.__faultAfterReservationForTest();
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          actorId: actor.userId ?? null,
          actorType: 'user',
          action: 'create',
          entityType: 'LeaseReservation',
          entityId: reservation.id,
          summary: `リース予約を作成: ${input.eventName}`,
        },
      });
      await createGrowthWithEventTx(tx, {
        tenantId: actor.tenantId,
        actorId: actor.userId,
        type: 'rental.reservation.created',
        title: `リース予約: ${input.eventName}`,
        entityType: 'LeaseReservation',
        entityId: reservation.id,
        domain: {
          eventType: 'LEASE_RESERVATION_CREATED',
          aggregateType: 'LeaseReservation',
          aggregateId: reservation.id,
          idempotencyKey: key,
          metadata: { requestId: input.requestId, fp, reservationId: reservation.id },
        },
      });
      return { ok: true, reservationId: reservation.id, replayed: false } as const;
    });
  } catch (e) {
    // 並行 replay の敗者: anchor unique 違反で tx 全 rollback → 勝者の anchor へ収束（なければ rethrow）。
    if (isIdempotencyKeyViolation(e)) {
      const anchor = await readBookingAnchor(actor.tenantId, key);
      if (anchor) return convergeCreateAnchor(anchor, fp);
    }
    throw e;
  }
}

/** add-line anchor の収束判定。 */
function convergeAddAnchor(anchor: Record<string, unknown>, fp: string): AddLeaseLineResult {
  if (anchor.fp !== fp || typeof anchor.available !== 'number' || typeof anchor.assetName !== 'string') {
    return { ok: false, reason: 'idempotency-mismatch' };
  }
  return { ok: true, available: anchor.available, assetName: anchor.assetName, replayed: true };
}

/**
 * 予約に商品ラインを追加（High-1 / P2-2 / R2 booking idempotency 対応）。
 * 単一 transaction: 予約 status ガード → Asset FOR UPDATE → **lock 後に同 tx で quantity 再読取** →
 * 既存ライン再読取（ロック下）→ 可用性判定 → ライン作成 → reserve Movement＋Audit →
 * Growth/Domain/Outbox（DomainEvent は `LEASE_BOOKING:add-line:enc(requestId)` キーの durable anchor）。
 * 同一 requestId の replay は既存 anchor へ書き込みゼロで収束（Line/Movement は増えない）。
 * 別 requestId なら同一 Asset の意図的な複数ラインは従来どおり許可。
 * 可用性 telemetry は core commit 後の best-effort（catch で非致命化・失敗しても結果は変わらない）。
 */
export async function addAssetToLeaseReservation(
  actor: LeaseActor,
  input: { reservationId: string; assetId: string; quantity: number; requestId: string },
  opts: LeaseTestHooks = {},
): Promise<AddLeaseLineResult> {
  const quantity = Math.max(1, Math.floor(input.quantity) || 1);
  if (!LEASE_REQUEST_ID_RE.test(input.requestId)) return { ok: false, reason: 'invalid-request-id' };
  const key = leaseBookingKey('add-line', input.requestId);
  const fp = payloadFingerprint({
    tenantId: actor.tenantId,
    reservationId: input.reservationId,
    assetId: input.assetId,
    quantity,
  });
  // fast-path: 確定済み同一要求へ書き込みゼロで収束（replay は Line/Movement を増やさない）。
  const seen = await readBookingAnchor(actor.tenantId, key);
  if (seen) return convergeAddAnchor(seen, fp);

  // 事前読取は存在確認と表示名のみに使う（可用性判定には**使わない** — 判定は lock 後の再読取値で行う）。
  const [reservation, assetPre] = await Promise.all([
    prisma.leaseReservation.findFirst({ where: { id: input.reservationId, tenantId: actor.tenantId }, select: { id: true } }),
    prisma.productAsset.findFirst({ where: { id: input.assetId, tenantId: actor.tenantId }, select: { id: true } }),
  ]);
  if (!reservation || !assetPre) return { ok: false, reason: 'notfound' };

  const result = await runAddAssetTx(actor, { reservationId: input.reservationId, assetId: input.assetId, quantity, requestId: input.requestId, key, fp }, opts);

  // telemetry（可用性チェックの観測イベント）: core commit 後の best-effort。
  // 失敗しても commit 済みの結果を retryable failure へ変換しない（CR R2 item 3）。
  if ((result.ok && !result.replayed) || (!result.ok && result.reason === 'conflict')) {
    const checked = result as Extract<AddLeaseLineResult, { available: number }>;
    try {
      if (opts.__telemetryFaultForTest) opts.__telemetryFaultForTest();
      await emitGrowthEvent({
        tenantId: actor.tenantId,
        type: 'inventory.availability.checked',
        title: `在庫可用性チェック: ${checked.assetName}（残${checked.available}）`,
        actorId: actor.userId,
        entityType: 'ProductAsset',
        entityId: input.assetId,
        metric: { available: checked.available, requested: quantity, conflict: !result.ok },
      });
    } catch {
      // 非致命（best-effort telemetry）。core は commit 済みのため結果をそのまま返す。
    }
  }
  return result;
}

async function runAddAssetTx(
  actor: LeaseActor,
  input: { reservationId: string; assetId: string; quantity: number; requestId: string; key: string; fp: string },
  opts: LeaseTestHooks,
): Promise<AddLeaseLineResult> {
  const quantity = input.quantity;
  try {
    return await prisma.$transaction(async (tx) => {
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
      // Growth/Domain/Outbox も同一 tx（transactional outbox）。DomainEvent は requestId 由来キーの
      // durable anchor を兼ねる（R2: movement id 由来キーでは同一要求 replay が収束しないため）。
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
          idempotencyKey: input.key,
          metadata: {
            requestId: input.requestId,
            fp: input.fp,
            reservationId: input.reservationId,
            assetId: input.assetId,
            movementId: movement.id,
            available: avail,
            assetName: fresh.name,
          },
        },
      });
      return { ok: true, available: avail, assetName: fresh.name, replayed: false } as const;
    });
  } catch (e) {
    // 並行 replay の敗者: anchor unique 違反で tx 全 rollback（Line/Movement/Audit も消える）→
    // 勝者の anchor へ書き込みゼロで収束（fp 不一致は idempotency-mismatch・なければ rethrow）。
    if (isIdempotencyKeyViolation(e)) {
      const anchor = await readBookingAnchor(actor.tenantId, input.key);
      if (anchor) return convergeAddAnchor(anchor, input.fp);
    }
    throw e;
  }
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
