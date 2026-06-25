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

## Phase 1-7 完了 → 次の計画（2026-06-24）

完了: Operations 実行管理。承認後実行（冪等 `executeApprovedAction`＋二重実行防止＋3アクション、`/admin/operations-actions`）、棚卸（Stocktake/Line、差異→反映、大幅差異承認）、発注（Vendor/ReorderRule/PurchaseOrder/Line、発注点→候補→発注書→承認→入庫）、物流（LogisticsTask、状態遷移、完了Growth）、人員配置（EventStaffAssignment→EventCost反映）、リスク（EventRisk、high/critical警告）、ダッシュボード強化。新規9モデル＋ApprovalRequest実行フィールド。unit 139 / integration 44、lint/typecheck/build green。

次（Phase 1-8 / Phase 2 候補）:
1. **棚卸大幅差異/高額発注の承認後反映導線**を operations-actions に統合（現状: 申請まで＋PO は ordered 後に入庫）。
2. **協力会社マスタ深化**: EventVendor、協力会社単価（機密）、配送車両・ルート最適化。
3. **会計連動（Phase 2）**: 発注/イベント原価 → 仕訳候補（OCRProvider 実経路）→ 承認後確定、請求/入金連動、破損請求の請求書化。
4. **AI 拡張**: 棚卸差異要約・発注理由文・リスク対策案（safeAiInput/saveAIOutputStandard 前提）。
5. 残セキュリティ: レート制限、CSP、MFA、改ざん検知。

## Phase 1-8 完了 → 次の計画（2026-06-24）

完了: 保守性アーキテクチャ docs（12）＋ `lib/domains/finance/` サービス層確立。承認後実行補完（stocktake_adjust/purchase_order_issue）。Finance Bridge（FinanceEvent/JournalCandidate/InvoiceCandidate）で Operations→Finance を接続: EventProject/PurchaseOrder/DamageLossRecord → 仕訳候補・請求候補・資金繰り予定。`/finance/bridge` 一式。unit 145 / integration 52、6コマンド green。

