# Audit 164: Quote/Invoice/Print の閲覧境界と Customer 露出の遮断（WIP-4）

- 日付: 2026-07-11
- 種別: 境界修正（見積/請求/印刷画面のページ基礎権限・ABAC 判定順・顧客 PII over-fetch）
- 対応 roadmap: `docs/roadmap/65_quote_invoice_print_customer_boundary_gate_candidate.md`
- ブランチ: `claude/ci-stage3-e2e-f1d-selectors-hikwbg`

## 変更ファイル

| ファイル | 変更 |
|---|---|
| `apps/web/lib/security/customer-visibility.ts` | 新規（WIP1 の可視ラベル判定を共有ヘルパへ抽出） |
| `apps/web/app/(app)/customers/page.tsx` | 局所定義をヘルパ利用に置換（挙動不変） |
| `apps/web/app/(app)/quotes/page.tsx` | quote:read ゲート |
| `apps/web/app/(app)/quotes/[id]/page.tsx` | quote:read ゲート・顧客名ガード・customer select 縮小 |
| `apps/web/app/(app)/quotes/new/page.tsx` | quote:create ゲート・ドロップダウン可視ラベルフィルタ |
| `apps/web/app/(app)/invoices/[id]/page.tsx` | ABAC を fetch 前へ移動・customer select 縮小 |
| `apps/web/app/(app)/invoices/new/page.tsx` | ドロップダウン可視ラベルフィルタ |
| `apps/web/app/print/quotes/[id]/page.tsx` | quote:read ゲート・顧客名ガード・select 縮小 |
| `apps/web/app/print/invoices/[id]/page.tsx` | FINANCIAL_CONFIDENTIAL ABAC を fetch 前に新設・select 縮小 |
| `apps/web/tests/e2e/quotes_boundary.spec.ts` | 新規 3 テスト（実在 ID での非表示証明を含む） |

## 検証

- ローカル電池・敵対的レビュー・CI の結果は追補に記録。

## 追補（レビュー反映と CI 確認・2026-07-11）

- 敵対的レビュー3視点で High 1（/deals 系4画面の無ゲート迂回）・Medium 4 ほかを検出し、
  fix commit `4a99935` で反映（詳細は roadmap65 §6 の表を正とする）。
- レビュー反映後のローカル電池: tsc 0 / lint 0 / unit 278/0 / safety 0 / secret 誤検知のみ。
- CI: run 29139153423（#162・stage1 success / stage3_e2e success）・head 4a99935。
  ログ本文で `91 passed (1.3m)`・失敗 0 を確認（quotes_boundary 3件を含む）。
  workflow ファイル未変更のため封印 env は run #160 での確認と同一。**WIP-4 クローズ。**

## fix commit（4a99935）追加変更ファイル

| ファイル | 変更 |
|---|---|
| `apps/web/app/(app)/deals/{page,kanban/page,[id]/page,[id]/edit/page}.tsx` | deal:read ゲート・顧客名ガード・select 縮小・見積カードの quote:read 化 |
| `apps/web/app/(app)/quotes/actions.ts`・`invoices/actions.ts` | customerId/dealId の server 側検証（テナント・可視ラベル） |
| `apps/web/lib/security/policy.ts` | assertCanViewConfidential に skipViewLog オプション |
| `apps/web/app/(app)/invoices/[id]/page.tsx`・`app/print/invoices/[id]/page.tsx` | envelope 先行＋skipViewLog・宛先の可視ラベルガード |
| `apps/web/app/(app)/invoices/page.tsx` | 宛先ガード・select 縮小 |
| `apps/web/app/(app)/operations/events/new/page.tsx`・`quotes/new`・`invoices/new` | ドロップダウン/案件候補の可視ラベルフィルタ |
| `apps/web/components/access-denied.tsx` | 拒否理由コードの日本語化 |
| `apps/web/tests/e2e/quotes_boundary.spec.ts` | 存在オラクル不在の検証・exact 化 |

## 残課題（本 WIP scope 外）

- /dashboard のページ基礎権限（商談金額の全認証ロール表示）→ WIP-5。
- Customer/Contact の join/include/select 全経路の機械監査 → WIP-6。
