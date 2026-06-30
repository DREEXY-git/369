// Outbox 配送コア（worker の OUTBOX_DISPATCH_JOB と web の手動実行で共用）。Phase 1-3。
// 業務連動ハンドラは発火時に web 側で同期実行済み。本処理は「Webhook 配送 + retry/dead-letter」を担う。
import { prisma } from './client';
import { createJobRun, appendJobRunLog, finishJobRun, failJobRun } from './jobrun';
import { recordUsageEventCore } from './usage';
import { nextRetryDelayMs, MAX_EVENT_RETRIES } from '@hokko/shared';
import { signWebhookPayload } from '@hokko/shared/webhook';

async function deliverOne(
  sub: { id: string; tenantId: string; url: string; secret: string },
  event: { id: string; eventType: string; payload: unknown },
): Promise<{ delivered: boolean; statusCode?: number; error?: string }> {
  const body = JSON.stringify({ id: event.id, type: event.eventType, data: event.payload });
  const ts = Math.floor(Date.now() / 1000);
  const signature = `t=${ts},v1=${signWebhookPayload(sub.secret, body, ts)}`;
  let statusCode: number | undefined;
  let error: string | undefined;
  let delivered = false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(sub.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-ikezaki-signature': signature },
      body,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    statusCode = res.status;
    delivered = res.ok;
    if (!res.ok) error = `HTTP ${res.status}`;
  } catch (e: any) {
    error = String(e?.message ?? e);
  }
  const deliveryRow = await prisma.webhookDelivery.create({
    data: {
      tenantId: sub.tenantId,
      subscriptionId: sub.id,
      eventId: event.id,
      eventType: event.eventType,
      url: sub.url,
      status: delivered ? 'success' : 'failed',
      statusCode: statusCode ?? null,
      attempts: 1,
      signature,
      error: error ?? null,
      deliveredAt: delivered ? new Date() : null,
    },
  });
  // Phase 1-37: 非課金 UsageEvent。Webhook 配送が success 確定したときだけ1件記録する。
  // failed / dead / retry失敗 は記録しない（success のみ）。idempotencyKey=eventId:subscriptionId のため、
  // 部分失敗の再試行で同じ宛先に再度 success が起きても二重計上しない（最終成功1回・unique 制約で構造防止）。
  // metadata は固定の非PII（eventType ラベル）のみ。url/secret/signature/payload/statusCode/error/実ID/金額は入れない。
  // recordUsageEventCore は例外を投げない設計のため、記録失敗で Webhook 配送主処理・戻り値・retry 制御を壊さない。
  if (delivered) {
    await recordUsageEventCore({
      tenantId: sub.tenantId,
      actorId: null,
      actorType: 'system',
      eventType: 'webhook.delivered',
      category: 'webhook',
      billing: 'usage_only',
      unit: 'count',
      quantity: 1,
      sourceType: 'WebhookDelivery',
      sourceId: deliveryRow.id,
      idempotencyKey: `usage:webhook.delivered:${event.id}:${sub.id}`,
      metadata: { eventType: event.eventType },
    });
  }
  return { delivered, statusCode, error };
}

export interface OutboxResult {
  jobRunId: string;
  processed: number;
  delivered: number;
  failed: number;
  dead: number;
}

/**
 * pending / failed の OutboxMessage をまとめて処理する。
 * - 該当 Webhook へ署名付き配送（無ければ「配送完了」とみなす）
 * - 失敗は attempts++ ＋ 指数バックオフで再試行、上限超過で dead-letter
 * - JobRun / JobRunLog に記録
 */
export async function processOutboxBatch(
  opts: { limit?: number; actorId?: string | null } = {},
): Promise<OutboxResult> {
  const limit = opts.limit ?? 50;
  const jobRunId = await createJobRun({
    jobType: 'OUTBOX_DISPATCH',
    actorId: opts.actorId ?? null,
    metadata: { limit },
  });
  let processed = 0;
  let delivered = 0;
  let failed = 0;
  let dead = 0;
  try {
    const now = new Date();
    const msgs = await prisma.outboxMessage.findMany({
      where: { status: { in: ['pending', 'failed'] }, nextAttemptAt: { lte: now } },
      orderBy: { nextAttemptAt: 'asc' },
      take: limit,
    });
    await appendJobRunLog(jobRunId, 'info', `outbox 対象 ${msgs.length} 件を処理開始`);

    for (const msg of msgs) {
      processed++;
      try {
        const subs = await prisma.webhookSubscription.findMany({
          where: {
            tenantId: msg.tenantId,
            active: true,
            OR: [{ eventType: msg.eventType }, { eventType: '*' }],
          },
        });
        let allOk = true;
        for (const s of subs) {
          const r = await deliverOne(s, { id: msg.eventId, eventType: msg.eventType, payload: msg.payload });
          if (!r.delivered) allOk = false;
        }
        if (!allOk) throw new Error('1件以上の Webhook 配送に失敗');

        await prisma.outboxMessage.update({
          where: { id: msg.id },
          data: { status: 'delivered', deliveredAt: new Date() },
        });
        await prisma.domainEvent
          .update({ where: { id: msg.eventId }, data: { status: 'processed', processedAt: new Date() } })
          .catch(() => undefined);
        delivered++;
        await appendJobRunLog(jobRunId, 'info', `outbox ${msg.id} (${msg.eventType}) 配送完了 / 宛先 ${subs.length}`);
      } catch (e: any) {
        const attempts = msg.attempts + 1;
        const isDead = attempts >= MAX_EVENT_RETRIES;
        await prisma.outboxMessage.update({
          where: { id: msg.id },
          data: {
            status: isDead ? 'dead' : 'failed',
            attempts,
            lastError: String(e?.message ?? e).slice(0, 1000),
            nextAttemptAt: new Date(Date.now() + nextRetryDelayMs(attempts)),
          },
        });
        if (isDead) dead++;
        else failed++;
        await appendJobRunLog(
          jobRunId,
          isDead ? 'error' : 'warn',
          `outbox ${msg.id} 失敗 (試行${attempts}${isDead ? ', dead-letter' : ''}): ${String(e?.message ?? e)}`,
        );
      }
    }
    await finishJobRun(jobRunId, { processed, delivered, failed, dead });
  } catch (e: any) {
    await failJobRun(jobRunId, String(e?.message ?? e));
  }
  return { jobRunId, processed, delivered, failed, dead };
}