次（Phase 1-9 / Phase 2 候補）:
1. **候補→正式化の承認後実行**: requestJournalFinalize 承認後に JournalEntry を posted 化、requestInvoiceSend 承認後に Invoice を正式化（executeApprovedAction）。
2. **/finance/cashflow と FinanceEvent(cashflow_expected) を統合**（現状並存）。
3. **会計本体（Phase 2）**: 試算表/決算書、OCR→仕訳候補（OCRProvider 実経路、safeAiInput/saveAIOutputStandard）。
4. **保守リファクタ**: operations/actions.ts(713行) を lib/domains/operations/* へ段階移設。

## Phase 1-9 完了 → 次の計画（2026-06-24）

完了: 候補→正式化（JournalCandidate→JournalEntry、InvoiceCandidate→Invoice/Receivable、承認後実行・冪等）。FinanceEvent(cashflow_expected)→/finance/cashflow 非破壊接続。保守リファクタ第一歩（lib/domains/operations/procurement.ts・stocktake.ts）。新規DBモデルなし。unit 151 / integration 58、6コマンド green。

次（Phase 1-10 / Phase 2 候補）:
1. **請求の外部送信ゲート**: 正式 Invoice(ISSUED)→SENT を prepareExternalPayload＋EXTERNAL_SEND_ENABLED＋承認で。入金(Payment)消込→Receivable collected。
2. **保守リファクタ継続**: operations/actions.ts を lib/domains/operations/{inventory,events,logistics}.ts へ段階移設。
3. **会計本体（Phase 2）**: 試算表/決算書UI（JournalEntry集計）、OCR→仕訳候補（OCRProvider 実経路＋safeAiInput）。
4. **資金繰り統合**: cashflowForecast を FinanceEvent ベースへ寄せる。

## Phase 1-10 完了 → 次の計画（2026-06-24）

完了: 請求送信ゲート（承認後SENT・冪等・prepareExternalPayload・assertAiToolAllowed）、入金消込（Payment/Invoice/Receivable/FinanceEvent連動）、資金繰り 予定vs実績の統合（非破壊）。保守リファクタ（lib/domains/operations/events.ts、actions 713→626行）。新規DBモデルなし。unit 160 / integration 64、6コマンド green。

次（Phase 1-11 / Phase 2 候補）:
1. **支払実行ゲート**: 買掛(PurchaseOrder/payment_expected outflow)の支払を payment_execute 承認後に実行→FinanceEvent payment_received(outflow posted)で支払実績化。
2. **保守リファクタ継続**: operations/actions.ts の inventory/lease/logistics を lib/domains/operations へ。
3. **会計本体（Phase 2）**: 試算表/決算書UI（JournalEntry集計）、OCR→仕訳候補（OCRProvider実経路＋safeAiInput）。
4. **資金繰り統合の完了**: cashflowForecast を FinanceEvent ベースへ寄せる。

## Phase 1-12 候補（Phase 1-11 完了後）

1. 経営ダッシュボード（/dashboard/ceo or /operations）へ Golden Path KPI 集約: 進行中案件の進捗％・粗利・未回収・資金繰り影響・承認待ち（ステップ20の完成）。
2. リース予約/在庫予約と案件商品割当の統合（ステップ4の継ぎ目解消）。
3. デモ seed 強化: 入金前/入金済の両案件・承認待ちを含む現実的シナリオ。
4. 承認種別の分離: 候補正式化=`invoice_finalize`、正式請求書外部送信=`invoice_send`（可読性/監査性）。
（横展開（会計本体/銀行API/OCR/契約/給与/労務/AI社員本体）は引き続き対象外）

## Release Stabilization Gate（2026-06-24・Phase 1-12 着手前）
Phase 1-11 完了後、機能追加の前に本番足場固めを実施。詳細は **`14_release_stabilization.md`**。
- 6 検証 green / secret 無し / 旧名称「369」再混入無し（docs歴史記述のみ）。
- 安定化追加修正: `/admin/users` の RBAC 認可ガード追加、追跡されていた `dump.rdb` を除外。
- **`main` ブランチが未存在**（本ブランチがデフォルト）。main 化は新規 main 作成＋利用者判断（既定/Vercel Production の切替）後に実施。
- → **Phase 1-12 は main 確定後に着手**（本ゲートでは新機能ゼロ）。

## Release Stabilization Gate 完了 → 次 Phase 着手可能（2026-06-24）
本番足場固め（`14_release_stabilization.md` §1–§18）を**完全クローズ**。
- `main` を検証済み系列から確定し、GitHub default branch・Vercel Production Branch を `main` へ切替。
- main 上で 6 検証 green、本番ビルド成果物の HTTP スモーク＋RBAC 認可ガード良好（§17）。
- 利用者がライブ本番（Vercel `main` ソース）を実機確認: 最新 Production Deployment Ready／build・migrate・engine・runtime エラーなし／本番 URL スモーク＋RBAC OK（§18）。
- → **Release Stabilization Gate 完了。次 Phase（1-12 候補）に着手可能。** 新機能・新規 DB モデルはゲート外の別タスクで実施。

## Phase 1-12 完了 → 次の計画（2026-06-24）

完了: **Golden Path KPI Executive Dashboard**。純ロジック `packages/shared/src/golden-path-dashboard.ts`（`summarizeExecutiveDashboard`/`redactExecutiveFinance`）＋ web 集約 lib `apps/web/lib/domains/operations/golden-path-dashboard.ts`（バッチ取得＋Map突合で N+1 回避）＋表示部品 `components/golden-path-kpi.tsx`（`GoldenPathKpiGrid`/`AttentionList`）。`/dashboard/ceo`（既存 Deal 中心 KPI 無改変で末尾に GP セクション追加）・`/planning-hokko`（KPI/attention 強化＋金額表示に finance ゲート是正）・`/operations/events/[id]`（経営ダッシュボード往復導線）。新規DBモデルなし。unit 186 / integration 73、6コマンド green。

次（Phase 1-13 / Phase 2 候補）:
1. `EventProject.completedAt`（or 完了 DomainEvent）で「今月完了/リードタイム」を正確化（現状は eventDate 当月＋status=completed の代理）。
2. 「今すぐ見るべき案件」→是正アクション（請求送信/督促/リスク対応）へのディープリンク。
3. 規模拡大に備えた KPI 集計のキャッシュ/集計テーブル化（現状はリクエスト毎 force-dynamic）。
4. 承認種別 `invoice_finalize`／`invoice_send` 分離（可読性・監査性）。
5. 横展開（会計本体/銀行API/OCR/契約/給与/労務/AI社員本体）は引き続き対象外。

## Phase 1-13 完了 → 次の計画（2026-06-24）

完了: **Golden Path Action Deep Links + completedAt 精緻化 + Approval 種別分離**。純ロジック `golden-path-actions.ts`（reason→是正アクション・finance filter）、`EventProject.completedAt` 追加（KPI今月完了を completedAt 優先・fallback付き）、`invoice_finalize`/`invoice_send` 意味分離（後方互換）。`AttentionList` に是正アクションボタン、event detail に #アンカー。新規DBモデルなし（completedAt の1列のみ）。unit 200 / integration 80、6コマンド green。

次（Phase 1-14 / Phase 2 候補）:
1. 是正アクション先での「その場ワンクリック実行」（請求送信/督促のインライン化）。
2. completedAt を用いたリードタイム・月次完了率の時系列 KPI。
3. `requestInvoiceSend` 等の関数名を実態（finalize）へリネーム（呼び出し元含む安全な範囲で）。
4. 横展開（会計本体/銀行API/OCR/契約/給与/労務/AI社員本体）は引き続き対象外。

### Phase 1-13 本番確認完了（2026-06-24）
利用者が Vercel 本番（`main` / `246e2be`）を実機確認: Deployment Ready／build・`migrate deploy`・`completedAt` migration・engine・runtime すべてエラーなし／本番 URL スモーク（KPI・今すぐ見るべき案件・是正アクション・アンカー遷移・OWNER finance 表示／STAFF 非表示）OK。詳細は `14_release_stabilization.md` §20。
→ **Phase 1-13 本番反映完了。次 Phase（1-14 候補）に着手可能。** 新機能・新規 DB モデル・大規模リファクタはゲート外の別タスクで。
