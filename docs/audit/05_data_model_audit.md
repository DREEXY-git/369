# 05 — データモデル監査

## 総評

- 163 モデルは要件の広範をカバーするが、**(a) 連動基盤・フラッグシップ等が完全欠如**、**(b) 多くのモデルが UI/API/Test 未接続（見せかけ）**。
- 共通カラム規約は概ね良好: 全モデル `tenantId`（Tenant/Permission 除く）、`createdAt/updatedAt`、`@@index([tenantId])`。

## 共通カラム規約の充足（要件 §14）

| カラム | 充足 | 備考 |
|---|:--:|---|
| id / tenantId / createdAt / updatedAt | ✓ | 規約通り |
| createdById / updatedById | △ | 一部のみ。監査・帰属のため全変更系へ推奨 |
| deletedAt（ソフト削除） | △ | 一部。復元要件(§31)のため拡充 |
| confidentialityLabel | △ | 機密性のあるモデルに限定。人事/録音/位置/財務へ徹底 |
| status / source / metadata(JSON) / version | △ | モデルにより不揃い |
| approvalStatus/approvedById/approvedAt | △ | 承認対象モデルへ付与 |
| externalId/syncStatus/lastSyncedAt | △ | 外部連携モデルへ付与 |

## 欠落モデル（要件 §15 との差分・新設対象）

- **連動基盤**: EventLog, DomainEvent, OutboxMessage, IdempotencyKey, WebhookSubscription, WebhookDelivery, EventReplay, EventFailureLog, DataConsistencyCheck
- **看板**: SignageEstimate(+Line), SignageTypeMaster, SignageMaterialMaster, SignageSizePriceMaster, PrintingMethodMaster, ProcessingStepMaster, InstallationStepMaster, LaborCostMaster, OutsourcingCostMaster, TransportationCostMaster, SiteDifficultyFactor, ShortDeadlineFactor, NightWorkFactor, HighPlaceWorkFactor, SignagePastEstimate, SignageActualCost, SignageKnowledgeCase
- **EC**: ECStore, ECProductPage, Cart, Order, OrderLineItem, Shipment, SubscriptionOrder, Coupon, ProductReview
- **コールセンター**: CallCenterAgent, CallSession, CallIntent, CallEscalation, CallQualityScore, CallScript, VoiceProviderConnection, PhoneNumber, IVRFlow, CallRecording, CallTranscript, CallSummary
- **位置情報**: EmployeeLocationConsent, EmployeeLocationLog, Geofence, LocationAccessLog
- **電子契約**: ElectronicSignatureRequest, ContractTemplate
- **SaaS課金**: TenantPlan, TenantSubscription, TenantUsage, AIUsage, AIPointLedger
- **予実/会計拡張**: Budget, BudgetActual, ScenarioPlan, FixedAsset, DepreciationSchedule, TaxCategory, FinancialStatement(明細), OCRResult, Receipt, Payable
- **案件/WF**: Project, ProjectMilestone, ProjectTask, Task, TaskTemplate, Workflow, WorkflowStep, CalendarEvent, GanttItem, Reminder
- **在庫拡張**: Product, ProductVariant, SKU, Warehouse, WarehouseLocation, InventoryItem, InventoryMovement, StockReservation, Stocktake, PurchaseOrder
- **マーケ拡張**: CustomerSegment, EmailCampaign, LineCampaign, SMSCampaign, AutomationFlow, AutomationStep, AdSpend, ABTest
- **ナレッジ拡張**: KnowledgeEmbedding(明示), SourceTrustScore, KnowledgeQualityIssue
- **業種/診断**: IndustryTemplate, IndustryKPI, IndustryDashboardTemplate, IndustryWorkflowTemplate, IndustryEstimateLogic, OnboardingDiagnosis, DiagnosisAnswer, ImprovementRoadmap, RoadmapTask, ROISimulation
- **その他**: Session(永続), LoginAttempt, PermissionChangeLog, SecurityIncident, FileVersion, Folder, FileShare, ConsultationTicket, PartnerFee

## index / relation の注意

- LeadMap/会計など参照頻度の高い結合に複合 index を要確認（`@@index([tenantId, status])` 等）。
- ベクトルは現状 Float[]（pgvector 移行余地）。KnowledgeChunk のベクトル検索性能は将来 pgvector 化。

## 結論

スキーマは「広いが浅い」。**新設 ~120 モデル**と、既存モデルへの **createdById/deletedAt/confidentialityLabel/approval系の補強**が必要。
