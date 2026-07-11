# 65. Quote/Invoice/Print の閲覧境界と Customer 露出の遮断（WIP-4）— 設計＋Gate（Candidate）

- 日付: 2026-07-11
- 対応 audit: `docs/audit/164_quote_invoice_print_customer_boundary_gate.md`
- 前提: **WIP-3 CI green 確認済み**（run 29138214775 #161・ログ本文で `88 passed (1.3m)` / 0 failed・head 96eec33・workflow ファイル未変更のため封印 env は #160 と同一）
- Function ID binding（`ATOMIC_LEDGER_SYNC_PENDING`）: C05-見積系・C06-請求系・C02-顧客参照系

## 1. read-only 実査結果（実装前）

| 経路 | 実査時の状態 | 判定 |
|---|---|---|
| `/quotes`（一覧） | `requireUser` のみ。合計・粗利率・値引きを全認証ロールに表示 | ページ基礎権限欠落 |
| `/quotes/[id]`（詳細） | `requireUser` のみ。原価（unitCost）・粗利・顧客名（`deal.customer` を **include で全列** over-fetch） | ページ基礎権限欠落＋PII over-fetch |
| `/quotes/new` | `requireUser` のみ。顧客ドロップダウンが **label 無フィルタ**（閲覧不可ラベルの顧客名を候補に露出） | ゲート欠落＋WIP1 境界の迂回 |
| `/invoices`（一覧） | `assertCanViewConfidential`（FINANCIAL_CONFIDENTIAL・fetch 前）✓ | 適合（変更なし） |
| `/invoices/[id]` | **fetch-then-assert**（lineItems/payments/customer 全列/receivable を取得してから判定） | 判定順の欠陥＋PII over-fetch |
| `/invoices/new` | invoice:create＋finance:read ゲート済みだが顧客ドロップダウンが label 無フィルタ | ドロップダウンのみ欠落 |
| `/print/quotes/[id]` | `requireUser` のみ。顧客 include 全列＋`customerId` 直接フォールバック fetch も全列 | ゲート欠落＋over-fetch |
| `/print/invoices/[id]` | `requireUser` のみ。請求詳細と同じ内容（金額・宛先）が ABAC なしで表示 | **境界欠落（最重要）** |

## 2. 設計判断

1. **見積ドメインの金額（原価・粗利・値引き）は `quote:read` 配下**（finance:read ではない）。STAFF の見積作成・値引き承認ルールを含む業務フローの構成データであり、実財務データ（請求・入金・資金繰り）と軸が異なる。roadmap64 §2-8 で予告した判断の明文化。よって /quotes・/quotes/[id]・/print/quotes/[id] のページ基礎権限は quote:read（作成フォームは quote:create）。外部ロール（EXTERNAL_PARTNER/EXPERT）・AI_ASSISTANT は遮断され、STAFF/READ_ONLY/AI_AGENT の既存業務は不変。
2. **請求は FINANCIAL_CONFIDENTIAL の ABAC を fetch 前に判定**（/invoices 一覧の既存パターンに統一）。label が固定のため行の取得なしで判定でき、拒否閲覧者には ID の存在有無も返さない。/invoices/[id] を fetch-then-assert から並べ替え、/print/invoices/[id] に同じ assert を新設（purpose: 請求書の印刷表示）。
3. **顧客名の表示は CRM 閲覧境界（WIP1）に従属**: `customer:read` ＋ 可視ラベル（canAccessLabel ∧ 非マネージャは高機密ラベル不可）のときのみ表示。判定を `lib/security/customer-visibility.ts` に共有ヘルパとして抽出し（WIP1 の customers 一覧の局所定義を移設・使用箇所は挙動不変）、quotes 詳細・print/quotes の宛先ガード、quotes/new・invoices/new のドロップダウン `label: { in: visibleCustomerLabels }` フィルタに適用。
4. **請求の宛先（invoice.customer.name）は請求書の構成要素**として FINANCIAL_CONFIDENTIAL の assert 通過者に表示する（追加の顧客ラベルガードは付けない・判断の記録）。取得は name のみに縮小（連絡先等 PII の over-fetch 解消）。
5. **over-fetch 解消**: 顧客 include を `select: { name, label }`（宛先＋可視判定）または `select: { name }`（請求）に縮小。

## 3. 不変条件

- RBAC 定義・機密ラベル許可表・schema・seed・Server Action の書込系フロー変更なし。
- 承認フロー（値引き承認・送信承認）・外部送信ゲートに変更なし。
- e2e は件数・金額の値に依存しない。

## 4. テスト

- e2e 追加 `quotes_boundary.spec.ts` 3件:
  1. 社長: /quotes → 詳細（原価列・粗利率）→ /print/quotes（御見積書）到達。
  2. 担当者: /quotes・詳細が従前どおり閲覧可（quote:read ドメイン判断の回帰）。
  3. 担当者: 実在する請求 ID への直接アクセス（詳細・印刷とも）が fetch 前 ABAC で拒否され、金額が描画されない（社長で ID 取得→担当者で検証・存在データでの非表示証明）。
- 期待 CI: `Running 91 tests` → `91 passed / 0 failed`。

## 5. Gate 判定

- [x] /quotes 系 3 画面に quote:read（new は quote:create）をデータ取得前に適用
- [x] /invoices/[id]・/print/invoices/[id] の ABAC を fetch 前に統一
- [x] 顧客ドロップダウン 2 箇所に可視ラベルフィルタ（WIP1 境界の迂回を閉鎖）
- [x] 顧客名の宛先表示に customer:read＋可視ラベルガード（quotes 詳細・print/quotes）
- [x] 顧客 over-fetch 解消（全列 include → name/label select）
- [ ] ローカル電池 green（tsc / lint / unit / safety / secret）
- [ ] 敵対的レビュー3視点 → 指摘反映
- [ ] CI 91/0 をログ本文で確認
