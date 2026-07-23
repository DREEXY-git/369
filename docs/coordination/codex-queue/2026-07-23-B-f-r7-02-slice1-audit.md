---
chat: B
type: audit
target: F-R7-02 slice1 実装 / branch claude/f-r7-02-cashflow-canonical-v1（PR は本文参照）
push-to: codex/reaudit-B-cashflow
status: OPEN
---

# 【独立監査依頼｜B: 会計/資金繰り】F-R7-02 slice1（canonical cashflow selector）実装の監査

あなたの設計レビュー（`codex/reaudit-B-cashflow-f-r7-02-design`）の A' 案の thin slice を Claude が実装しました。
その実装を read-only で厳しく監査してください。main merge / PADN dispatch は不要。結果は docs/audit の
Markdown レポートとして `codex/reaudit-B-cashflow` に push（実害は severity 付き、無ければ PASS 明記）。
本番・DB・Secrets・外部送信・課金には触れない。docs-only。旧 verdict 流用禁止・現ブランチ head を実際に読む。

## 実装内容
1. 新規純関数 `packages/shared/src/cashflow-obligation.ts` の `selectCanonicalCashflowObligations(input)`:
   - 予定 FinanceEvent（cashflow_expected / payment_expected）を obligation key（`po:` / `inv:` / `cand:` / `evt:`）で
     グループ化し「1 債務 = 1 予定行」に正規化。
   - PO の cashflow_expected + payment_expected を 1 行に。直接/見積 Invoice の payment_expected 入金を取りこぼさない。
   - InvoiceCandidate→Invoice は `candidateInvoiceLinks` の lineage で 1 行に束ね、Invoice lifecycle を正本に。
   - Invoice は残額（total - paidAmount）で載せ、PAID/VOID/残額0 は除外。
   - 未知 source の payment_expected は二重計上回避で除外＋`coverageIncomplete`。cashflow_expected は canonical type なので額面通り残す。
   - direction 競合・lifecycle 欠落・未対応 type は `coverageIncomplete=true`（推測しない）。
   - 単体テスト `packages/shared/src/__tests__/cashflow_obligation.test.ts`（13件）。
2. `apps/web/lib/domains/finance/cashflow.ts` の `getCashflowShortageProjection` を両 type 取得＋selector 経由に変更。
   `candidateInvoiceLinks` と Invoice lifecycle を tenant スコープで取得。`coverageIncomplete = truncated || selection.coverageIncomplete` を返す。
3. 消費側（`reports/morning/page.tsx` / `finance/cashflow/page.tsx`）を `truncated`→`coverageIncomplete` の fail-safe 判定へ。

## 重点監査観点（実害のみ）
- [越境] events / invoiceCandidate / invoice の全クエリが tenantId スコープか。lineage/lifecycle 経由で別テナントが混ざらないか。
- [二重/欠落] PO 二重計上が本当に消えたか。直接 Invoice 入金が確実に載るか。candidate→invoice の二重が 1 行になるか。
- [安全側] 部分入金の残額計算・PAID/VOID 除外・lifecycle 欠落時の coverageIncomplete が、過大計上（偽の余裕＝危険方向）を生まないか。
- [fail-safe] coverageIncomplete のとき morning/cashflow が「ショートなし」を断定しないか（truncated 包含）。
- [設計採用条件] あなたが設計レビューで挙げた採用条件6点（payment_expected を正本にしない/lineage維持/残額/対称遷移/tenant+sourceType/不確実時に断定しない）のうち、
  この reader-only slice で満たせている項目と、producer 側 slice2 に残る項目を切り分けて指摘。
- [未対応の drift] `getCashflowUnifiedData` / `getCashflowBridgeData` の expected 側は本 slice では未切替。これが同一ページ内で矛盾を生むか、slice2 に回して良いか評価。
