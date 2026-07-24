// F-R7-02 slice 1: 予定キャッシュフローの canonical selector（純関数・DB非依存）。
// Codex 独立設計レビュー（reaudit-B-cashflow-f-r7-02-design）の A' 案の thin slice。
//
// 目的:
//  - 二重計上を止める: PurchaseOrder は cashflow_expected と payment_expected の両方で表現されるため、
//    両 type を単純 union すると支払が二重になる（偽のショート）。
//  - 取りこぼしを止める: 直接/見積由来 Invoice の入金は payment_expected のみで表現され、
//    cashflow_expected だけ読む現行実装では欠落する（過少計上）。
//  - InvoiceCandidate→Invoice は同一債権でも source identity が変わる（candidate.id vs invoice.id）ため、
//    lineage で 1 行に束ねる。
//
// producer/schema は変えず、reader 側で「1 債務 = 1 予定行」に正規化する移行アダプタ。
// 不確実（未知 source の payment_expected / lifecycle 欠落 / direction 競合 / 呼び出し側の打切り）は
// coverageIncomplete=true を返し、呼び出し側が「資金ショートなし」を断定しないための材料にする
// （fail-safe・金額を推測で埋めない・捏造しない）。

const EXPECTED_CASHFLOW_TYPES = new Set(['cashflow_expected', 'payment_expected']);
// Invoice が終端（完済/無効）なら予定から除外。PAID/VOID は producer 側で posted/ignored になり
// EXPECTED status filter でも落ちるが、defense-in-depth で lifecycle 側でも除外する。
const INVOICE_TERMINAL_STATUS = new Set(['PAID', 'VOID']);

// FIN-01（P5-FIN-001 §12.1）: canonical obligation identity の versioned encoding。
// identity は tenant 境界を含み、正本 ID（PO/Invoice/Candidate/Event）から決定論的に生成する。
// - namespace は po / inv / cand / evt の 4 種のみ。
// - encoding は JSON.stringify(["cashflow-obligation","v1",tenantId,namespace,sourceId])。
//   構造化された配列 encoding のため raw delimiter の連結は使わず、区切り文字混入
//   （delimiter injection）で別債務が同一 identity に化けない。
// - amount / dueAt / description / direction / lifecycle は identity の構成要素にしない
//   （金額・期日・表示名の一致では identity を導出しない）。
// - "v1" version により将来の identity 形式変更を後方互換で扱う（FIN-02 / FIN-03 へ接続）。

/** canonical obligation identity の namespace（正本 ID の種類）。 */
export type CashflowObligationNamespace = 'po' | 'inv' | 'cand' | 'evt';

/** canonical obligation identity の version。将来の形式変更を後方互換で扱う。 */
export const CASHFLOW_OBLIGATION_IDENTITY_VERSION = 'v1';

/**
 * identity resolver の結果。生成不能（空 tenantId / 空 sourceId）は throw せず・推測で成功扱いにせず、
 * `{ ok: false, reason }` で明示する（P5-FIN-001 §12.2 失敗契約）。
 */
export type CanonicalObligationIdentityResult =
  | { ok: true; key: string }
  | { ok: false; reason: string };

/**
 * canonical obligation identity（versioned・tenant 込み・決定論的）を導出する。
 * P5-FIN-001 §12.1 の encoding を確定値として実装する。
 *
 * - 同じ tuple（tenantId / namespace / sourceId）は常に同じ key、異なる tuple は必ず異なる key。
 * - `tenantId` / `sourceId` が空文字（および runtime 上の null / undefined）なら identity を発行せず
 *   `{ ok: false, reason }` を返す（fail-closed）。tenant 越境・injection を identity 化しない。
 * - trim しない・Unicode 正規化しない・raw delimiter の連結を使わない。
 */
export function resolveCanonicalObligationIdentity(
  tenantId: string,
  namespace: CashflowObligationNamespace,
  sourceId: string,
): CanonicalObligationIdentityResult {
  // 空 tenantId は tenant 越境防止のため identity 非発行（fail-closed）。
  // runtime の null / undefined も string でない値として拒否する（AC #7: 空 / null / 未指定）。
  if (typeof tenantId !== 'string' || tenantId === '') {
    return { ok: false, reason: 'empty-tenantId' };
  }
  // 空 sourceId は正本 ID を欠くため identity 非発行（fail-closed）。
  if (typeof sourceId !== 'string' || sourceId === '') {
    return { ok: false, reason: 'empty-sourceId' };
  }
  // 構造化配列を JSON.stringify で encode。文字列 escape が曖昧さを消し、区切り文字混入を無効化する。
  const key = JSON.stringify([
    'cashflow-obligation',
    CASHFLOW_OBLIGATION_IDENTITY_VERSION,
    tenantId,
    namespace,
    sourceId,
  ]);
  return { ok: true, key };
}

