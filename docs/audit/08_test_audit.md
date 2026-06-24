# 08 — テスト監査

## 現状（6ファイル / 約51 unit）

| ファイル | 種別 | 対象 |
|---|---|---|
| `packages/shared/src/__tests__/rbac.test.ts` | unit | RBAC 判定 |
| `packages/shared/src/__tests__/rules.test.ts` | unit | finance/inventory/leads 等の純ロジック |
| `packages/ai/src/__tests__/tasks.test.ts` | unit | FakeLLM タスク |
| `packages/integrations/src/__tests__/integrations.test.ts` | unit | maps/email/fetcher |
| `packages/db/src/__tests__/integration.itest.ts` | integration(要DB) | DB 結合 |
| `apps/web/tests/e2e/smoke.spec.ts` | e2e | スモーク |

`pnpm test` は 51 件 green（純ロジック/FakeLLM）。

## 要件 §19 との差分（未整備の代表）

- **Unit**: ABAC / tenant isolation / data masking / **prompt injection detector** / quote gross margin / **signage estimate** / invoice overdue / cashflow forecast / journal suggestion / inventory reservation conflict / EC order accounting event / suppression list / approval gate / knowledge chunking / **retrieval permission filtering** / location access permission / recording consent
- **Integration**: quote→contract→invoice→payment フロー / receipt OCR→仕訳 / meeting→minutes→task / knowledge save+search / outreach 承認→送信(+suppression遮断) / inventory 予約衝突 / EC order→在庫減/会計イベント / **cross tenant access denied**
- **E2E**: 主要業務フロー、承認フロー、staff が HR機密を見られない、AIが未許可データにアクセスできない
- **Security**: SQLi/XSS/CSRF/SSRF/不正MIME/過大ファイル/Webhook不正署名/prompt injection/RAG poisoning/外部送信は承認必須/位置・録音アクセスのログ

## 結論

**安全性・業務クリティカルパスのテストがほぼ皆無**。Phase 8 で security/integration/e2e を集中整備。まずは「クロステナント拒否」「外部送信は承認必須」「機密ラベル拒否」の3本を最優先で追加すべき。

## Phase 1-2 更新（2026-06-23）

- 追加 unit（DB非依存・`pnpm test`）: policy(14)/consent(6)/events(4)/webhook(5)/retention(4)/approval(3) = **+36**。合計 **85 passed**。
- 追加 integration（要DB・`pnpm --filter @hokko/db test:integration`）: `p0_foundations.itest.ts`（イベント冪等/クロステナント分離/同意付与→撤回/ポリシー deny 記録）= 4 tests。**14 passed**。
- カバー: ABAC allow/deny、HR機密拒否、AI不正参照拒否、位置/録音の同意必須、営業時間外拒否、外部送信/エクスポート承認必須、同意撤回ブロック、リテンション失効、冪等防止、Webhook署名/リプレイ。
- 残: e2e（承認フロー/権限分離の画面操作）、SSRF/XSS/CSRF の自動テスト。

## Phase 1-3 更新（2026-06-24）

- 追加 unit（`policy_rollout.test.ts`）: 承認ゲート(export/external/highAI)、ABAC(invoice deny staff / finance allow admin・owner)、outbox backoff = **+7** → 合計 **92 passed**。
- 追加 integration（`p1_3_outbox_jobrun.itest.ts`）: JobRun ライフサイクル(2)/Outbox 配送(delivered)/失敗→retry＋WebhookDelivery/同意×ポリシー(location allow・deny) = **+6** → 合計 **20 passed**。
- 残: e2e（権限分離・承認フロー画面操作）、SSRF/XSS/CSRF。

## Phase 1-4 更新（2026-06-24）

- 追加 unit: ai-safety(11: injection/pii/toolperm/runSafetyChecks)、growth(5: 型/カテゴリ/DXインパクト/集計)、growth_marketing(3: 権限/承認非送信/優先度) = **+19** → 合計 **111 passed**。
- 追加 integration（`p1_4_growth.itest.ts`）: 成長台帳記録＋集計、テナント分離、DX診断→改善機会(優先度計算)、マーケ資産→承認(非送信) = **+4** → 合計 **24 passed**。
- カバー: 命令注入検出、PIIマスク、AIツール権限、DXインパクト計算、成長集計、承認なし送信不可、tenant分離。

