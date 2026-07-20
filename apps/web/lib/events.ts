// イベント連動基盤（EventLog/Outbox/Webhook）。Phase 1-2。
// emitDomainEvent: DomainEvent（イベントログ）＋OutboxMessage をトランザクションで保存（冪等）。
// dispatch: 登録ハンドラ実行 ＋ Webhook 配送。失敗は記録し再試行可能にする。
import { prisma } from './db';
import type { Prisma } from '@hokko/db';
import {
  makeIdempotencyKey,
  makeCanonicalIdempotencyKey,
  makeEventIdentityLockMaterial,
  makeIdemMetadata,
  legacyRowMatchesIdentity,
  EventIdentityCollisionError,
  nextRetryDelayMs,
  MAX_EVENT_RETRIES,
  type DomainEventType,
} from '@hokko/shared';
import { signWebhookPayload } from '@hokko/shared/webhook';

export interface EmitEventInput {
  tenantId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  actorId?: string | null;
  actorType?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  dedupe?: string;
}

export interface EmitResult {
  eventId: string;
  idempotencyKey: string;
  duplicated: boolean;
}

/** Prisma interactive transaction のクライアント型（emitDomainEventInTx 用）。通常 client も適合する。 */
type TxClient = Prisma.TransactionClient;

type IdentityLookup =
  | { kind: 'hit'; id: string }
  | { kind: 'miss' }
  /** legacy キーが**別 identity** の行に占有されている（真の FNV 衝突）。既存として返さない。 */
  | { kind: 'collision' };

/**
 * 同一論理 identity の既存 DomainEvent を照合する（修正版 Phase A dual-read・PA-BLK-4）。
 * bf0692b の findExistingByEitherKey（legacy 優先・無検証）の置換。
 *  1) **canonical-first**: canonical キー（PR #57 書式）は identity→key 単射のため、
 *     tenantId_idempotencyKey の exact 一致 = identity 完全一致（無検証で安全）。
 *  2) legacy fallback: スカラ列 (tenantId, idempotencyKey, eventType, aggregateType, aggregateId)
 *     の findFirst ＋ payload.idem.dedupe の JS 完全一致検証（legacyRowMatchesIdentity・ID-2）。
 *     ハッシュ一致のみでの誤収束を禁止する。
 *  3) legacy キーが別 identity の行に占有されている場合は collision（fail-closed 判定は呼出し側）。
 */
async function findExistingByIdentity(
  db: Pick<TxClient, 'domainEvent'>,
  input: EmitEventInput,
  legacyKey: string,
  canonicalKey: string,
): Promise<IdentityLookup> {
  const identity = {
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    dedupe: input.dedupe ?? '',
  };
  const byCanonical = await db.domainEvent.findUnique({
    where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: canonicalKey } },
    select: { id: true },
  });
  if (byCanonical) return { kind: 'hit', id: byCanonical.id };
  const byLegacy = await db.domainEvent.findFirst({
    where: {
      tenantId: input.tenantId,
      idempotencyKey: legacyKey,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
    },
    select: { id: true, eventType: true, aggregateType: true, aggregateId: true, payload: true },
  });
  if (byLegacy && legacyRowMatchesIdentity(byLegacy, identity)) return { kind: 'hit', id: byLegacy.id };
  // 識別列一致行が無い/検証不成立でも、legacy キー自体が占有されていれば真の衝突（別 identity）。
  const occupant = await db.domainEvent.findUnique({
    where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: legacyKey } },
    select: { id: true },
  });
  if (occupant) return { kind: 'collision' };
  return { kind: 'miss' };
}