export interface RawCashflowEvent {
  id: string;
  type: string; // 'cashflow_expected' | 'payment_expected' | ...
  sourceType: string | null;
  sourceId: string | null;
  direction: string; // 'inflow' | 'outflow' | 'neutral'
  amount: number;
  dueAt: Date | null;
  description: string | null;
}

export interface InvoiceLifecycleInput {
  id: string;
  status: string; // InvoiceStatus: DRAFT/ISSUED/SENT/PARTIALLY_PAID/PAID/OVERDUE/VOID
  total: number;
  paidAmount: number;
}

export interface CandidateRow {
  id: string;
  /** 正式化済みなら invoice.id、未正式化なら null。tenant 内に実在する candidate のみ渡す。 */
  invoiceId: string | null;
}

export interface CanonicalCashflowRow {
  /** 論理債務 identity（versioned canonical key＝resolveCanonicalObligationIdentity の JSON tuple）。 */
  key: string;
  direction: string; // 'inflow' | 'outflow'
  amount: number;
  dueAt: Date | null;
  description: string | null;
}

export interface CashflowIdentityConflict {
  key: string;
  eventIds: string[];
  reason: string;
}

export interface CanonicalCashflowSelection {
  rows: CanonicalCashflowRow[];
  conflicts: CashflowIdentityConflict[];
  /** 配置できなかった event 数（未知 source の payment_expected 等）。 */
  unsupportedCount: number;
  /** true のとき「資金ショートなし」を断定してはならない（打切り/欠落/競合/未知）。 */
  coverageIncomplete: boolean;
}

export interface SelectCanonicalCashflowInput {
  /**
   * FIN-01（P5-FIN-001 §12.1）: canonical obligation identity の必須構成要素＝tenant 境界。
   * 全 event はこの tenant にスコープ済みとして扱い、identity は tenantId 込みで発行する。
   * 空 / null / undefined は identity 非発行（fail-closed）＝該当 event は coverageIncomplete で除外。
   */
  tenantId: string;
  events: RawCashflowEvent[];
  invoices: InvoiceLifecycleInput[];
  /** tenant 内に実在する InvoiceCandidate（未正式化含む）。ここに無い candidate source は orphan として扱う（B-S1-01）。 */
  candidates: CandidateRow[];
}

interface ObligationGroup {
  key: string;
  invoiceId: string | null;
  events: RawCashflowEvent[];
}

/**
 * 予定 FinanceEvent（cashflow_expected / payment_expected）を「1 債務 = 1 予定行」に正規化する。
 * - obligation key でグループ化することで、PO の 2 event と candidate→invoice の 2 表現を自然に 1 行へ束ねる。
 * - Invoice 由来の債務は Invoice lifecycle を正本とし、残額（total - paidAmount）で載せる。PAID/VOID/残額0は除外。
 * - cashflow_expected は canonical type なので未知 source でも額面通り残す（過少計上を避ける）。
 *   payment_expected の未知 source は cashflow_expected と二重かもしれず配置不能 → 除外し coverageIncomplete。
 */
