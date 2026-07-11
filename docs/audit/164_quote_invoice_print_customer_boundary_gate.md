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

## 残課題（本 WIP scope 外）

- /dashboard のページ基礎権限（商談金額の全認証ロール表示）→ WIP-5。
- Customer/Contact の join/include/select 全経路の機械監査 → WIP-6。