/**
 * **advisory barrier 付き emit（tx 内・修正版 Phase A / PA-BLK-3）**。
 * 呼出し規約（ロックグラフ非循環の repo 規約）:
 *  - 業務 tx（payments.ts 等）は「行ロック（Invoice FOR UPDATE）→ advisory event lock → insert」の順。
 *    advisory event lock 取得後に行ロックを取る経路は禁止。
 *  - 複数イベントを同一 tx で emit する場合は固定順（PAYMENT_RECEIVED → RECEIVABLE_COLLECTED）。
 * 手順:
 *  (1) SET LOCAL lock_timeout（tx timeout より短い・timeout はエラー＝create しない・retry 可能）
 *  (2) pg_advisory_xact_lock(hashtextextended(lockMaterial, 0))（tx スコープ・commit/rollback で自動解放）
 *      bigint 化は PostgreSQL 側のみ＝Phase A/B の hash drift が構造的に不可能。
 *  (3) canonical-first exact → 検証付き legacy 照合（tx 内・lock 取得後が唯一の権威）
 *  (4) collision は typed EventIdentityCollisionError で fail-closed（ID-3。キー変形・誤収束をしない）
 *  (5) miss なら DomainEvent（**Phase B canonical writer**: 保存キー=canonicalKey・payload.idem.enc='canonical'）
 *      ＋ OutboxMessage を同一 tx で作成。
 *      Phase B 切替（条件4）: writer encoding のみを legacy FNV→canonical へ切替える。reader
 *      （findExistingByIdentity・canonical-first＋検証付き legacy fallback）と lockMaterial は**不変**の
 *      ため、pre-B に書かれた legacy 行の照合・advisory barrier の直列化・legacy 衝突の fail-closed は
 *      すべて維持される（writer 切替をまたいでも二重化ゼロ・lock drift 無し）。
 */
