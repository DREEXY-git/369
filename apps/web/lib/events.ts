// イベント連動基盤（EventLog/Outbox/Webhook）。Phase 1-2。
// emitDomainEvent: DomainEvent（イベントログ）＋OutboxMessage をトランザクションで保存（冪等）。
// dispatch: 登録ハンドラ実行 ＋ Webhook 配送。失敗は記録し再試行可能にする。
import { prisma } from './db';
import {
  makeIdempotencyKey,
  makeLegacyIdempotencyKey,
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

/** 同一論理 identity の既存 DomainEvent を canonical/legacy 両キーで探す（upgrade-safe dual-read・Codex PR#57 R5/R6/R7 #1）。
 *
 *  legacy FNV キーは identity（dedupe を含む）を無損失に保持せず、行にも dedupe は保存されていない。
 *  そこで **dedupe の空性による同一性証明** を使う（Codex R7: payload 等コンテンツの一致を dedupe 一致の
 *  代用にしない）:
 *
 *   - **監査事実（deployed main の静的性質）**: main `7e50a04` の全 production call site は
 *     `emitDomainEvent` / `emitGrowthEvent(alsoDomainEvent)` に dedupe を一切渡さない
 *     （`git grep dedupe origin/main` の一致は packages/shared の unit test のみ）。
 *     ∴ **既存 legacy 行の identity はすべて dedupe=''**。これは確率論ではなく、旧コードの
 *     到達可能な書込経路の全数監査による無損失な証明である。
 *
 *   - **dedupe-less emit（input.dedupe が空）**: legacy キー一致＋列一致（tenantId/eventType/
 *     aggregateType/aggregateId）が成立すれば、identity = (tenant, type, aggregate, '') は保存行の
 *     identity と**完全一致**（'' === ''）→ 収束（duplicated・再配送なし）。
 *
 *   - **dedupe-bearing emit（input.dedupe が非空）**: legacy 行の identity は dedupe='' なので、
 *     キーが FNV 衝突しても**別 identity であることが確定** → 決して収束しない（fail-closed）。
 *     自分の canonical DomainEvent＋Outbox を新規作成し、イベントを静かに失わない。
 *     Codex R7 fixture（agg-same の d42vu/dfuea・同一コンテンツ）はこの経路で両方とも独立に成立する。
 *
 *  これにより「同一コンテンツ・異なる dedupe」の衝突ペアでも誤収束は構造的に発生しない。
 *  なお legacy 形式の行が今後増えることはない（新規書込は常に完全 identity を保持する canonical key）。
 *  旧行を canonical key へ書き換える backfill は本番 data migration のため実行せず、
 *  `CLAUDE_HUMAN_GATE_V90_SCHEMA_P3_FIN1_EVENT_IDENTITY` として設計のみ提示する（handoff 参照）。 */
async function findExistingByIdentity(
  input: EmitEventInput,
  canonicalKey: string,
): Promise<{ id: string } | null> {
  const byCanonical = await prisma.domainEvent.findUnique({
    where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: canonicalKey } },
    select: { id: true },
  });
  if (byCanonical) return byCanonical;
  // dedupe-bearing identity は legacy 行（全行 dedupe=''）と同一になり得ない → legacy 照合しない（fail-closed）。
  if (input.dedupe) return null;
  const legacyKey = makeLegacyIdempotencyKey({
    tenantId: input.tenantId,
    eventType: input.eventType,
    aggregateId: input.aggregateId,
    dedupe: input.dedupe,
  });
  return prisma.domainEvent.findFirst({
    where: {
      tenantId: input.tenantId,
      idempotencyKey: legacyKey,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
    },
    select: { id: true },
  });
}

/**
 * ドメインイベントを発火（永続化）。同一 idempotencyKey は二重発火しない。
 * DomainEvent と OutboxMessage を1トランザクションで作成（Outboxパターン）。
 * 既存行の照合は canonical key に加え **旧 FNV 形式キーでも dual-read** し、key 形式移行前に
 * 保存された同一論理イベントの retry/re-emit で二重 DomainEvent/Outbox を作らない（upgrade 互換）。
 * 新規書込は常に canonical key（fresh identity の無衝突性は不変）。
 */
export async function emitDomainEvent(input: EmitEventInput): Promise<EmitResult> {
  const idempotencyKey = makeIdempotencyKey({
    tenantId: input.tenantId,
    eventType: input.eventType,
    aggregateId: input.aggregateId,
    dedupe: input.dedupe,
  });

  const existing = await findExistingByIdentity(input, idempotencyKey);
  if (existing) {
    return { eventId: existing.id, idempotencyKey, duplicated: true };
  }

  try {
    const event = await prisma.$transaction(async (tx) => {
      const ev = await tx.domainEvent.create({
        data: {
          tenantId: input.tenantId,
          eventType: input.eventType,
          aggregateType: input.aggregateType,
          aggregateId: input.aggregateId,
          actorId: input.actorId ?? null,
          actorType: input.actorType ?? 'user',
          payload: (input.payload ?? undefined) as any,
          metadata: (input.metadata ?? undefined) as any,
          idempotencyKey,
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
      return ev;
    });
    return { eventId: event.id, idempotencyKey, duplicated: false };
  } catch (e: any) {
    // 競合（同時発火）で unique 制約に当たった場合も冪等に扱う（canonical/legacy 両キーで再照合）
    const dup = await findExistingByIdentity(input, idempotencyKey);
    if (dup) return { eventId: dup.id, idempotencyKey, duplicated: true };
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
