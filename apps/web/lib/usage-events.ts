// Phase 1-23: 非課金の利用量(UsageEvent)記録ヘルパー。
//
// これは「課金」ではない。利用量(quantity)を台帳に記録するだけ。金額(amount/price/currency)は扱わない。
// 重要: metadata に PII / secret / 本文（顧客名・メール・プロンプト・生成文・CSV本文）/ 金額 /
//       campaignId などの実値を入れない。集計補助の非PII値（scope/format/真偽フラグ等）のみ。
// 設計詳細: docs/audit/15_monetization_usage_design.md。
import { prisma } from '@/lib/db';

const ALLOWED_BILLING = ['usage_only', 'billable_candidate', 'never_billable'] as const;
type Billing = (typeof ALLOWED_BILLING)[number];

export interface RecordUsageEventInput {
  tenantId: string;
  actorId?: string | null;
  actorType?: 'user' | 'ai_agent' | 'system';
  eventType: string;
  category: string;
  /** Phase 1-23 の発火点では必ず 'usage_only'。許可値以外は usage_only に丸める。 */
  billing?: Billing;
  unit?: string;
  quantity?: number | string;
  sourceType?: string;
  sourceId?: string | null;
  idempotencyKey: string;
  /** 非PIIの集計補助のみ。PII / secret / 本文 / 金額 / 実IDを入れない。 */
  metadata?: Record<string, unknown>;
}

export interface RecordUsageEventResult {
  ok: boolean;
  created?: boolean;
  duplicate?: boolean;
  reason?: string;
}

/**
 * UsageEvent を安全に1件記録する。
 * - tenantId + idempotencyKey の unique 制約に当たった場合は duplicate 扱い（既存を壊さない）。
 * - 記録に失敗しても例外を外へ投げない（呼び出し元の主処理を壊さないため ok:false を返すだけ）。
 * - billing は許可値以外なら usage_only に丸める。amount/price/currency は扱わない。
 */
export async function recordUsageEvent(input: RecordUsageEventInput): Promise<RecordUsageEventResult> {
  const { tenantId, eventType, category, idempotencyKey } = input;

  // 必須項目が空なら記録しない（主処理は壊さない）。
  if (!tenantId || !eventType || !category || !idempotencyKey) {
    return { ok: false, reason: 'missing_required_field' };
  }

  // 許可値以外の billing は usage_only に丸める。
  const billing: Billing = ALLOWED_BILLING.includes(input.billing as Billing)
    ? (input.billing as Billing)
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
        // 既存 writeAudit と同じ Json 受け渡し規約。metadata は非PIIのみ（呼び出し側で担保）。
        metadata: (input.metadata ?? undefined) as any,
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