## Phase 1-5 更新（2026-06-24）

- 追加 unit: operations(8: 稼働率/可用性/粗利率/運用分類/成長種別)、multimodal(6: TextAI/OCR/Voice Fake) = **+14** → 合計 **125 passed**。
- 追加 integration（`p1_5_ai_safety.itest.ts`）: AISafetyLog 各チェック記録（injection/pii_mask/tool_permission）、AIOutput 標準保存（inputHash/safetyFlags/confidence/model）、tenant分離 = **+4** → 合計 **28 passed**。
- 追加 e2e（`security.spec.ts`）: 注入クエリ無害化（500なし）、誤検知なし、AI安全ログの権限分離（社長可・スタッフ不可）。CI/実環境で実行（本サンドボックスは chromium DL 不可）。

## Phase 1-6 更新（2026-06-24）— Operations OS

- 追加 unit（`operations.test.ts` 拡張）: 在庫移動効果の写像（receive/reserve/dispatch/return/damage/maintenance…→status/condition）、移動→成長種別が全て operations、大幅調整判定、危険操作の承認要否（inventory_adjust 閾値・inventory_force_release/damage_charge_finalize 常時）= **+6** → 合計 **131 passed**。
- 追加 integration（`p1_6_operations.itest.ts`）: 入庫→InventoryMovement＋ProductAsset数量増＋GrowthEvent / 出庫→status out・返却→available＋Growth / リース予約＋商品追加＋重複検知 / イベント案件→割当→原価→粗利計算→EventGrossProfitSnapshot＋Growth / tenant分離 / 危険操作の承認必須 = **+6** → 合計 **34 passed**。
- 追加 e2e（`operations.spec.ts`）: /operations 表示、イベント案件作成、在庫移動記録、スタッフは原価/粗利の機密情報を閲覧不可（権限分離）。CI/実環境で実行。
- カバー: 在庫状態の単一真実源（InventoryMovement）、案件粗利、可用性/重複、運用 GrowthEvent、機密（原価/粗利）の権限分離、危険操作の承認。
- 残: e2e の実ブラウザ実行（環境）、強制解除/破損請求確定の承認後実処理、SSRF/XSS/CSRF 自動テスト。

## Phase 1-7 更新（2026-06-24）— Operations 実行管理

- 追加 unit（`operations.test.ts` 拡張）: 棚卸差異/大幅判定、発注提案、物流状態遷移（done終端）、物流完了→成長種別、人件費合計、リスク重大度、発注/棚卸の承認閾値、`canExecuteApproval`（status/二重実行/失効）、新 GrowthEvent 種別 = **+8** → 合計 **139 passed**。
- 追加 integration（`p1_7_operations_exec.itest.ts`）: 承認済み inventory_adjust 実行＋**二重実行防止（原子クレーム）**、承認済み force_release、Stocktake 作成→差異→小差異反映＋大幅差異承認、Reorder 候補抽出、PurchaseOrder→入庫→receive で在庫増、Logistics 完了→Growth、EventStaff→EventCost反映、Risk high/critical 集計、tenant分離 = **+10** → 合計 **44 passed**。
- 追加 e2e（`operations_exec.spec.ts`）: 棚卸/発注/物流/Operations実行ページ表示、イベント詳細の人員/リスク/物流表示、スタッフは発注金額の機密を閲覧不可。CI/実環境で実行。
- カバー: 承認後実行の冪等性、危険操作の承認、運用イベントの Growth/Domain 接続、機密（原価/単価/人件費/粗利）の権限分離。
- 残: e2e 実ブラウザ実行（環境）、棚卸大幅差異の承認後反映導線、SSRF/XSS/CSRF。

## Phase 1-8 更新（2026-06-24）— Finance Bridge

- 追加 unit（`finance_bridge.test.ts`）: financeEventDirection、journalCandidateFor、invoiceCandidateTotals（税計算）、summarizeFinanceEvents（入金/支払見込）、journal_finalize/invoice_send/payment_execute の承認必須、finance.* 成長種別 = **+6** → 合計 **145 passed**。
- 追加 integration（`p1_8_finance_bridge.itest.ts`）: EventProject→FinanceEvent/JournalCandidate/InvoiceCandidate、PurchaseOrder→FinanceEvent/JournalCandidate、Damage→InvoiceCandidate、Cashflow集計、承認後実行（stocktake_adjust＋二重実行防止/purchase_order_issue）、journal_finalize/invoice_send承認必須、tenant分離 = **+8** → 合計 **52 passed**。
- 追加 e2e（`finance_bridge.spec.ts`）: /finance/bridge 表示、イベント→ブリッジ作成、仕訳/請求候補一覧、スタッフは機密不可視、operations-actions 統合。CI/実環境で実行。
- カバー: Operations→Finance の金額フロー、候補（正式と分離）、資金繰り見込み、承認必須、機密の権限分離。

