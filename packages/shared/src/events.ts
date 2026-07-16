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
 * 冪等キー（決定的・**無損失で衝突なし**）。同一 (tenant,type,aggregate,dedupe) は同一キー、
 * 異なる identity は必ず異なるキー。
 *
 * DB 一意識別子（`DomainEvent @@unique([tenantId, idempotencyKey])` 等）に使うため、
 * 以前の FNV-1a 32bit ハッシュ縮約は**使わない**。32bit 空間は誕生日衝突が現実的（約 7.7 万件で
 * 50%）で、異なる aggregate（例: 別 invoice の RECEIVABLE_COLLECTED）が同一キーへ決定論的に衝突し、
 * 正当なイベント作成を P2002 で恒久拒否し得た（Codex PR#57 R4 #1）。
 *
 * 代わりに **完全 canonical key** を生成する。tenant/eventType/aggregateId/dedupe の各成分を
 * `encodeURIComponent` で符号化して連結するため、区切り文字 `:` の混入（delimiter injection）でも
 * 別 identity が同一キーへ衝突しない（符号化後の各成分は `:` を含まない）。crypto 依存なし・client 安全。
 */
export function makeIdempotencyKey(input: {
  tenantId: string;
  eventType: string;
  aggregateId: string;
  dedupe?: string;
}): string {
  const enc = (s: string) => encodeURIComponent(s);
  // eventType は固定 enum（`:` を含まない）なので可読な prefix として素のまま残す。
  // 続く成分は符号化するため、文字列中の `:` は区切りのみ＝identity→key は単射（無衝突）。
  return `${input.eventType}:${enc(input.tenantId)}:${enc(input.aggregateId)}:${enc(input.dedupe ?? '')}`;
}

/** 指数バックオフ（ms）。再試行のスケジューリングに使用。 */
export function nextRetryDelayMs(retryCount: number, baseMs = 2000, maxMs = 3_600_000): number {
  const d = baseMs * Math.pow(2, Math.max(0, retryCount));
  return Math.min(d, maxMs);
}

export const MAX_EVENT_RETRIES = 6;
