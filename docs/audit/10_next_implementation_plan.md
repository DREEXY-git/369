# 10 — 次の実装計画（具体）

## 本セッションで着手する増分（Phase 1-1）

**G-17 名称統一: 369 → IKEZAKI OS（全層）**
- 理由: 要件 §1 の明示的最優先、低リスク、検証容易、残存76箇所を一掃。
- 範囲: worker(キュー名/ログ)、AIシステムプロンプト、seed ログ、web fetcher UA、コード/スキーマのコメント、デモメール `@369.local`→`@ikezaki.local`（seed と login を整合）、Cookie名 `369_session`→`ikezaki_session`、`.env.example` のサンプルDB名、CLAUDE.md ヘッダ。
- 非対象（別Phaseの大改修）: §21 のフルseed拡張（多テナント8社/9ユーザー）は Phase 1-7 で実施。
- 検証: `pnpm lint && typecheck && test && build` green。`grep 369` 残存ゼロ（インフラ識別子を除く）。

## 次セッションの推奨着手（Phase 1-2 以降）

1. **ABAC ヘルパ + 機密参照ログ拡充**（G-05/G-11）
   - `apps/web/lib/auth/abac.ts`: `assertCanAccess(user, record, action)`（tenantId × confidentialityLabel × role）
   - 人事/財務/録音/位置/AI参照の detail/edit に `writeDataAccess` を必須化
   - test: クロステナント拒否 / 機密ラベル拒否
2. **コンプラ同意基盤**（G-04）
   - models: EmployeeLocationConsent, EmployeeLocationLog, Geofence, LocationAccessLog, 録音 ConsentRecord 連携
   - 取得前同意 / 取得中明示 / 閲覧ログ / 保存期間 / 本人開示
3. **連動基盤**（G-01）
   - models: EventLog, OutboxMessage, DomainEvent, WebhookSubscription, WebhookDelivery
   - `emitEvent()` ヘルパ + Outbox→Worker dispatch + Webhook 署名検証
4. **JobRun 基盤** + 未実装ジョブの骨格

## 各増分の Definition of Done（再掲・必須）
DB(relation/index/tenantId) → Action(Zod/RBAC/audit) → UI(一覧/詳細/作成/編集/削除/検索/empty/error/loading) → seed → unit+integration test → docs 反映。AI機能は PromptTemplate/Fake/Real/構造化/検証/ログ/承認ゲート/マスキング/注入対策まで。

## 進め方
最も致命的な P0 から、**1領域=1縦スライス**で「動く実装＋テスト」を積む。巨大な未完成より、CRUD+権限+監査+デモデータ+テストの一気通貫を優先（CLAUDE.md 方針）。

## Phase 1-2 完了 → Phase 1-3 計画（2026-06-23）

完了: ABAC Policy Engine、機密参照ログ拡充、同意基盤、承認ゲート関数、Event/Outbox/Webhook 基盤、顧客スライス組込み、管理UI4画面、unit+integration テスト。

Phase 1-3（次）:
1. `assertCanViewConfidential`/機密参照ログを 契約/請求/会計/人事/勤怠/議事録/ナレッジ の detail へ横展開。
2. 承認ゲート（`requireApprovalForDangerousAction`/`executeApprovedAction`）を 外部送信/エクスポート/削除/権限変更 の実行経路に適用。
3. worker に `OUTBOX_DISPATCH_JOB` を追加し Outbox→Webhook を常時処理＋汎用 `JobRun`（retry/idempotency/audit）。
4. 位置/録音の「取得・明示・閲覧」機能本体（同意前提）。
5. e2e/セキュリティ自動テスト拡充。

## Phase 1-3 完了 → Phase 1-4 計画（2026-06-24）

完了: ABAC/機密参照ログを invoice/finance/meeting/knowledge へ横展開、危険操作の承認ゲート実経路（申請＋承認済み実行）、worker `OUTBOX_DISPATCH_JOB`＋JobRun基盤、位置/録音の閲覧スライス（同意・勤務時間ゲート）。unit 92 / integration 20。

Phase 1-4（次）:
1. AI安全: PromptInjectionDetector / PiiMasker を外部送信・RAG 経路へ適用、AIOutput に citations/confidence/cost 保存。
2. e2e（Playwright）: 承認フロー、staff が財務/HR を見られない、位置/録音の同意ゲート。セキュリティ自動テスト（SSRF/XSS/CSRF）。
3. Provider 拡充（Gemini/OCR/Voice の interface+mock）。
4. その後 Phase 2（会計本体・看板AI見積 等）。各業務 detail 実装時に本ABAC/監査/承認/イベントを標準で組込む。