export async function emitDomainEventInTx(tx: TxClient, input: EmitEventInput): Promise<EmitResult> {
  const keyInput = {
    tenantId: input.tenantId,
    eventType: input.eventType,
    aggregateId: input.aggregateId,
    dedupe: input.dedupe,
  };
  const idempotencyKey = makeIdempotencyKey(keyInput);
  const canonicalKey = makeCanonicalIdempotencyKey(keyInput);
  const lockMaterial = makeEventIdentityLockMaterial(keyInput);

  await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
  // 戻り値 void の関数のため $executeRaw で実行（$queryRaw は void 列を deserialize できない）。
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockMaterial}::text, 0))`;

  const existing = await findExistingByIdentity(tx, input, idempotencyKey, canonicalKey);
  // 返却キーは Phase B の保存キー（canonical）で統一する（新規行の保存キーと一致・retry 間で不変）。
  if (existing.kind === 'hit') return { eventId: existing.id, idempotencyKey: canonicalKey, duplicated: true };
  if (existing.kind === 'collision') {
    // 衝突の主体は **legacy キー**（pre-B legacy 行が別 identity で占有）。canonical writer でも reader は
    // legacy 占有を検出し fail-closed する（誤収束・キー変形をしない）。error の legacyKey は legacy のまま。
    throw new EventIdentityCollisionError({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateId: input.aggregateId,
      legacyKey: idempotencyKey,
    });
  }

  // payload.idem = 無損失 identity metadata（ID-2）。Phase B canonical writer は enc:'canonical'。
  const idem = makeIdemMetadata({
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    dedupe: input.dedupe ?? '',
    enc: 'canonical',
  });
  const ev = await tx.domainEvent.create({
    data: {
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      actorId: input.actorId ?? null,
      actorType: input.actorType ?? 'user',
      payload: { ...(input.payload ?? {}), idem } as any,
      metadata: (input.metadata ?? undefined) as any,
      // Phase B 条件4: 保存キーは canonical（identity→key 単射・delimiter injection 耐性）。
      idempotencyKey: canonicalKey,
      status: 'pending',
    },
  });
  await tx.outboxMessage.create({
    data: {
      tenantId: input.tenantId,
      eventId: ev.id,
      eventType: input.eventType,
      payload: (input.payload ?? undefined) as any,
      status: 'pending',
    },
  });
  return { eventId: ev.id, idempotencyKey: canonicalKey, duplicated: false };
}

/**
 * ドメインイベントを発火（永続化）。同一論理 identity は二重発火しない。
 * DomainEvent と OutboxMessage を 1 トランザクションで作成（Outbox パターン）。
 * 修正版 Phase A（PA-BLK-3/PA-BLK-4）:
 *  - tx 外の事前照合は **hit の短絡のみに使用**（miss は無権威・必ず advisory lock 取得後に再検索）。
 *  - 判定と作成は interactive tx 内の advisory barrier（emitDomainEventInTx）で直列化。
 *  - 新規書込のキーは **canonical**（Phase B 条件4・writer encoding を canonical へ切替済）。
 *  - legacy キーの真の衝突は EventIdentityCollisionError で fail-closed（reader 不変）。
 */
export async function emitDomainEvent(input: EmitEventInput): Promise<EmitResult> {
  const keyInput = {
    tenantId: input.tenantId,
    eventType: input.eventType,
    aggregateId: input.aggregateId,
    dedupe: input.dedupe,
  };
  const idempotencyKey = makeIdempotencyKey(keyInput);
  const canonicalKey = makeCanonicalIdempotencyKey(keyInput);

  // fast-path（tx 外）: hit の短絡のみ。miss/collision はここでは裁定しない（無権威）。
  const fast = await findExistingByIdentity(prisma, input, idempotencyKey, canonicalKey);
  if (fast.kind === 'hit') return { eventId: fast.id, idempotencyKey: canonicalKey, duplicated: true };

  try {
    return await prisma.$transaction(async (tx) => emitDomainEventInTx(tx, input), {
      timeout: 15_000,
    });
  } catch (e: any) {
    if (e instanceof EventIdentityCollisionError) throw e;
    // barrier 外 writer（pre-A main 併走等）との競合で unique 制約に当たった場合の再照合。
    // 完全一致行あり → 冪等収束。無ければ typed fail-closed（他人の行 ID を返さない・P2002 の握り潰し禁止）。
    if (typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002') {
      const dup = await findExistingByIdentity(prisma, input, idempotencyKey, canonicalKey);
      if (dup.kind === 'hit') return { eventId: dup.id, idempotencyKey: canonicalKey, duplicated: true };
      throw new EventIdentityCollisionError({
        tenantId: input.tenantId,
        eventType: input.eventType,
        aggregateId: input.aggregateId,
        legacyKey: idempotencyKey,
      });
    }
    throw e;
  }
}

export async function markEventProcessed(eventId: string): Promise<void> {
  await prisma.domainEvent.update({
    where: { id: eventId },
    data: { status: 'processed', processedAt: new Date(), failureReason: null },
  });
}

export async function markEventFailed(eventId: string, reason: string): Promise<void> {
  const ev = await prisma.domainEvent.findUnique({ where: { id: eventId } });
  if (!ev) return;
  const retryCount = ev.retryCount + 1;
  const dead = retryCount >= MAX_EVENT_RETRIES;
  await prisma.domainEvent.update({
    where: { id: eventId },
    data: { status: dead ? 'dead' : 'failed', failureReason: reason.slice(0, 1000), retryCount },
  });
}

/** 失敗イベントを再実行可能状態に戻す（管理UIの再実行ボタン）。 */
export async function retryFailedEvent(eventId: string): Promise<void> {
  await prisma.domainEvent.update({
    where: { id: eventId },
    data: { status: 'pending', failureReason: null },
  });
  await prisma.outboxMessage.updateMany({
    where: { eventId, status: { in: ['failed', 'dead'] } },
    data: { status: 'pending', nextAttemptAt: new Date() },
  });
}

// ---- 同一プロセス内ハンドラ（業務連動） ----
type EventHandler = (ev: {
  id: string;
  tenantId: string;
  eventType: string;
  aggregateId: string;
  payload: any;
  actorId: string | null;
}) => Promise<void>;

const handlers = new Map<string, EventHandler[]>();

export function registerEventHandler(eventType: DomainEventType | '*', handler: EventHandler): void {
  const list = handlers.get(eventType) ?? [];
  list.push(handler);
  handlers.set(eventType, list);
}

export function getHandlersFor(eventType: string): EventHandler[] {
  return [...(handlers.get(eventType) ?? []), ...(handlers.get('*') ?? [])];
}

/** イベントを取得して登録ハンドラを実行し、状態を更新する。 */
export async function dispatchDomainEvent(eventId: string): Promise<void> {
  const ev = await prisma.domainEvent.findUnique({ where: { id: eventId } });
  if (!ev) return;
  try {
    for (const h of getHandlersFor(ev.eventType)) {
      await h({
        id: ev.id,
        tenantId: ev.tenantId,
        eventType: ev.eventType,
        aggregateId: ev.aggregateId,
        payload: ev.payload,
        actorId: ev.actorId,
      });
    }
    await markEventProcessed(eventId);
  } catch (e: any) {
    await markEventFailed(eventId, String(e?.message ?? e));
  }
}

// ---- Webhook 配送 ----
export interface WebhookResult {
  delivered: boolean;
  statusCode?: number;
  error?: string;
}

/** 署名付きで Webhook を配送し、結果を WebhookDelivery に記録する。 */
export async function deliverWebhook(
  subscription: { id: string; tenantId: string; url: string; secret: string },
  event: { id: string; eventType: string; payload: unknown },
): Promise<WebhookResult> {
  const body = JSON.stringify({ id: event.id, type: event.eventType, data: event.payload });
  const ts = Math.floor(Date.now() / 1000);
  const signature = `t=${ts},v1=${signWebhookPayload(subscription.secret, body, ts)}`;

  let statusCode: number | undefined;
  let error: string | undefined;
  let delivered = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(subscription.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-ikezaki-signature': signature },
      body,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    statusCode = res.status;
    delivered = res.ok;
    if (!res.ok) error = `HTTP ${res.status}`;
  } catch (e: any) {
    error = String(e?.message ?? e);
  }

  await prisma.webhookDelivery.create({
    data: {
      tenantId: subscription.tenantId,
      subscriptionId: subscription.id,
      eventId: event.id,
      eventType: event.eventType,
      url: subscription.url,
      status: delivered ? 'success' : 'failed',
      statusCode: statusCode ?? null,
      attempts: 1,
      signature,
      error: error ?? null,
      deliveredAt: delivered ? new Date() : null,
    },
  });
  return { delivered, statusCode, error };
}

/** Outbox を処理: ハンドラ実行 ＋ 対象 Webhook 配送。worker から定期実行される想定。 */
export async function processOutboxMessage(outboxId: string): Promise<void> {
  const msg = await prisma.outboxMessage.findUnique({ where: { id: outboxId } });
  if (!msg || msg.status === 'delivered') return;
  try {
    await dispatchDomainEvent(msg.eventId);
    const subs = await prisma.webhookSubscription.findMany({
      where: {
        tenantId: msg.tenantId,
        active: true,
        OR: [{ eventType: msg.eventType }, { eventType: '*' }],
      },
    });
    for (const s of subs) {
      await deliverWebhook(s, { id: msg.eventId, eventType: msg.eventType, payload: msg.payload });
    }
    await prisma.outboxMessage.update({
      where: { id: outboxId },
      data: { status: 'delivered', deliveredAt: new Date() },
    });
  } catch (e: any) {
    const attempts = msg.attempts + 1;
    await prisma.outboxMessage.update({
      where: { id: outboxId },
      data: {
        status: attempts >= MAX_EVENT_RETRIES ? 'dead' : 'failed',
        attempts,
        lastError: String(e?.message ?? e).slice(0, 1000),
        nextAttemptAt: new Date(Date.now() + nextRetryDelayMs(attempts)),
      },
    });
  }
}
