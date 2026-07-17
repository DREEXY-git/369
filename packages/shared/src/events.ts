// ドメインイベントの型・冪等キー（純ロジック・DB非依存・client安全）。
// 署名(HMAC)は node:crypto を使うため別モジュール '@hokko/shared/webhook' に隔離。

export const DOMAIN_EVENT_TYPES = [
  'CUSTOMER_CREATED',
  'CUSTOMER_UPDATED',
  'DEAL_CREATED',
  'DEAL_STAGE_CHANGED',
  'QUOTE_CREATED',
  'QUOTE_APPROVED',
  'CONTRACT_CREATED',
  'CONTRACT_SIGNED',
  'INVOICE_CREATED',
  'PAYMENT_RECEIVED',
  'RECEIPT_UPLOADED',
  'JOURNAL_SUGGESTED',
  'INVENTORY_RESERVED',
  'INVENTORY_RELEASED',
  'TASK_CREATED',
  'MEETING_MINUTES_CREATED',
  'KNOWLEDGE_INGESTED',
  'AI_AGENT_RUN_COMPLETED',
  'OUTREACH_DRAFT_CREATED',
  'OUTREACH_APPROVED',
  'EXTERNAL_SEND_REQUESTED',
  'LOCATION_VIEWED',
  'RECORDING_VIEWED',
  'CONFIDENTIAL_DATA_VIEWED',
  'MARKETING_CAMPAIGN_CREATED',
  'MARKETING_ASSET_APPROVED',
  'DX_OPPORTUNITY_DETECTED',
  'DX_AUTOMATION_COMPLETED',
  'GROWTH_EVENT_RECORDED',
  // Operations OS（在庫/リース/イベント会社）— Phase 1-6
  'INVENTORY_MOVEMENT_CREATED',
  'INVENTORY_STATUS_CHANGED',
  'LEASE_RESERVATION_CREATED',
  'LEASE_RESERVATION_CONFIRMED',
  'LEASE_ITEM_DISPATCHED',
  'LEASE_ITEM_RETURNED',
  'EVENT_PROJECT_CREATED',
  'EVENT_EQUIPMENT_ASSIGNED',
  'EVENT_PROFITABILITY_RECORDED',
  'EVENT_PROJECT_COMPLETED',
  // Operations 実行管理（棚卸/発注/物流/人員/リスク）— Phase 1-7
  'STOCKTAKE_CREATED',
  'STOCKTAKE_RECONCILED',
  'PURCHASE_ORDER_CREATED',
  'PURCHASE_ORDER_APPROVED',
  'PURCHASE_ORDER_RECEIVED',
  'LOGISTICS_TASK_CREATED',
  'LOGISTICS_TASK_COMPLETED',
  'EVENT_STAFF_ASSIGNED',
  'EVENT_RISK_CREATED',
  'EVENT_RISK_RESOLVED',
  'DAMAGE_CHARGE_FINALIZED',
  // Finance Bridge（Operations→Finance）— Phase 1-8
  'FINANCE_EVENT_CREATED',
  'JOURNAL_CANDIDATE_CREATED',
  'JOURNAL_CANDIDATE_APPROVAL_REQUESTED',
  'INVOICE_CANDIDATE_CREATED',
  'INVOICE_SEND_APPROVAL_REQUESTED',
  'CASHFLOW_EXPECTED_CREATED',
  'PURCHASE_ORDER_FINANCE_BRIDGED',
  'EVENT_PROJECT_FINANCE_BRIDGED',
  'DAMAGE_CHARGE_FINANCE_BRIDGED',
  // 候補→正式化（Candidate Formalization）— Phase 1-9
  'JOURNAL_ENTRY_POSTED',
  'INVOICE_FORMALIZED',
  'RECEIVABLE_CREATED',
  // 請求送信・入金消込（Invoice Send / Payment Reconciliation）— Phase 1-10
  'INVOICE_SENT',
  'RECEIVABLE_COLLECTED',
  'CASHFLOW_ACTUAL_RECORDED',
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

export function isDomainEventType(v: string): v is DomainEventType {
  return (DOMAIN_EVENT_TYPES as readonly string[]).includes(v);
}

export type EventStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'dead';

export interface DomainEventInput {
  tenantId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  actorId?: string | null;
  actorType?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  /** 冪等化のための追加識別子（同一イベントの二重発火を防ぐ）。 */
  dedupe?: string;
}

/**
 * 冪等キー（決定的・衝突しにくい）。同一 (tenant,type,aggregate,dedupe) は同一キー。
 * crypto不要の安定文字列 + 簡易ハッシュで短縮。
 */
export function makeIdempotencyKey(input: {
  tenantId: string;
  eventType: string;
  aggregateId: string;
  dedupe?: string;
}): string {
  const base = `${input.tenantId}:${input.eventType}:${input.aggregateId}:${input.dedupe ?? ''}`;
  return `${input.eventType}:${fnv1a(base)}`;
}

// FNV-1a 32bit（依存なしの安定ハッシュ。暗号用途ではない）。
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * **legacy 冪等キーの明示名**（常設・修正版 Phase A / PA-BLK-1）。
 * makeIdempotencyKey と byte 同一の実装であり、「makeIdempotencyKey がどの encoding か」が
 * build ごとに変わる名前ドリフトを排除するための恒久 alias。以後どの phase でも改名・意味変更しない。
 * Phase A の writer はこの legacy encoding で保存する（Phase B が canonical へ切替えるまで不変）。
 */
export const makeLegacyIdempotencyKey = makeIdempotencyKey;

/**
 * **canonical 冪等キー**（Phase A・dual-reader 先行導入 / WIP-PADN-PHASEA-001・blocker B2）。
 *
 * PR #57（claude/q2c-payment-void-race-fix-v1）は writer を本形式へ切替える:
 *   `${eventType}:${encodeURIComponent(tenantId)}:${encodeURIComponent(aggregateId)}:${encodeURIComponent(dedupe ?? '')}`
 * eventType は固定 enum（`:` を含まない）で素のまま prefix に残し、続く成分は encodeURIComponent で
 * 符号化するため `:` は区切りのみ＝identity→key は**単射**（delimiter injection でも衝突しない）。
 *
 * Phase A の main では**writer はこのキーを書かない**（保存は従来の legacy FNV キーのまま）。
 * 本関数は「PR #57 デプロイ後に canonical キーで保存された行を、rollback 後の main が
 * 同一論理イベントとして認識する」ための**読み取り専用**の照合キー生成に使う。
 * PR #57 の書式と byte 単位で互換であること（独自変更禁止）。
 */
export function makeCanonicalIdempotencyKey(input: {
  tenantId: string;
  eventType: string;
  aggregateId: string;
  dedupe?: string;
}): string {
  const enc = (s: string) => encodeURIComponent(s);
  return `${input.eventType}:${enc(input.tenantId)}:${enc(input.aggregateId)}:${enc(input.dedupe ?? '')}`;
}

/**
 * DomainEvent identity 単位の advisory lock 名前空間（修正版 Phase A / PA-BLK-3・凍結）。
 * repo 内に他の advisory lock 利用は無い（設計監査 C で grep 確認済み）＝名前空間衝突なし。
 * Phase B も**同一定数・同一関数**（makeEventIdentityLockMaterial）を import し独自生成しない。
 */
export const EVENT_IDENTITY_LOCK_NS = 'domain_event_identity:v1:';

/**
 * advisory lock の lockMaterial（文字列）。bigint 化は **PostgreSQL 側**の
 * `hashtextextended(lockMaterial, 0)` が唯一の実装点（JS 側では一切ハッシュしない）。
 * これにより Phase A/B のクライアント実装差・ランタイム差による hash drift が構造的に不可能。
 * 64bit hash 衝突の影響は「無関係 identity の直列化（待ち増）」のみで、同一性判定は lock ではなく
 * post-lock の exact 再検索＋列検証が行うため誤 dedupe は起きない（衝突は安全側）。
 */
export function makeEventIdentityLockMaterial(input: {
  tenantId: string;
  eventType: string;
  aggregateId: string;
  dedupe?: string;
}): string {
  return EVENT_IDENTITY_LOCK_NS + makeCanonicalIdempotencyKey(input);
}

/**
 * legacy FNV キーの真の衝突（別 identity が同一 legacy キーを占有）による書込不能の typed error
 * （修正版 Phase A / PA-BLK-4・ID-3 fail-closed）。
 * 他人の行 ID を返さない・キーを変形して書かない・黙って落とさない。復旧経路は Phase B の
 * canonical writer（無衝突 encoding）で当該 identity が書けること（runbook 記載）。
 */
export class EventIdentityCollisionError extends Error {
  readonly tenantId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly legacyKey: string;
  constructor(input: { tenantId: string; eventType: string; aggregateId: string; legacyKey: string }) {
    super(
      `DomainEvent legacy idempotency key collision (fail-closed): key=${input.legacyKey} eventType=${input.eventType} aggregateId=${input.aggregateId}`,
    );
    this.name = 'EventIdentityCollisionError';
    this.tenantId = input.tenantId;
    this.eventType = input.eventType;
    this.aggregateId = input.aggregateId;
    this.legacyKey = input.legacyKey;
  }
}

export type IdempotencyKeyFormat = 'canonical' | 'legacy' | 'unknown';

/**
 * 保存済み idempotencyKey 文字列がどちらの表現かを判定する（dual-read 用）。
 * - legacy   = `eventType:<fnv32 hex8>` → `:` 区切りでちょうど 2 セグメント・末尾が hex8。
 * - canonical = `eventType:<enc>:<enc>:<enc>` → ちょうど 4 セグメント（符号化成分は `:` を含まない）。
 * eventType は enum で `:` を含まないため、両形式のセグメント数は決して重ならない（判定は無曖昧）。
 */
export function classifyIdempotencyKey(key: string): IdempotencyKeyFormat {
  const parts = key.split(':');
  if (parts.length === 4) return 'canonical';
  if (parts.length === 2 && /^[0-9a-f]{8}$/.test(parts[1] ?? '')) return 'legacy';
  return 'unknown';
}

/**
 * dual-read の同値判定: 保存済み key（canonical/legacy いずれの表現でも）が、
 * 指定の論理イベント identity (tenant, eventType, aggregate, dedupe) を表すかを返す。
 *
 * - canonical 表現との一致は**単射**なので identity の完全一致を意味する（誤爆なし）。
 * - legacy 表現との一致は FNV 32bit 縮約（非可逆）に基づく現行 main と同一の保証水準
 *   （読み取り側の従来挙動から後退しない）。
 * - どちらの key でもない文字列は false（unknown を同値とみなさない）。
 */
export function idempotencyKeyMatchesIdentity(
  key: string,
  identity: { tenantId: string; eventType: string; aggregateId: string; dedupe?: string },
): boolean {
  const format = classifyIdempotencyKey(key);
  if (format === 'canonical') return key === makeCanonicalIdempotencyKey(identity);
  if (format === 'legacy') return key === makeIdempotencyKey(identity);
  return false;
}

/** 指数バックオフ（ms）。再試行のスケジューリングに使用。 */
export function nextRetryDelayMs(retryCount: number, baseMs = 2000, maxMs = 3_600_000): number {
  const d = baseMs * Math.pow(2, Math.max(0, retryCount));
  return Math.min(d, maxMs);
}

export const MAX_EVENT_RETRIES = 6;
