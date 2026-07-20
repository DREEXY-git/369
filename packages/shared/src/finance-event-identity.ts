// 入金経路（PAYMENT_RECEIVED / RECEIVABLE_COLLECTED）の DomainEvent identity 契約の**正本**。
// 369-PADN-V5 修正版 Phase A（PA-BLK-1 解消・Issue #66 CONTROL_REVISION 29 / ID-1..ID-5）。
//
// 位相分離の原則（人間条件4・1 phase 1 軸）:
//  - Phase A = **意味論のみ**を本契約へ整合する（writer encoding は legacy FNV のまま変更しない）。
//    PAYMENT_RECEIVED を「invoice 単位（dedupe=''）」から「入金 request 単位（dedupe=requestKey）」へ、
//    RECEIVABLE_COLLECTED を dedupe='receivable-collected'（invoice 安定 dedupe）へ。
//  - Phase B（改訂 PR #57）= **encoding のみ**を canonical へ切替える（dedupe 値は本契約のまま不変）。
//    Phase B は本モジュールを import し、identity の独自再定義をしない。
//
// 純ロジック・DB 非依存・client 安全（node:crypto 等を使わない）。

import type { DomainEventType } from './events';

/**
 * 入金経路 DomainEvent の論理 identity（凍結契約）。
 * emit はこの契約関数（paymentReceivedIdentity / receivableCollectedIdentity）の戻り値でのみ
 * 表現し、「dedupe 無しでキーを計算する」誤実装（PA-BLK-1）を型レベルで再発不能にする。
 * 不変条件: aggregateType は eventType の関数（両イベントとも 'Invoice'）。
 */
export interface DomainEventIdentity {
  tenantId: string;
  eventType: DomainEventType;
  aggregateType: 'Invoice';
  aggregateId: string;
  /** 冪等化の追加識別子。PAYMENT_RECEIVED=client requestKey / RECEIVABLE_COLLECTED=定数。空文字は「dedupe なし」。 */
  dedupe: string;
}

/**
 * 入金 request の client 発行 idempotencyKey（= requestKey）の書式（cuid 互換・凍結）。
 * フォーム mount 時に 1 回発行し、server 側で本 RE により必ず検証する。
 */
export const PAYMENT_REQUEST_KEY_RE = /^c[a-z0-9]{20,32}$/;

/** RECEIVABLE_COLLECTED（未回収→回収済みの invoice 状態遷移）の安定 dedupe 定数（凍結・PR #57 実経路と byte 一致）。 */
export const RECEIVABLE_COLLECTED_DEDUPE = 'receivable-collected';

/**
 * PAYMENT_RECEIVED の identity（入金 request 単位）。
 * dedupe = client requestKey（成立 Payment ごとに高々 1 イベント）。
 */
export function paymentReceivedIdentity(input: {
  tenantId: string;
  invoiceId: string;
  requestKey: string;
}): DomainEventIdentity {
  return {
    tenantId: input.tenantId,
    eventType: 'PAYMENT_RECEIVED',
    aggregateType: 'Invoice',
    aggregateId: input.invoiceId,
    dedupe: input.requestKey,
  };
}

/**
 * RECEIVABLE_COLLECTED の identity（invoice の 非PAID→PAID 状態遷移・invoice 単位で高々 1）。
 */
export function receivableCollectedIdentity(input: {
  tenantId: string;
  invoiceId: string;
}): DomainEventIdentity {
  return {
    tenantId: input.tenantId,
    eventType: 'RECEIVABLE_COLLECTED',
    aggregateType: 'Invoice',
    aggregateId: input.invoiceId,
    dedupe: RECEIVABLE_COLLECTED_DEDUPE,
  };
}

