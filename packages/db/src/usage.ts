// Phase 1-36: worker-safe な非課金 UsageEvent 記録（共通 recorder）。
//
// これは「課金」ではない。利用量(quantity)を台帳に記録するだけ。金額(amount/price/currency)は扱わない。
// apps/web 専用 helper（apps/web/lib/usage-events.ts）は `@/lib/db` に依存するため worker/packages から使えない。
// 本 recorder は packages/db の ./client を直接使い、apps/web に一切依存しない。
// これにより将来 apps/worker / packages/db 経路（Webhook / JobRun 等）からも安全に記録できる。
//
// 重要:
// - 本フェーズでは runtime call site（Webhook/JobRun emit）は追加しない。recorder 本体のみ。
// - runtime billing は usage_only のみ。billable_candidate / never_billable は runtime で使わない。
// - metadata に PII / secret / URL / signature / payload / 本文 / 金額 / 実ID を入れない。
//   ここでは最低限の top-level key guard を行う（完全な DLP ではない。値の中身は深追いしない）。
// 設計詳細: docs/audit/17_worker_usage_recorder_design.md / docs/audit/15_monetization_usage_design.md。
import { prisma } from './client';

export type UsageEventActorType = 'user' | 'ai_agent' | 'system';
export type UsageEventBilling = 'usage_only' | 'billable_candidate' | 'never_billable';

const ALLOWED_BILLING: readonly UsageEventBilling[] = ['usage_only', 'billable_candidate', 'never_billable'];

// metadata に入れてはいけない top-level key（最低限のガード）。
// URL / secret / signature / payload / 本文 / 顧客情報 / 金額 / 実ID / token 等。
const FORBIDDEN_METADATA_KEYS: readonly string[] = [
  'url',
  'secret',
  'signature',
  'payload',
  'body',
  'requestBody',
  'responseBody',
  'errorBody',
  'stack',
  'stackTrace',
  'prompt',
  'outputText',
  'transcript',
  'fullText',
  'customer',
  'customerName',
  'email',
  'subject',
  'draftMessage',
  'maskedBody',
  'amount',
  'price',
  'currency',
  'total',
  'invoiceNumber',
  'receivable',
  'customerId',
  'leadId',
  'reminderId',
  'invoiceId',
  'token',
  'apiKey',
  'databaseUrl',
];

export interface RecordUsageEventCoreInput {
  tenantId: string;
  actorId?: string | null;
  actorType?: UsageEventActorType;
  eventType: string;
  category: string;
  /** Phase 1-36 の runtime 使用は 'usage_only' のみ。許可値以外は usage_only に丸める。 */
  billing?: UsageEventBilling | string;
  unit?: string;
  quantity?: number | string;
  sourceType?: string;
  sourceId?: string | null;
  idempotencyKey: string;
  /** 非PIIの集計補助のみ。PII / secret / URL / 本文 / 金額 / 実ID を入れない。 */
  metadata?: Record<string, unknown>;
}

export interface RecordUsageEventCoreResult {
  ok: boolean;
  created?: boolean;
  duplicate?: boolean;
  reason?: string;
}

/**
 * UsageEvent を安全に1件記録する（worker-safe・apps/web 非依存）。
 * - tenantId + idempotencyKey の unique 制約に当たった場合は duplicate 扱い（既存を壊さない）。
 * - 記録に失敗しても例外を外へ投げない（呼び出し元の主処理を壊さないため ok:false を返すだけ）。
 * - billing は許可値以外なら usage_only に丸める。amount/price/currency は扱わない。
 * - metadata に禁止 top-level key がある場合は create せず ok:false を返す（最低限のガード）。
 */
export async function recordUsageEventCore(
  input: RecordUsageEventCoreInput,
): Promise<RecordUsageEventCoreResult> {
  const { tenantId, eventType, category, idempotencyKey } = input;

  // 必須項目が空なら記録しない（主処理は壊さない）。
  if (!tenantId || !eventType || !category || !idempotencyKey) {
    return { ok: false, reason: 'missing_required_field' };
  }

  // metadata の禁止 top-level key ガード（最低限・値の中身は深追いしない）。
  if (input.metadata) {
    const keys = Object.keys(input.metadata);
    if (keys.some((k) => FORBIDDEN_METADATA_KEYS.includes(k))) {
      return { ok: false, reason: 'forbidden_metadata_key' };
    }
  }

  // 許可値以外の billing は usage_only に丸める。
  const billing: UsageEventBilling = ALLOWED_BILLING.includes(input.billing as UsageEventBilling)
    ? (input.billing as UsageEventBilling)
    : 'usage_only';

  try {
    await prisma.usageEvent.create({
      data: {
        tenantId,
        actorId: input.actorId ?? null,
        actorType: input.actorType ?? 'user',
        eventType,
        category,
        billing,
        unit: input.unit ?? 'count',
        quantity: input.quantity ?? 1,
        sourceType: input.sourceType ?? '',
        sourceId: input.sourceId ?? null,
        idempotencyKey,
        // 既存 writeAudit / apps/web helper と同じ Json 受け渡し規約。metadata は非PIIのみ（呼び出し側で担保）。
        metadata: (input.metadata ?? undefined) as never,
      },
    });
    return { ok: true, created: true };
  } catch (err) {
    // 二重計上は unique 制約違反（Prisma P2002）。既存イベントを壊さず duplicate 扱い。
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002') {
      return { ok: true, created: false, duplicate: true };
    }
    // それ以外の失敗は記録を諦めるだけ。主処理は継続させる（例外を外へ投げない）。
    return { ok: false, reason: 'create_failed' };
  }
}