export function selectCanonicalCashflowObligations(input: SelectCanonicalCashflowInput): CanonicalCashflowSelection {
  const invoiceById = new Map(input.invoices.map((i) => [i.id, i]));
  const candidateById = new Map(input.candidates.map((c) => [c.id, c]));

  const groups = new Map<string, ObligationGroup>();
  const conflicts: CashflowIdentityConflict[] = [];
  let unsupportedCount = 0;
  let coverageIncomplete = false;

  for (const e of input.events) {
    if (!EXPECTED_CASHFLOW_TYPES.has(e.type)) {
      unsupportedCount += 1;
      coverageIncomplete = true;
      continue;
    }
    const src = e.sourceType ?? '';
    const sid = e.sourceId ?? '';
    // 正本 ID から identity の (namespace, sourceId) を導出する（§12.3 sourceType 解決規則）。
    // 金額・期日・表示名では導出しない。identity 生成は resolver に委譲し、失敗は fail-closed で除外する。
    let namespace: CashflowObligationNamespace;
    let identitySourceId: string;
    let invoiceId: string | null = null;
    if (src === 'PurchaseOrder' && sid) {
      namespace = 'po';
      identitySourceId = sid;
    } else if (src === 'Invoice' && sid) {
      namespace = 'inv';
      identitySourceId = sid;
      invoiceId = sid;
    } else if (src === 'InvoiceCandidate' && sid) {
      const cand = candidateById.get(sid);
      if (!cand) {
        // B-S1-01: tenant 内に candidate が実在しない（削除済み/別tenant source）→ 金額を推定しない。
        // inflow は false-safe（偽の余裕）を避けて除外、outflow は保守的に個別計上。両者 coverageIncomplete。
        coverageIncomplete = true;
        if (e.direction === 'inflow') {
          unsupportedCount += 1;
          continue;
        }
        namespace = 'evt';
        identitySourceId = e.id;
      } else if (cand.invoiceId) {
        namespace = 'inv'; // 正式化済み candidate は invoice 債務の alias（同一 identity へ収束）
        identitySourceId = cand.invoiceId;
        invoiceId = cand.invoiceId;
      } else {
        namespace = 'cand';
        identitySourceId = sid;
      }
    } else if (e.type === 'cashflow_expected') {
      // canonical projection 型。未知 source でも dedup 対象にならないので額面通り個別に残す。
      namespace = 'evt';
      identitySourceId = e.id;
    } else {
      // payment_expected で source 不明 → cashflow_expected と二重の可能性があり配置不能。
      // 二重計上を避けて除外し、coverageIncomplete で「ショートなし」断定を禁じる。
      unsupportedCount += 1;
      coverageIncomplete = true;
      continue;
    }
    const identity = resolveCanonicalObligationIdentity(input.tenantId, namespace, identitySourceId);
    if (!identity.ok) {
      // identity 生成不能（空 tenantId / 空 sourceId）は推測せず fail-closed で除外し coverageIncomplete。
      unsupportedCount += 1;
      coverageIncomplete = true;
      continue;
    }
    const key = identity.key;
    let g = groups.get(key);
    if (!g) {
      g = { key, invoiceId, events: [] };
      groups.set(key, g);
    }
    if (invoiceId && !g.invoiceId) g.invoiceId = invoiceId;
    g.events.push(e);
  }

  const rows: CanonicalCashflowRow[] = [];
  for (const g of groups.values()) {
    // direction の一貫性（neutral を除いて 1 種類でなければ競合）
    const dirs = new Set(g.events.map((e) => e.direction).filter((d) => d === 'inflow' || d === 'outflow'));
    if (dirs.size === 0) {
      conflicts.push({ key: g.key, eventIds: g.events.map((e) => e.id), reason: 'direction-missing' });
      coverageIncomplete = true;
      continue;
    }
    if (dirs.size > 1) {
      conflicts.push({ key: g.key, eventIds: g.events.map((e) => e.id), reason: 'direction-conflict' });
      coverageIncomplete = true;
      continue;
    }
    const direction = [...dirs][0]!;

    // cashflow_expected を優先（canonical type）。無ければ最初の event。dueAt は query 窓を通った event 値を使う。
    const preferred = g.events.find((e) => e.type === 'cashflow_expected') ?? g.events[0]!;
    let amount = preferred.amount;
    const dueAt = preferred.dueAt;
    const description = preferred.description;

    if (g.invoiceId) {
      const inv = invoiceById.get(g.invoiceId);
      if (!inv) {
        // B-S1-01: 参照先 Invoice の lifecycle が取れない → 残額・完済状態が不明。
        // inflow は原額を載せると偽の余裕（false-safe＝危険方向）になるため除外。outflow は保守的に残す。両者 coverageIncomplete。
        coverageIncomplete = true;
        if (direction === 'inflow') continue;
      } else {
        if (INVOICE_TERMINAL_STATUS.has(inv.status)) continue; // PAID/VOID は予定から除外
        const remaining = Math.max(inv.total - inv.paidAmount, 0);
        if (remaining <= 0) continue; // 実質完済
        amount = remaining; // 部分入金済みは残額だけを予定に載せる（過大計上を防ぐ）
      }
    }

    if (!(amount > 0)) continue;
    rows.push({ key: g.key, direction, amount, dueAt, description });
  }

  return { rows, conflicts, unsupportedCount, coverageIncomplete };
}
