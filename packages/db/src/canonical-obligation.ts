// P5-FIN-002: Canonical Cashflow Obligation の永続 service（正本の唯一の書込み口）。
//
// 目的:
//  - FIN-01（@hokko/shared / packages/shared/src/cashflow-obligation.ts）の versioned canonical
//    identity を、DB 上の永続 obligation（CashflowObligation + CashflowObligationAlias）へ接続する。
//  - web producer（apps/web の finance 各所）と DB backfill が「同じ」この service を使い、
//    upsert / conflict 判定を二重実装しない（P5-FIN-002 §12.1）。
//
// 設計原則:
//  - identity encoding は FIN-01 の resolveCanonicalObligationIdentity をそのまま使う（本 service では作らない）。
//  - tenant 境界は identity（tenantId 込み）と DB composite relation の両方で守る（cross-tenant を作らない）。
//  - 金額・期日・表示名の一致で obligation を統合しない。正本 ID（namespace, sourceId）だけで同一性を決める。
//  - 不確実（direction / currency 競合、alias 衝突）は推測で上書きせず lifecycleStatus='coverage_incomplete'
//    にして安全側に倒す（fail-safe）。
//  - 同一 identity の並行 upsert は pg_advisory_xact_lock（tenant + canonicalKey）で直列化し、
//    alias の unique 制約（[tenantId, canonicalKey]）を最終 barrier とする。
//
// 実装上の注意:
//  - すべて呼び出し側の transaction 内で実行する（lifecycle 変更を legacy FinanceEvent の write と同一 tx にする）。
//  - lifecycle（settle/void）は既存 obligation を alias 経由で引くだけなので narrow な structural tx 型を受ける
//    （invoice-void-bridge の注入 db でも呼べるようにするため）。

import type { Prisma } from '@prisma/client';
import {
  resolveCanonicalObligationIdentity,
  CASHFLOW_OBLIGATION_IDENTITY_VERSION,
  type CashflowObligationNamespace,
} from '@hokko/shared';

/** obligation を表現しうる予定 event の type（FIN-01 EXPECTED_CASHFLOW_TYPES と一致）。 */
export const EXPECTED_CASHFLOW_TYPES = new Set(['cashflow_expected', 'payment_expected']);

/** obligation の lifecycle 状態。 */
export type ObligationLifecycleStatus =
  | 'open'
  | 'partially_settled'
  | 'settled'
  | 'void'
  | 'coverage_incomplete';

/** create/converge 系が必要とする最小の tx（advisory lock + 全 CRUD）。Prisma.TransactionClient が構造的に満たす。 */
export type ObligationWriteTx = Prisma.TransactionClient;

/** lifecycle 系（settle/void）が必要とする最小の tx。既存 obligation を引いて更新するだけ。 */
export type ObligationLifecycleTx = Pick<
  Prisma.TransactionClient,
  'cashflowObligation' | 'cashflowObligationAlias'
>;

/** produce 時に FinanceEvent から導出した canonical identity。 */
export type ProducerIdentity =
  | {
      ok: true;
      namespace: CashflowObligationNamespace;
      identitySourceId: string;
      canonicalKey: string;
    }
  | { ok: false; reason: string };

/**
 * produce 時（emit の瞬間）の canonical identity 導出。
 * FIN-01 の sourceType 解決規則の producer 版:
 *  - PurchaseOrder → po / poId
 *  - Invoice → inv / invoiceId
 *  - InvoiceCandidate → cand / candidateId（正式化は finalize 時に inv alias で収束させる）
 *  - 未知 source の cashflow_expected → evt / FinanceEvent.id（額面通り個別に残す）
 *  - 未知 source の payment_expected → 発行しない（cashflow_expected と二重の可能性。推測で統合しない）
 * expected 以外の type（event_revenue 等）は obligation を作らない。
 */
