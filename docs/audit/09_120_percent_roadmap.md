# 09 — 120% 完成化ロードマップ

> 行数は結果であり目的ではない（要件 §0-3）。各 Phase は **DB→Action→UI→RBAC→Audit→Test** を縦に通す。

## Phase 1 — 基盤再整備（コンプラ＆屋台骨）
1. **名称統一 369→IKEZAKI OS**（全コード/プロンプト/seed/worker/コメント）← 本セッションで実施
2. **監査/機密参照の土台**: `writeDataAccess` を機密参照全体へ。ABAC ヘルパ `assertCanAccess`
3. **同意/明示基盤**: EmployeeLocationConsent / 録音同意 / LocationAccessLog（**コンプラ最優先**）
4. **連動基盤**: EventLog / OutboxMessage / DomainEvent / WebhookSubscription / Delivery / EventBus
5. **JobRun 基盤**: retry/idempotency/audit を全ジョブへ
6. provider interface 拡充（Gemini/OCR/Voice/Payment/Accounting/Telephony を interface+mock）
7. seed 強化（§21 のマルチテナント/ユーザー）

## Phase 2 — 経営・会計・財務
会計(仕訳/試算表/決算書UI・確定ロック・税理士レビュー導線) / キャッシュフロー予測(13週/30/90/12mo・ショート予測) / 請求・入金・債権(消込/督促) / OCR→仕訳候補(承認後確定) / FinancialAlert。

## Phase 3 — CRM・営業・契約・見積・看板
CRM 温度感/離脱予測 / 営業日報・売上予測 / 契約(テンプレ/電子署名skeleton/締結後連動) / **看板AI見積（13マスタ+原価/粗利ロジック+UI）** / LeadMap 深化。

## Phase 4 — 業務・人事・在庫・EC
Project/Task/Workflow/Gantt / 人事・勤怠・シフト・給与UI / 位置情報マップ(同意前提) / 在庫(Warehouse/Movement/Stocktake/PO/発注点) / **EC(Store/Order/Cart/Shipment)＋在庫・会計連動**。

## Phase 5 — AI・議事録・ナレッジ
AI社員(役割/権限/参照/実行ゲート/評価) / AIマネージャー / 議事録(話者分離/要約/タスク化) / **RAG 権限・機密フィルタ＋引用必須** / prompt injection 対策 / AIログ拡充(cost/citations/confidence)。

## Phase 6 — コールセンター・マーケ・通知
CallSession/Agent/Script + Telephony/Voice skeleton + 通話要約→CRM/案件連動 / マーケ自動化(Email/LINE/SMS + AutomationFlow + 配信承認) / 通知センター(チャネル別 Provider)。

## Phase 7 — SaaS運営・業種・診断
TenantPlan/Subscription/Usage/AIPointLedger + 課金UI / 業種テンプレート / 導入診断→改善ロードマップ→ROI。

## Phase 8 — セキュリティ・テスト・本番準備
security/integration/e2e テスト網羅 / レート制限 / CSP / 改ざん検知監査 / バックアップ・復元UI / export(JSON/CSV) / エラー監視 skeleton / README・CLAUDE.md 拡充 / PWA。

## マイルストーン判定
各 Phase 完了時に `pnpm lint && typecheck && test && build` green、かつ該当領域が 01 マトリクスで「部分→完成」へ昇格していること。