## Phase 1-9 更新（2026-06-24）— 候補→正式化

- 追加 unit（`finance_formalize.test.ts`）: journalEntryLinesFor/isBalancedJournal/canFormalizeJournal、inferAccountType（売上原価=expense の優先順位）、invoice totals、新 growth/domain 種別 = **+6** → 合計 **151 passed**。
- 追加 integration（`p1_9_finance_formalize.itest.ts`）: JournalCandidate→JournalEntry(複式balance)＋posted/journalEntryId、**二重実行防止（claim＋status guard）**、InvoiceCandidate→Invoice(ISSUED)/LineItem/Receivable＋sent/invoiceId、cashflow集計、journal_finalize/invoice_send承認必須、tenant分離 = **+6** → 合計 **58 passed**。
- 追加 e2e（`finance_formalize.spec.ts`）: /finance/cashflow の Bridge予定セクション、候補一覧の正式化導線、スタッフ機密不可視。CI/実環境で実行。
- カバー: 候補→正式の複式整合・冪等・権限分離・資金繰り接続。

## Phase 1-10 更新（2026-06-24）— 請求送信＋入金消込

- 追加 unit（`finance_payment.test.ts`）: invoiceOutstanding/invoiceStatusAfterPayment/receivableStatusAfterPayment、canSendInvoice/isInvoiceSent（二重送信防止）、summarizeCashflowActualVsExpected（予定/実績・支払超過警告）、invoice_send承認必須、新event型 = **+9** → 合計 **160 passed**。
- 追加 integration（`p1_10_invoice_payment.itest.ts`）: 送信承認→SENT＋**二重送信防止（atomic claim）**、一部→全額入金で Invoice(PARTIALLY_PAID/PAID)/Receivable(open/collected)/FinanceEvent(payment_received)連動、cashflow実績集計、invoice_send承認必須、tenant分離 = **+6** → 合計 **64 passed**。
- 追加 e2e（`invoice_payment.spec.ts`）: 請求詳細の送信/入金カード、資金繰りの予定vs実績、スタッフ機密不可視。CI/実環境で実行。

## Phase 1-11 更新（2026-06-24）

- unit: **168**（+8）。`golden_path.test.ts`（ステップ状態計算・次アクション前進・低粗利警告・全額回収）。
- integration: **67**（+3）。`p1_11_golden_path.itest.ts`（顧客→案件→…→入金→回収の next action 前進、bridge冪等＝InvoiceCandidate重複なし、tenant分離）。
- e2e: `planning_hokko_golden_path.spec.ts`（入口→案件詳細遷移、Golden Pathカード表示、財務機密のスタッフ不可視）。サンドボックスではchromium DL不可のためCI/実環境実行。
- 6検証コマンド: db:generate / typecheck / test(168) / lint / build / integration(67) すべて green。

## Phase 1-12 更新（2026-06-24）

- unit: **186**（+18）。`golden_path_dashboard.test.ts`（進行中平均進捗・今月開催/完了[completedAt代理]・未回収/入金集計・cashflowTight・低粗利/延滞/高リスク/物流遅延/承認/未送信 検知・「今すぐ見るべき案件」優先度・finance redact 可視性）。
- integration: **73**（+6）。`p1_12_executive_dashboard.itest.ts`（複数EventProject集計・未回収[invoice+payment+receivable+financeEvent]横断・低粗利/高リスク/物流遅延/承認待ち検出・tenant分離・STAFF相当 redact）。
- e2e: `executive_dashboard.spec.ts`（CEO に GP KPI 表示・planning-hokko 平均進捗/次の一手・event→dashboard 導線・STAFF は金額不可視）。サンドボックスは chromium DL 不可のため CI/実環境で実行。
- 6検証コマンド: db:generate / typecheck / test(186) / lint / build / integration(73) すべて green。