## Phase 1-4 完了 → Phase 1-5 計画（2026-06-24）

完了: Growth Event Ledger（GrowthEvent）、Marketing OS（Campaign/Asset/AI生成・承認）、DX OS（Assessment/Opportunity/効果記録）、AI安全基盤（PromptInjection/PiiMasker/ToolPermissionChecker/AIOutput拡張/AISafetyLog）。/growth・/marketing・/dx 計12画面。unit 111 / integration 24。

Phase 1-5（次）:
1. AI安全の全経路適用: ナレッジ/外部送信/AIエージェント実行に detectPromptInjection＋maskPii＋checkToolPermission を組込み、AIOutput を全AIタスクで保存。
2. e2e（Playwright）＋ セキュリティ自動テスト（SSRF/XSS/CSRF/権限分離）。
3. Provider 拡充（Gemini/OCR/Voice interface+mock）。
4. その後 Phase 2: 会計本体 → 看板AI見積 → EC（各業務に Growth/ABAC/承認/イベントを標準組込み）。

## Phase 1-5 完了 → 次の計画（2026-06-24）

完了: 共通安全ヘルパ（`ai-safety-server.ts`/`safe-external-send.ts`/`safe-ai-run.ts`）を新設し、LeadMap（分析/生成/返信/一括）・会議議事録・コミュニケーション受信・ナレッジ検索の全AI経路へ注入検出＋AIOutput標準保存を横展開。外部送信申請に PII マスク済プレビュー。Provider 拡充（Text/OCR/Voice）。管理UI 3画面（ai-safety/ai-outputs/operations-readiness）。Operations OS 準備（operations.ts＋GrowthEvent運用種別＋棚卸しドキュメント、OS本体は未着手）。unit 125 / integration 28、lint/typecheck/build green。

次（Phase 1-6 / Phase 2 候補）:
1. **会計本体**（仕訳/試算表/決算書UI・確定ロック・OCR→仕訳候補は承認後確定）。OCRProvider を実経路へ。
2. **Operations OS 本体（Phase 4系）**: 在庫入出庫(StockMovement)/棚卸(Stocktake)/発注(PurchaseOrder)・発注点、リース→搬入→設営→撤去→回収→精算、SalesOrder/Shipment。すべて DB→Action(Zod/RBAC/監査)→UI→承認→DomainEvent/GrowthEvent→Worker→テスト を縦に通す。
3. 外部送信実行経路の実装時に `prepareExternalPayload` を送信直前へ自動適用＋ `EXTERNAL_SEND_ENABLED` ＋承認。
4. 残セキュリティ: MFA/SSO、改ざん検知(ハッシュチェーン)、レート制限、CSP、ファイル検証。

## Phase 1-6 完了 → 次の計画（2026-06-24）

完了: Operations OS 最小縦スライス。新規 `InventoryMovement`（在庫状態の単一の真実源）＋既存 ProductAsset/LeaseReservation/EventProject を活用。`lib/operations.ts`（applyInventoryMovement/recordEventProfitabilitySnapshot/summarizeOperationsDashboard）＋ `operations/actions.ts`（在庫/リース/イベントの各 action）。画面 `/operations`・`/operations/events(/new,/[id])`・`/operations/inventory-movements(/new)`、`/inventory/lease` を実用化。DomainEvent/GrowthEvent 接続、危険操作の承認ゲート、原価/粗利の機密権限分離。unit 131 / integration 34、lint/typecheck/build green。

次（Phase 1-7 / Phase 2 候補）:
1. **承認後実処理**: 強制解除・破損請求確定を `executeApprovedAction` で承認後に実行する経路を実装。
2. **在庫の深化**: 発注（PurchaseOrder）・発注点アラート・棚卸（Stocktake）・入出庫の差異監査。
3. **イベント会社の深化**: 配送/設営/撤去/回収のワークフロー、EventStaffAssignment（人員配置・人件費）、EventRisk（リスク管理）。
4. **会計連動（Phase 2）**: イベント原価/売上 → 仕訳候補（OCRProvider 実経路）→ 承認後確定、請求・入金連動。
5. **看板AI見積（Phase 3）**: 13マスタ＋原価/粗利ロジック＋UI。
