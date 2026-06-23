# 00 — インベントリ（現状計測）

> 監査日: 2026-06-23 / 対象ブランチ: `claude/friendly-dijkstra-un6l9t`
> 本書は **実測値** のみを記載する（推測は 02/09 に分離）。

## 0. サマリ

| 指標 | 実測値 | 備考 |
|---|---:|---|
| 総行数 (ts/tsx/prisma, excl node_modules/.next) | **15,582** | 「約1万行」より多いが、要件規模(50万行級)に対しては依然小さい |
| ファイル数 (ts/tsx/prisma) | **149** | |
| Prisma モデル数 | **163** | enum 10。**スキーマは広いが多くが UI/API/Test 未接続** |
| 画面ルート (page.tsx) | **66** | leadmap に偏在(12) |
| server actions ファイル | **9** | 公開 action 約 **24** |
| API route.ts | **1** | REST/RPC レイヤはほぼ無し（server actions 中心） |
| Worker | **apps/worker (254行)** | index.ts(75)+jobs.ts(179)。ジョブ実体は薄い |
| テストファイル | **6** | unit/itest/e2e 合計。網羅率は要件比で極小 |

## 1. パッケージ別 LOC

| パッケージ | LOC |
|---|---:|
| apps/web | 8,322 |
| packages/db | 3,466 |
| packages/shared | 1,441 |
| packages/ai | 1,346 |
| packages/integrations | 738 |
| apps/worker | 254 |

## 2. Prisma モデル（163）

存在する主なモデル群（抜粋）:
- 共通/SaaS: Tenant, User, Role, Permission, UserRole, Department, EmployeeProfile, ApiKey, IntegrationConnection, IntegrationSyncLog, SystemSetting, Notification, ApprovalRequest, **AuditLog, DataAccessLog**
- 会計: Account, JournalEntry, JournalEntryLine, **TrialBalance(モデルのみ)**, CashAccount, CashflowForecast(+Line), Loan(+Repayment), Expense, FinancialAlert, ProfitLeakFinding
- 請求/契約: Quote(+LineItem), Proposal(+File), Contract(+Clause, Risk), Invoice(+LineItem), Payment, Receivable, CollectionReminder
- CRM/営業: Customer, Contact, CustomerTimelineEvent/Interaction/Insight/Complaint/RankHistory, Deal(+StageHistory), SalesActivity, SalesPipelineStage, SalesReport
- LeadMap: LeadSearchCampaign(+Condition), LocalBusinessLead(+Contact), PlaceDataSnapshot, PlaceReview, WebsiteScan(+Finding), SocialProfile, LeadInsight/Score, OutreachDraft/Approval/SendLog/Reply, VisitRoute(+Stop)
- 議事録: Meeting, Recording, Transcript(+Segment), MeetingMinutes, Decision, ActionItem, AgendaItem
- 在庫/イベント: ProductAsset, ProductCategory, StockLocation, LeaseReservation(+Line), AssetMaintenanceRecord, AssetProfitabilitySnapshot, DamageLossRecord, DynamicPricingSuggestion, EventProject/Venue/Cost/ProductUsage/GrossProfitSnapshot/NextProposal
- HR: EmploymentContract, AttendanceRecord, Shift, LeaveRequest, OvertimeRecord, PayrollCost, Candidate, JobPosting, Interview, OneOnOneRecord, HRRiskFinding, Skill, EmployeeSkill, TrainingContent/Progress
- ナレッジ: KnowledgeSource/Document/Chunk/Summary/Version, RetrievalLog, AnswerCitation, DataLineage, KnowledgeRollbackJob
- AI: AIAgent(+Role/Run/Action/Memory), AIOutput, AIRecommendation, AIAlert, AIApprovalGate, PromptTemplate, LLMCallLog
- セキュリティ: AccessPolicy, DataMaskingRule, ConsentRecord, SuppressionList, RetentionPolicy, ExportJob, DeleteRequest
- バックアップ: BackupJob, BackupArtifact, RestorePoint, RestoreJob, ArchivePolicy
- その他: Subsidy*, ExpertPartner/Referral, Consultation, MarketingCampaign, MarketingSuggestion, CampaignMetric, ContentAsset, Inquiry, FileObject