/**
 * Payment の server-derived 単射 ID（ID-1・schema 変更なし）。
 *   'pay:' + encodeURIComponent(tenantId) + ':' + encodeURIComponent(requestKey)
 * - tenantId は必ずセッション actor 側の値を渡す（client 入力を使わない）＝ tenant-bound。
 * - encodeURIComponent 済み成分は ':' を含まないため (tenantId, requestKey) → id は**単射**。
 *   別 tenant が同一 requestKey を使っても ID が構造的に相違し、衝突・存在オラクル・横断 DoS にならない（ID-5）。
 * - 'pay:' prefix は cuid 形状（^c[a-z0-9]+$）と互いに素で、既存 @default(cuid()) 行と衝突しない。
 * 読み取り側は findUnique({ id: derivedId }) の後、**取得行の tenantId === actor.tenantId を必ず検証**
 * する（fail-closed・二重防御・ID-1）。
 */
export function derivePaymentRequestId(tenantId: string, requestKey: string): string {
  return `pay:${encodeURIComponent(tenantId)}:${encodeURIComponent(requestKey)}`;
}

/**
 * DomainEvent.payload.idem（無損失 identity metadata・ID-2）。
 * legacy FNV キーは dedupe を無損失に保持しないため、writer は必ず payload.idem を保存し、
 * legacy 行の既存性照合を「確率的（ハッシュ一致のみ）」ではなく「決定的（保存 identity の完全一致）」にする。
 * schema 変更（dedupe 列追加）は Human Gate 対象のため行わない（ID-2 で C 案 dedupe 列は不採用）。
 */
export interface DomainEventIdemMetadata {
  aggregateType: string;
  aggregateId: string;
  dedupe: string;
  /** この行を書いた writer の encoding（Phase A='legacy' / Phase B='canonical'）。 */
  enc: 'legacy' | 'canonical';
  v: 1;
}

/** payload.idem を組み立てる（writer 用・保存形の正本）。 */
export function makeIdemMetadata(input: {
  aggregateType: string;
  aggregateId: string;
  dedupe: string;
  enc: 'legacy' | 'canonical';
}): DomainEventIdemMetadata {
  return {
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    dedupe: input.dedupe,
    enc: input.enc,
    v: 1,
  };
}

/** 保存行の payload から idem metadata（dedupe）を安全に取り出す（無ければ null）。 */
export function readIdemMetadata(payload: unknown): { dedupe: string } | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const idem = (payload as { idem?: unknown }).idem;
  if (typeof idem !== 'object' || idem === null) return null;
  const dedupe = (idem as { dedupe?: unknown }).dedupe;
  if (typeof dedupe !== 'string') return null;
  return { dedupe };
}

/**
 * legacy（FNV）キーで保存された行が、指定 identity と**同一論理イベント**かの決定的照合（ID-2）。
 * 呼び出し側はスカラ列 (tenantId, idempotencyKey, eventType, aggregateType, aggregateId) で行を
 * 特定した上で、本関数により識別列の一致 ＋ dedupe の無損失一致を検証する。
 *  - payload.idem.dedupe があれば保存 dedupe と identity.dedupe の**完全一致**のみ既存とみなす。
 *  - 無ければ「契約導入前（7e50a04 以前）の legacy 行は全経路 dedupe 無し」という監査事実に基づき
 *    identity.dedupe === ''（dedupe なし emit）とだけ一致する。
 * FNV 衝突行は識別列の少なくとも 1 つが必ず不一致 → 既存として返らない（PA-BLK-4 の誤収束封鎖）。
 */
export function legacyRowMatchesIdentity(
  row: { eventType: string; aggregateType: string; aggregateId: string; payload?: unknown },
  identity: { eventType: string; aggregateType: string; aggregateId: string; dedupe: string },
): boolean {
  if (row.eventType !== identity.eventType) return false;
  if (row.aggregateType !== identity.aggregateType) return false;
  if (row.aggregateId !== identity.aggregateId) return false;
  const idem = readIdemMetadata(row.payload);
  if (idem) return idem.dedupe === identity.dedupe;
  return identity.dedupe === '';
}