export function deriveProducerObligationIdentity(
  tenantId: string,
  type: string,
  sourceType: string | null,
  sourceId: string | null,
  eventId: string,
): ProducerIdentity {
  if (!EXPECTED_CASHFLOW_TYPES.has(type)) return { ok: false, reason: 'not-expected-type' };
  const src = sourceType ?? '';
  const sid = sourceId ?? '';
  let namespace: CashflowObligationNamespace;
  let identitySourceId: string;
  if (src === 'PurchaseOrder' && sid) {
    namespace = 'po';
    identitySourceId = sid;
  } else if (src === 'Invoice' && sid) {
    namespace = 'inv';
    identitySourceId = sid;
  } else if (src === 'InvoiceCandidate' && sid) {
    namespace = 'cand';
    identitySourceId = sid;
  } else if (type === 'cashflow_expected') {
    namespace = 'evt';
    identitySourceId = eventId;
  } else {
    // payment_expected で source 不明 → 推測しない（§14.6）。
    return { ok: false, reason: 'unknown-payment-expected' };
  }
  const identity = resolveCanonicalObligationIdentity(tenantId, namespace, identitySourceId);
  if (!identity.ok) return { ok: false, reason: identity.reason };
  return { ok: true, namespace, identitySourceId, canonicalKey: identity.key };
}

/** produce 時に FinanceEvent が確定した後、obligation を upsert して event を link する入力。 */
export interface ProducerObligationInput {
  tenantId: string;
  /** すでに作成済みの FinanceEvent.id（link 対象・evt namespace の sourceId にもなる）。 */
  eventId: string;
  type: string;
  sourceType: string | null;
  sourceId: string | null;
  direction: string; // inflow | outflow | neutral
  amount: number;
  dueAt: Date | null;
  currency?: string;
  description?: string | null;
}

export interface UpsertObligationResult {
  linked: boolean;
  created: boolean;
  obligationId: string | null;
  conflict: boolean;
  reason?: string;
}