### スキーマに「存在しない」主要要件モデル（→ 05/02 参照）
- **リアルタイム連動基盤**: `EventLog` / `DomainEvent` / `WebhookSubscription` / `WebhookDelivery` / Outbox / Idempotency — **無し**
- **看板AI見積**: `SignageEstimate` 系マスタ一式 — **無し**（フラッグシップ機能）
- **EC**: `ECStore` / `Order` / `Cart` / `Shipment` / `Coupon` — **無し**
- **AIコールセンター**: `CallSession` / `CallCenterAgent` / `CallScript` / `IVRFlow` — **無し**
- **位置情報**: `EmployeeLocationLog` / `EmployeeLocationConsent` / `Geofence` / `LocationAccessLog` — **無し**
- **電子契約**: `ElectronicSignatureRequest` — **無し**
- **SaaS課金**: `TenantPlan` / `TenantSubscription` / `TenantUsage` / `AIPointLedger` — **無し**
- **予実/計画**: `Budget` / `BudgetActual` / `ScenarioPlan` — **無し**
- **汎用案件/WF**: `Project` / `ProjectTask` / `Task` / `Workflow` / `WorkflowStep` — **無し**（EventProject はイベント業特化）
- **固定資産**: `FixedAsset` / `DepreciationSchedule` — **無し**
- **業種テンプレート/導入診断**: `IndustryTemplate` / `OnboardingDiagnosis` / `ImprovementRoadmap` — **無し**

## 3. 画面（66）ドメイン別分布

leadmap 12 / customers 6 / meetings 4 / deals 4 / communications 4 / quotes 3 / invoices 3 / inventory 3 / finance 3 / admin 3 / subsidies 2 / print 2 / knowledge 2 / dashboard 2 / ai-agents 2 / 他各1（tasks, reports/morning, horenso, experts, contracts, approvals, alerts, notifications, planning-hokko）

## 4. Worker（apps/worker, 254行）

- `index.ts`(75行): スケジュール登録は **4本のみ**（MORNING_REPORT / ANOMALY_DETECTION / PROFIT_LEAK / DYNAMIC_PRICING）。キュー名 `369-jobs`。
- `jobs.ts`(179行): ハンドラは約18種を **179行に圧縮** = 1ジョブあたり平均約10行 → **実体は薄い（要件のリトライ/idempotency/audit/失敗処理は未装備）**。

## 5. ガバナンス実接続（grep 実測）

| 項目 | 箇所数 | 評価 |
|---|---:|---|
| `hasPermission` 等 RBAC 呼び出し (apps/web) | 52 | 主要 action には入る。網羅は要確認 |
| `writeAudit(` | 25 | 変更系の一部。**全変更系には未到達** |
| `writeDataAccess(` | **3** | **機密参照ログがほぼ無い（重大）** |
| 承認 (`requiresApproval`/`approvalRequest.create`) | 9 | 外部送信系に存在 |
| `tenantId`（apps/web 内参照） | 246 | テナント分離は広く適用 |
| tenantId を持たないモデル | Tenant, Permission のみ | **設計通り（問題なし）** |

## 6. Provider 実装

- LLM: Fake / OpenAI / Anthropic（**Gemini 無し**）, Embedding: Fake/OpenAI, Transcription: あり, **OCR 無し**, **Voice 無し**
- Integrations: email(log/smtp), maps(demo/google), web fetcher(SSRF), connector(mock)。**payment / accounting / EC / telephony 無し**

## 7. 旧名称「369」残存

- ブランド除外語(@369.local 等)を除いて **76 箇所**。UI は前コミットで IKEZAKI OS 化済みだが、**worker キュー名・AIシステムプロンプト・seed ログ・fetcher UA・schema/コードコメント**に残存。→ Phase 1 で一掃。

## 8. テスト（6ファイル）

`shared/rbac.test.ts`, `shared/rules.test.ts`, `ai/tasks.test.ts`, `integrations/integrations.test.ts`, `db/integration.itest.ts`, `web/e2e/smoke.spec.ts`（合計 約51 unit）。**security / 多くの integration / 業務ロジック個別テストは未整備**。
