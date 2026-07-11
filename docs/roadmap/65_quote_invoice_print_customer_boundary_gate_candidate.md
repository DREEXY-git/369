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
- [x] 敵対的レビュー3視点 → 指摘反映（§6 追補）
- [ ] CI 91/0 をログ本文で確認

## 6. 追補（敵対的レビュー3視点の結果と反映・2026-07-11）

実装 3662828 に対し独立レビュー3件（①権限ゲート・ABAC判定順 ②顧客可視性整合 ③E2E回帰）を実施。
③は「91=88+3 で正・回帰経路なし・新3件を落とす欠陥なし」。検出と反映:

| # | 深刻度 | 指摘 | 反映 |
|---|---|---|---|
| 1 | High | /deals 系4画面（一覧・カンバン・詳細・編集）が無ゲートで、見積の合計・粗利率・顧客名・deal 原価に全認証ロールが到達（quote:read 境界と WIP1 顧客境界の迂回） | 4画面に **deal:read ゲート**。顧客名は customer:read＋可視ラベルガード・select 縮小。詳細の見積カード（合計・粗利率）は **quote:read のみ取得・表示**。未表示だった lineItems（unitCost）の over-fetch を解消 |
| 2 | Medium | createQuote/createInvoice が customerId/dealId を無検証で受理（**他テナント ID の FK 接続**・不可視ラベル顧客の直接 POST） | 両 action で server 側検証を追加: 自テナント＋可視ラベルの場合のみ紐付け、それ以外は null に落とす（fail-closed） |
| 3 | Medium | fetch 前 assert への移動で、実在しない ID にも DataAccessLog（confidential_view/allow）が記録される偽陽性（任意文字列 entityId の注入も可能） | **envelope（id のみ select）先行＋ `skipViewLog`**: 実在時のみ confidential_view を記録。判定は notFound より先のまま（存在オラクルなし）。PolicyDecisionLog は常に記録（探査の検知は維持） |
| 4 | Medium | 請求宛先が顧客ラベル無ガード（ADMIN/EXTERNAL_EXPERT に STRICT_SECRET/EXECUTIVE_ONLY 顧客名が露出・quote 側と非対称） | **§2-4 の判断を改訂**: 請求の宛先にも customer:read＋可視ラベルガードを適用（詳細・印刷・一覧）。不可視は「宛先未設定」と区別不能でオラクルにならない |
| 5 | Medium | 同型のドロップダウン無フィルタが operations/events/new に残存 | 可視ラベルフィルタを適用 |
| 6 | Low | quotes/new・invoices/new の deals ドロップダウンが無フィルタ（title に顧客名が入る運用で露出） | 不可視ラベル顧客に紐づく案件を候補から除外 |
| 7 | Low | '原価' columnheader の部分一致が将来脆い | `exact: true` に変更 |
| 8 | Info | 拒否理由が 'label-denied' 等の生コードで表示（UI 日本語ルールと不整合） | AccessDenied に理由コード→日本語のマップを追加（未知コードはそのまま） |
| 9 | Medium(③) | 「fetch 前拒否」「存在オラクルなし」の e2e 実証が不足 | 実在しない ID でも同一拒否表示になるアサーションを追加（テスト3） |

### 記録のみ（scope 外・後続 WIP 候補）

- **deal の金額・原価・粗利は deal:read 配下**（EXTERNAL_PARTNER は deal:read 保持のため閲覧可）— RBAC 設計どおりだが、外部協力会社に deal 原価を見せる是非は WIP-6 で再判定。
- quote 側 RBAC 拒否の監査証跡なし（invoice 側は PolicyDecisionLog に deny が残る非対称）→ ページ基礎権限の deny ログ方針として WIP-6 で一括判断。
- EXTERNAL_EXPERT の機密アクセス理由登録フロー未実装（'sensitive-reason-required' が行き止まり）→ Phase 4 候補。
- DEPARTMENT_MANAGER が FINANCIAL_CONFIDENTIAL 非許可で請求を一切閲覧できない（labels.ts 設計由来）→ 意図確認を HOLD リストへ。
- golden-path-dashboard.ts / communications/actions.ts の server 内顧客名参照・customer-visibility ミラーの同期テスト → WIP-6。
- dunning.spec の STAFF テストが空振り合格のまま（既存）→ WIP-6 または e2e 整備で解消。