/** tenant + canonicalKey で同一 identity の並行 upsert を直列化する（xact 内でのみ有効）。 */
async function acquireObligationLock(
  tx: ObligationWriteTx,
  tenantId: string,
  canonicalKey: string,
): Promise<void> {
  // 2-int の advisory lock（namespace=tenant, key=canonicalKey）。hashtext は int4 を返す。
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`cfo:${tenantId}`}), hashtext(${canonicalKey}))`;
}

/**
 * canonicalKey（tenant 内一意）から obligation を find-or-create する。
 * 先に advisory lock を取っているので、find→create の間に他 tx が同 key を作らない。
 * 返り値の created は新規作成なら true。
 */
async function findOrCreateObligation(
  tx: ObligationWriteTx,
  params: {
    tenantId: string;
    namespace: CashflowObligationNamespace;
    identitySourceId: string;
    canonicalKey: string;
    direction: string;
    currency: string;
    amount: number;
    dueAt: Date | null;
    description: string;
  },
): Promise<{ obligationId: string; created: boolean }> {
  const existing = await tx.cashflowObligationAlias.findUnique({
    where: {
      tenantId_canonicalKey: { tenantId: params.tenantId, canonicalKey: params.canonicalKey },
    },
    select: { obligationId: true },
  });
  if (existing) return { obligationId: existing.obligationId, created: false };

  const obligation = await tx.cashflowObligation.create({
    data: {
      tenantId: params.tenantId,
      identityVersion: CASHFLOW_OBLIGATION_IDENTITY_VERSION,
      namespace: params.namespace,
      preferredCanonicalKey: params.canonicalKey,
      direction: params.direction,
      currency: params.currency,
      scheduledAmount: params.amount,
      remainingAmount: params.amount,
      dueAt: params.dueAt,
      description: params.description,
    },
    select: { id: true },
  });
  await tx.cashflowObligationAlias.create({
    data: {
      tenantId: params.tenantId,
      obligationId: obligation.id,
      identityVersion: CASHFLOW_OBLIGATION_IDENTITY_VERSION,
      namespace: params.namespace,
      sourceId: params.identitySourceId,
      canonicalKey: params.canonicalKey,
    },
  });
  return { obligationId: obligation.id, created: true };
}

/**
 * obligation に対し、同 tenant の別 identity（namespace, sourceId）を alias として追加する（無ければ）。
 * すでに存在する場合は何もしない（idempotent）。canonicalKey は resolver で生成する。
 */
async function ensureAlias(
  tx: ObligationWriteTx,
  params: {
    tenantId: string;
    obligationId: string;
    namespace: CashflowObligationNamespace;
    sourceId: string;
  },
): Promise<{ added: boolean; reason?: string }> {
  const identity = resolveCanonicalObligationIdentity(
    params.tenantId,
    params.namespace,
    params.sourceId,
  );
  if (!identity.ok) return { added: false, reason: identity.reason };
  const existing = await tx.cashflowObligationAlias.findUnique({
    where: { tenantId_canonicalKey: { tenantId: params.tenantId, canonicalKey: identity.key } },
    select: { obligationId: true },
  });
  if (existing) {
    // 別 obligation に既に割当済みなら衝突（統合しない・fail-safe）。
    if (existing.obligationId !== params.obligationId) return { added: false, reason: 'alias-collision' };
    return { added: false };
  }
  await tx.cashflowObligationAlias.create({
    data: {
      tenantId: params.tenantId,
      obligationId: params.obligationId,
      identityVersion: CASHFLOW_OBLIGATION_IDENTITY_VERSION,
      namespace: params.namespace,
      sourceId: params.sourceId,
      canonicalKey: identity.key,
    },
  });
  return { added: true };
}

/** FinanceEvent を obligation に link する（既に同一 obligation に link 済みなら no-op）。 */
async function linkEventToObligation(
  tx: ObligationWriteTx,
  tenantId: string,
  eventId: string,
  obligationId: string,
): Promise<void> {
  // tenant scope 付きで更新（cross-tenant link を app 層でも防ぐ。DB composite FK でも拒否される）。
  await tx.financeEvent.updateMany({
    where: { id: eventId, tenantId },
    data: { cashflowObligationId: obligationId },
  });
}

/**
 * direction / currency 競合を検出したら coverage_incomplete にする（推測で上書きしない）。
 * neutral 同士・neutral と有向は競合としない。
 */
async function flagConflictIfMismatch(
  tx: ObligationWriteTx,
  obligationId: string,
  incomingDirection: string,
  incomingCurrency: string,
): Promise<boolean> {
  const ob = await tx.cashflowObligation.findUnique({
    where: { id: obligationId },
    select: { direction: true, currency: true, lifecycleStatus: true },
  });
  if (!ob) return false;
  const directionConflict =
    ob.direction !== 'neutral' &&
    incomingDirection !== 'neutral' &&
    ob.direction !== incomingDirection;
  const currencyConflict = ob.currency !== incomingCurrency;
  if (directionConflict || currencyConflict) {
    if (ob.lifecycleStatus !== 'coverage_incomplete') {
      await tx.cashflowObligation.update({
        where: { id: obligationId },
        data: { lifecycleStatus: 'coverage_incomplete' },
      });
    }
    return true;
  }
  return false;
}

/**
 * produce 時の dual-write の入口。すでに作成済みの FinanceEvent を canonical obligation へ upsert & link する。
 * expected 以外の type / 未知 payment_expected / identity 生成不能は obligation を作らず {linked:false} を返す
 * （legacy FinanceEvent の挙動は変えない）。
 */
export async function upsertObligationForEvent(
  tx: ObligationWriteTx,
  input: ProducerObligationInput,
): Promise<UpsertObligationResult> {
  const identity = deriveProducerObligationIdentity(
    input.tenantId,
    input.type,
    input.sourceType,
    input.sourceId,
    input.eventId,
  );
  if (!identity.ok) {
    return { linked: false, created: false, obligationId: null, conflict: false, reason: identity.reason };
  }
  const currency = input.currency ?? 'JPY';
  await acquireObligationLock(tx, input.tenantId, identity.canonicalKey);
  const { obligationId, created } = await findOrCreateObligation(tx, {
    tenantId: input.tenantId,
    namespace: identity.namespace,
    identitySourceId: identity.identitySourceId,
    canonicalKey: identity.canonicalKey,
    direction: input.direction,
    currency,
    amount: input.amount,
    dueAt: input.dueAt,
    description: input.description ?? '',
  });
  let conflict = false;
  if (!created) {
    // 既存 obligation に別 event が合流するケース（PO の payment_expected + cashflow_expected 等）。
    // scheduledAmount は最初の書込みを正とし加算しない（同一債務の別表現なので二重計上しない）。
    conflict = await flagConflictIfMismatch(tx, obligationId, input.direction, currency);
  }
  await linkEventToObligation(tx, input.tenantId, input.eventId, obligationId);
  return { linked: true, created, obligationId, conflict };
}

/**
 * finalize（InvoiceCandidate → 正式 Invoice）時の alias 収束。
 * 既存の cand obligation に inv alias を追加し、preferred identity を inv に更新する。
 * 旧 cand alias は履歴のため削除しない（§12.3）。
 * candidate 側 obligation が無い（未 bridge）なら何もしない（推測で作らない）。
 */
export interface ConvergeResult {
  converged: boolean;
  obligationId: string | null;
  reason?: string;
}

export async function convergeCandidateToInvoice(
  tx: ObligationWriteTx,
  input: { tenantId: string; candidateId: string; invoiceId: string },
): Promise<ConvergeResult> {
  const candIdentity = resolveCanonicalObligationIdentity(input.tenantId, 'cand', input.candidateId);
  const invIdentity = resolveCanonicalObligationIdentity(input.tenantId, 'inv', input.invoiceId);
  if (!candIdentity.ok) return { converged: false, obligationId: null, reason: candIdentity.reason };
  if (!invIdentity.ok) return { converged: false, obligationId: null, reason: invIdentity.reason };

  await acquireObligationLock(tx, input.tenantId, invIdentity.key);
  const candAlias = await tx.cashflowObligationAlias.findUnique({
    where: { tenantId_canonicalKey: { tenantId: input.tenantId, canonicalKey: candIdentity.key } },
    select: { obligationId: true },
  });
  const invAlias = await tx.cashflowObligationAlias.findUnique({
    where: { tenantId_canonicalKey: { tenantId: input.tenantId, canonicalKey: invIdentity.key } },
    select: { obligationId: true },
  });

  if (!candAlias && !invAlias) {
    // candidate が obligation を作っていない（bridge 未経由など）。捏造しない。
    return { converged: false, obligationId: null, reason: 'no-candidate-obligation' };
  }
  if (candAlias && invAlias && candAlias.obligationId !== invAlias.obligationId) {
    // cand と inv が別々の obligation を指す → 統合を推測せず両方 coverage_incomplete（fail-safe）。
    await tx.cashflowObligation.updateMany({
      where: { tenantId: input.tenantId, id: { in: [candAlias.obligationId, invAlias.obligationId] } },
      data: { lifecycleStatus: 'coverage_incomplete' },
    });
    return { converged: false, obligationId: null, reason: 'alias-collision' };
  }
  const obligationId = candAlias?.obligationId ?? invAlias!.obligationId;
  if (!invAlias) {
    await tx.cashflowObligationAlias.create({
      data: {
        tenantId: input.tenantId,
        obligationId,
        identityVersion: CASHFLOW_OBLIGATION_IDENTITY_VERSION,
        namespace: 'inv',
        sourceId: input.invoiceId,
        canonicalKey: invIdentity.key,
      },
    });
  }
  // preferred identity を inv に更新（cand alias は保持）。
  await tx.cashflowObligation.update({
    where: { id: obligationId },
    data: { namespace: 'inv', preferredCanonicalKey: invIdentity.key },
  });
  return { converged: true, obligationId };
}

/** Invoice の obligation を alias（inv/invoiceId）経由で引く。 */
async function findObligationIdByInvoice(
  tx: ObligationLifecycleTx,
  tenantId: string,
  invoiceId: string,
): Promise<string | null> {
  const invIdentity = resolveCanonicalObligationIdentity(tenantId, 'inv', invoiceId);
  if (!invIdentity.ok) return null;
  const alias = await tx.cashflowObligationAlias.findUnique({
    where: { tenantId_canonicalKey: { tenantId, canonicalKey: invIdentity.key } },
    select: { obligationId: true },
  });
  return alias?.obligationId ?? null;
}

export interface LifecycleResult {
  updated: boolean;
  obligationId: string | null;
  lifecycleStatus?: ObligationLifecycleStatus;
}

/**
 * Invoice の入金・取消戻しに合わせて obligation の残額と lifecycle を同期する。
 * remaining = max(total - paidAmount, 0) を都度再計算するので、
 *  - 部分入金 → partially_settled（remaining>0）
 *  - 全額入金 → settled（remaining=0）
 *  - 入金取消（paidAmount 減少）→ remaining 増・open / partially_settled へ再 OPEN
 * を 1 関数で表す。void 済み obligation は復活させない。coverage_incomplete は保持する（fail-safe）。
 * obligation が無い Invoice は no-op（送付前に入金した等）。
 */
export async function settleObligationForInvoice(
  tx: ObligationLifecycleTx,
  input: { tenantId: string; invoiceId: string; total: number; paidAmount: number },
): Promise<LifecycleResult> {
  const obligationId = await findObligationIdByInvoice(tx, input.tenantId, input.invoiceId);
  if (!obligationId) return { updated: false, obligationId: null };
  const ob = await tx.cashflowObligation.findUnique({
    where: { id: obligationId },
    select: { lifecycleStatus: true },
  });
  if (!ob) return { updated: false, obligationId: null };
  if (ob.lifecycleStatus === 'void') return { updated: false, obligationId };

  const remaining = Math.max(input.total - input.paidAmount, 0);
  let status: ObligationLifecycleStatus;
  if (remaining <= 0) status = 'settled';
  else if (input.paidAmount > 0) status = 'partially_settled';
  else status = 'open';
  // coverage_incomplete は不確実フラグなので残額だけ更新し status は据え置く。
  const nextStatus: ObligationLifecycleStatus =
    ob.lifecycleStatus === 'coverage_incomplete' ? 'coverage_incomplete' : status;
  await tx.cashflowObligation.update({
    where: { id: obligationId },
    data: { remainingAmount: remaining, lifecycleStatus: nextStatus },
  });
  return { updated: true, obligationId, lifecycleStatus: nextStatus };
}

/** Invoice VOID に合わせて obligation を void にする（存在しなければ no-op）。 */
export async function voidObligationForInvoice(
  tx: ObligationLifecycleTx,
  input: { tenantId: string; invoiceId: string },
): Promise<LifecycleResult> {
  const obligationId = await findObligationIdByInvoice(tx, input.tenantId, input.invoiceId);
  if (!obligationId) return { updated: false, obligationId: null };
  await tx.cashflowObligation.update({
    where: { id: obligationId },
    data: { lifecycleStatus: 'void' },
  });
  return { updated: true, obligationId, lifecycleStatus: 'void' };
}

// ===== Backfill 用 primitive（既存 FinanceEvent を lineage を見て正本化する）=====

/** backfill が読む最小の FinanceEvent 形。 */
export interface BackfillEventRow {
  id: string;
  tenantId: string;
  type: string;
  sourceType: string | null;
  sourceId: string | null;
  direction: string;
  currency: string;
  amount: number;
  dueAt: Date | null;
  description: string | null;
  cashflowObligationId: string | null;
}

/** backfill が参照する lineage（tenant 内の candidate と invoice）。 */
export interface BackfillLineage {
  /** candidateId → 正式化済みなら invoiceId、未正式化なら null。tenant 内に実在するもののみ。 */
  candidateInvoiceById: Map<string, string | null>;
}

/** backfill 1 件の分類結果（Evidence 用）。 */
export type BackfillClassification =
  | 'purchase_order'
  | 'direct_invoice'
  | 'candidate_unformalized'
  | 'candidate_formalized'
  | 'unknown_cashflow_expected'
  | 'unknown_payment_expected'
  | 'orphan_candidate_inflow'
  | 'orphan_candidate_outflow'
  | 'missing_tenant'
  | 'missing_source'
  | 'not_expected_type'
  | 'already_linked';

export interface BackfillEventOutcome {
  classification: BackfillClassification;
  /** dry-run でない場合に新規 obligation を作ったか。 */
  createdObligation: boolean;
  /** dry-run でない場合に新規 alias を作ったか（convergence の cand→inv 追加も含む）。 */
  addedAlias: boolean;
  /** dry-run でない場合に event を link したか。 */
  linked: boolean;
  obligationId: string | null;
  /** identity 発行不能・skip 理由。 */
  reason?: string;
}

/**
 * backfill の per-event 分類のみ（DB を変更しない・dry-run と execute で共有）。
 * 正本化の対象／namespace／convergence の有無を決める。
 */
export function classifyBackfillEvent(
  event: BackfillEventRow,
  lineage: BackfillLineage,
): {
  classification: BackfillClassification;
  namespace?: CashflowObligationNamespace;
  identitySourceId?: string;
  /** formalized candidate のとき、収束のため追加する cand alias の sourceId。 */
  secondaryCandSourceId?: string;
} {
  if (!EXPECTED_CASHFLOW_TYPES.has(event.type)) return { classification: 'not_expected_type' };
  if (!event.tenantId) return { classification: 'missing_tenant' };
  const src = event.sourceType ?? '';
  const sid = event.sourceId ?? '';

  if (src === 'PurchaseOrder') {
    if (!sid) return { classification: 'missing_source' };
    return { classification: 'purchase_order', namespace: 'po', identitySourceId: sid };
  }
  if (src === 'Invoice') {
    if (!sid) return { classification: 'missing_source' };
    return { classification: 'direct_invoice', namespace: 'inv', identitySourceId: sid };
  }
  if (src === 'InvoiceCandidate') {
    if (!sid) return { classification: 'missing_source' };
    if (!lineage.candidateInvoiceById.has(sid)) {
      // orphan candidate（tenant 内に実在しない）。inflow は偽の余裕を避け skip、outflow は evt で保守計上。
      if (event.direction === 'inflow') return { classification: 'orphan_candidate_inflow' };
      return { classification: 'orphan_candidate_outflow', namespace: 'evt', identitySourceId: event.id };
    }
    const invoiceId = lineage.candidateInvoiceById.get(sid) ?? null;
    if (invoiceId) {
      // 正式化済み candidate → inv identity へ収束、cand alias も履歴として残す。
      return {
        classification: 'candidate_formalized',
        namespace: 'inv',
        identitySourceId: invoiceId,
        secondaryCandSourceId: sid,
      };
    }
    return { classification: 'candidate_unformalized', namespace: 'cand', identitySourceId: sid };
  }
  if (event.type === 'cashflow_expected') {
    return { classification: 'unknown_cashflow_expected', namespace: 'evt', identitySourceId: event.id };
  }
  // payment_expected で未知 source。
  return { classification: 'unknown_payment_expected' };
}

/**
 * backfill 1 件を正本化する（execute）。分類 → find-or-create obligation → (formalized なら cand alias 追加) → link。
 * すでに link 済みなら already_linked で何もしない（再実行 0 件）。
 */
export async function backfillObligationForEvent(
  tx: ObligationWriteTx,
  event: BackfillEventRow,
  lineage: BackfillLineage,
): Promise<BackfillEventOutcome> {
  if (event.cashflowObligationId) {
    return {
      classification: 'already_linked',
      createdObligation: false,
      addedAlias: false,
      linked: false,
      obligationId: event.cashflowObligationId,
    };
  }
  const cls = classifyBackfillEvent(event, lineage);
  if (!cls.namespace || !cls.identitySourceId) {
    // 正本化しない分類（skip）。
    return {
      classification: cls.classification,
      createdObligation: false,
      addedAlias: false,
      linked: false,
      obligationId: null,
      reason: cls.classification,
    };
  }
  const identity = resolveCanonicalObligationIdentity(event.tenantId, cls.namespace, cls.identitySourceId);
  if (!identity.ok) {
    return {
      classification: cls.classification,
      createdObligation: false,
      addedAlias: false,
      linked: false,
      obligationId: null,
      reason: identity.reason,
    };
  }
  await acquireObligationLock(tx, event.tenantId, identity.key);
  const { obligationId, created } = await findOrCreateObligation(tx, {
    tenantId: event.tenantId,
    namespace: cls.namespace,
    identitySourceId: cls.identitySourceId,
    canonicalKey: identity.key,
    direction: event.direction,
    currency: event.currency || 'JPY',
    amount: event.amount,
    dueAt: event.dueAt,
    description: event.description ?? '',
  });
  let addedAlias = false;
  if (!created) {
    await flagConflictIfMismatch(tx, obligationId, event.direction, event.currency || 'JPY');
  }
  if (cls.secondaryCandSourceId) {
    const aliasRes = await ensureAlias(tx, {
      tenantId: event.tenantId,
      obligationId,
      namespace: 'cand',
      sourceId: cls.secondaryCandSourceId,
    });
    addedAlias = aliasRes.added;
    // 正式化済みは preferred を inv に保つ（findOrCreateObligation が inv で作っているので既に inv）。
  }
  await linkEventToObligation(tx, event.tenantId, event.id, obligationId);
  return {
    classification: cls.classification,
    createdObligation: created,
    addedAlias,
    linked: true,
    obligationId,
  };
}
