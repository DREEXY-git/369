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

## Phase 1 進捗（2026-06-23）

- 1 名称統一 ✅ / 2 監査・機密参照の土台 ✅(ABAC+DataAccessLog 拡充) / 3 同意基盤 ◯(モデル/UI/評価。機能本体は次) / 4 連動基盤 ✅ / 5 JobRun 基盤 △(Outbox はあり、汎用JobRunは次) / 6 provider拡充 ◻(次) / 7 seed強化 ◻(次)。
- 次の焦点: Phase 1-3（機密参照ログの全機密ドメイン横展開、承認ゲートの実行経路適用、worker での Outbox 常時処理、JobRun 基盤）。

## Phase 1-3 進捗（2026-06-24）

- ABAC/機密参照ログ横展開（invoice/finance/meeting/knowledge）✅ / 承認ゲート実経路 ✅ / worker Outbox常時処理＋JobRun基盤 ✅ / 位置・録音の閲覧スライス（同意・勤務時間ゲート）✅。
- 次: Phase 1-4（残りの機密ドメインは画面本体実装と同時に ABAC 付与、AI注入対策、e2e/セキュリティ自動テスト、Provider拡充）。

## Phase 1-4 進捗（2026-06-24）— Growth Infrastructure

- Growth Event Ledger（成長台帳）✅ / Marketing OS 最小縦スライス ✅ / DX OS 最小縦スライス ✅ / AI安全基盤（注入検出・PIIマスク・ツール権限・AIOutput拡張）✅。
- 既存 P0（ABAC/監査/承認/Event/Outbox/JobRun）を全面利用。外部送信は承認のみ。
- 次: Phase 1-5（AI安全の全経路適用、provider拡充、e2e/セキュリティテスト）→ Phase 2（会計本体・看板AI見積 等の業務OS）。

## Phase 1-5 進捗（2026-06-24）— AI Safety 全経路適用 ＋ Operations OS 準備

- AI安全の共通ヘルパ（`safeAiInput`/`saveAIOutputStandard`/`assertAiToolAllowed`/`prepareExternalPayload`）を新設し、LeadMap/会議/コミュニケーション/ナレッジ検索の全AI経路へ横展開 ✅。
- Provider 拡充（`TextAIProvider`/`OCRProvider`/`VoiceProvider` interface＋Fake）✅。
- 管理UI（`/admin/ai-safety`・`/admin/ai-outputs`・`/admin/operations-readiness`）＋nav ✅。
- **Operations OS 準備**（OS本体は未着手）: `packages/shared/operations.ts`（稼働率/可用性/粗利率/運用分類）、GrowthEvent 種別に在庫/リース/イベント/物流/販売を追加（`operations` カテゴリ新設）、既存モデル棚卸し（`docs/audit/11_operations_os_readiness.md`）✅。
- unit 125 / integration 28。lint/typecheck/build green。e2e security spec 追加（CI実行）。
- 次: Phase 2（会計本体 → 看板AI見積）または Phase 4 系 Operations OS 本体（在庫入出庫/棚卸/発注、リース→イベント精算、SalesOrder/Shipment）。いずれも本AI安全・ABAC・承認・Growth を標準組込み。

## Phase 1-6 進捗（2026-06-24）— Operations OS 最小縦スライス

- Phase 4 系（在庫/リース/イベント会社）の**最小実用版**を縦に貫通: 在庫登録/移動 → リース予約 → イベント案件 → 商品割当 → 原価/売上/粗利 → GrowthEvent → ダッシュボード ✅。
- 新規モデルは **`InventoryMovement` のみ**（在庫状態の単一の真実源）。既存 ProductAsset/LeaseReservation/EventProject 系を最大活用。
- DomainEvent に Operations 系10種、GrowthEvent に運用種別を拡充。重要操作は Audit＋GrowthEvent（＋DomainEvent→Outbox→Webhook）。
- 危険操作（大幅数量調整・予約強制解除）は承認ゲート。原価/粗利は財務権限のみ（機密）＋ DataAccessLog。
- AI次回提案は Phase 1-5 安全基盤（safeAiInput→saveAIOutputStandard）で下書き生成。
- unit 131 / integration 34、lint/typecheck/build green。e2e `operations.spec.ts` 追加（CI実行）。
- 次: Phase 1-7（発注/棚卸/配送・設営人員/協力会社）または Phase 2（会計本体・OCR→仕訳・請求/入金連動）。看板AI見積は Phase 3。
