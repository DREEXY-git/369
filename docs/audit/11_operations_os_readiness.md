# 11 — Operations OS 準備状況（在庫・リース・イベント会社・営業）

> 目的: 倉庫/在庫/リース/イベント案件/営業（販売）OS を**後続フェーズで安全に増築**するための棚卸し。
> 本フェーズ（Phase 1-5）では **OS本体（CRUD/承認導線/ワーカー/完全な画面）は作らない**。
> 既存実体の確認＋純ロジックと成長イベント種別の最小準備のみを行う。

## 1. 既存DBモデル（実在）

### 在庫・リース（資産運用）
| モデル | 役割 | 主なフィールド |
|---|---|---|
| `ProductCategory` | 商品カテゴリ | name |
| `StockLocation` | 保管場所 | name |
| `ProductAsset` | 在庫/リース資産 | code/name/quantity/condition/status/acquisitionCost/cumulativeRevenue/cumulativeGross/utilizationRate/rentalPrice/usageCount |
| `AssetMaintenanceRecord` | 整備・点検履歴 | type/cost/date |
| `LeaseReservation` | リース予約（案件） | eventName/venue/status/startAt/endAt/delivery/setup/return |
| `LeaseReservationLine` | 予約明細 | assetId/quantity |
| `DamageLossRecord` | 破損・紛失 | type/cost |
| `AssetProfitabilitySnapshot` | 資産収益性スナップショット | period/revenue/gross/utilization/recovered |
| `DynamicPricingSuggestion` | 動的価格提案 | basePrice/suggestedPrice/changeRate/factors |

### イベント会社（案件）
| モデル | 役割 |
|---|---|
| `EventProject` | イベント案件（revenue/cost/gross/搬入出/天候リスク） |
| `EventVenue` | 会場マスタ |
| `EventProductUsage` | 案件で使用した資産 |
| `EventCost` | 案件コスト明細 |
| `EventGrossProfitSnapshot` | 案件粗利スナップショット（marginRate） |
| `EventNextProposal` | 次回提案 |

### 営業（販売・CRM）
`Customer` / `Deal` / `Quote` / `Invoice` / `CustomerTimelineEvent` / `LeadSearchCampaign` / `LocalBusinessLead`（LeadMap）など既存。

## 2. 既存画面・アクション

- 画面: `/inventory`（在庫・商品、稼働率/整備/資産価値の集計表示）、`/inventory/lease`（リース予約）、`/inventory/profitability`（商品収益性）、`/admin/events`、`/growth/events`。
- これらは現状 **読み取り中心**。`ProductAsset`/`EventProject`/`LeaseReservation` を**変更する Server Action は未整備**（＝後続フェーズで CRUD＋承認＋イベントを縦に通す余地）。

## 3. 既存イベント・Growth 接続

- 連動基盤（`DomainEvent`/`OutboxMessage`/`WebhookSubscription`/`WebhookDelivery`）は P0 で整備済み。運用系イベントもこの基盤に乗せられる。
- Growth Event Ledger（`GrowthEvent`）は category を String 保持（マイグレーション不要で種別追加可能）。

## 4. 本フェーズ（Phase 1-5）で実施した最小準備

1. **純ロジック追加** `packages/shared/src/operations.ts`（DB非依存・テスト済）:
   - `inventoryUtilizationRate(usedDays, availableDays)` — 稼働率%。
   - `rentalAvailabilityStatus({total, reserved, maintenance})` — available/limited/unavailable。
   - `eventProfitMargin(revenue, cost)` / `salesGrossProfitRate(revenue, cogs)` — 粗利率%。
   - `isOperationalGrowthEvent(type)` / `classifyOperationCategory(type)` — 成長イベントの運用分類。
   - 既存 `inventory.ts`（予約衝突 `hasReservationConflict`、動的価格 `suggestDynamicPrice`）と相補。
2. **GrowthEvent 種別の拡張** `GROWTH_EVENT_TYPES` に運用系を追加:
   - `inventory.stock.received` / `inventory.stock.adjusted` / `inventory.asset.maintenance`
   - `rental.reservation.created` / `rental.reservation.returned` / `rental.asset.damaged`
   - `event.project.created` / `event.project.completed` / `event.proposal.created`
   - `sales.order.created` / `sales.order.fulfilled`（`fulfilled` は売上関連に算入）
   - `logistics.delivery.completed`
   - `GrowthCategory` に `operations` を追加し、上記 head を `operations` へ写像。Growth ダッシュボードに「運用」ラベルを追加。
3. **AI Provider 準備** `packages/ai`：`OCRProvider`（`extractInvoiceFields` 等）/`VoiceProvider`（`summarizeCall` 等）/`TextAIProvider` の interface＋Fake を追加（OCR→仕訳候補、通話→CRM連携 などの後続実装の差し替え口）。

## 5. 後続フェーズ（本フェーズでは未実施）

- 在庫: 入出庫 `StockMovement`、棚卸 `Stocktake`、発注 `PurchaseOrder`/発注点アラート。
- リース/イベント: 予約→搬入→設営→撤去→回収→精算のワークフロー、案件粗利の自動スナップショット、ダメージ請求。
- 営業（販売）: `SalesOrder`/`Cart`/`Shipment` と在庫・会計連動（EC含む）。
- いずれも **DB→Action（Zod/RBAC/監査）→UI→承認→DomainEvent/GrowthEvent→Worker→テスト** を縦に通す。
- 危険操作（外部送信/支払/削除/エクスポート）は既存 `requiresApproval` ＋承認ゲートを必須で組込む。
- AI 生成物（OCR仕訳候補/価格提案/通話要約）は必ず**下書き**＋人間承認。

## 6. 接続方針（既存P0を再利用）

新OSは新しい認可/監査/承認/イベントを**再実装しない**。`hasPermission`(RBAC)＋`evaluatePolicy`(ABAC)、`writeAudit`/`writeDataAccess`、`requiresApproval`/`executeApprovedAction`、`emitDomainEvent`/`emitGrowthEvent` を標準利用する。

---

## Phase 1-6 実装（2026-06-24）— Operations OS 最小縦スライス

**通した縦スライス**: 在庫登録/在庫移動 → リース予約 → イベント案件 → 商品割当 → 原価/売上/粗利 → GrowthEvent → ダッシュボード。

### 追加モデル（最小）
- **`InventoryMovement`**（唯一の新規モデル）: 在庫の動き（receive/move/reserve/dispatch/return/damage/maintenance_start/maintenance_complete/adjust）を記録する台帳。`assetId`→ProductAsset リレーション。**ProductAsset の status/condition/locationId/quantity を更新する単一の真実源**。マイグレーション `20260624034022_p1_6_inventory_movement`。
- EventTask/EventStaffAssignment/EventRisk は最小縦スライスに不要のため**今回は追加せず**、次フェーズへ（リスクは暫定で EventProject.weatherRisk/notes）。

### 活用した既存モデル
ProductAsset/ProductCategory/StockLocation/AssetMaintenanceRecord/DamageLossRecord、LeaseReservation(+Line)、EventProject/EventVenue/EventProductUsage/EventCost/EventGrossProfitSnapshot/EventNextProposal、Customer、ApprovalRequest/AuditLog/DataAccessLog/GrowthEvent/DomainEvent。

### InventoryMovement の位置付け
全在庫変化を InventoryMovement 経由（`lib/operations.applyInventoryMovement`）で行い、`ProductAsset` 更新＋`writeAudit`＋`emitGrowthEvent`（重要時 DomainEvent も）を一括実行。状態の二重管理を排除。

### LeaseReservation の実用化
作成→商品追加（在庫可用性チェック `availableQuantity`／重複防止 `hasReservationConflict`）→確定→出庫→返却→破損記録→**イベント案件化**まで Server Action を実装。出庫/返却は InventoryMovement で在庫状態を out/available に同期。

### EventProject の実用化
作成→会場/顧客→商品割当（EventProductUsage＋在庫予約）→原価記録（EventCost）→売上記録→**粗利計算（EventGrossProfitSnapshot）**→完了→AI次回提案。

### 案件別粗利
`/operations/events` 一覧で案件ごとの売上/原価/粗利率（`eventProfitMargin`）、`/operations/events/[id]` で粗利サマリー・原価内訳・粗利スナップショット・次回提案。**原価/粗利は財務閲覧権限のみ表示**（機密）。

### 在庫別収益性
既存 `/inventory/profitability` ＋ `/operations` ダッシュボードで稼働率・累計売上/粗利・低稼働/破損在庫を可視化（`summarizeOperationsDashboard`）。

### GrowthEvent / DomainEvent 接続
- DomainEventType に Operations 系10種を追加（INVENTORY_MOVEMENT_CREATED/STATUS_CHANGED, LEASE_RESERVATION_CREATED/CONFIRMED, LEASE_ITEM_DISPATCHED/RETURNED, EVENT_PROJECT_CREATED, EVENT_EQUIPMENT_ASSIGNED, EVENT_PROFITABILITY_RECORDED, EVENT_PROJECT_COMPLETED）。
- GROWTH_EVENT_TYPES に運用種別を拡充。重要操作は `emitGrowthEvent({alsoDomainEvent})` で Growth＋Domain（→Outbox→Webhook→worker）に接続。

### ABAC / Audit / Approval
- 全 action: tenantId 分離＋`hasPermission('inventory', …)`。原価/粗利の詳細閲覧は `hasPermission('finance','read')` で制御し `writeConfidentialViewLog` を記録（CONFIDENTIAL）。
- **危険操作の承認ゲート**: 在庫数量の大幅調整（`inventory_adjust`、|Δ|≥10 で承認）、予約済み在庫の強制解除（`inventory_force_release`、常時承認）を `requireApprovalForDangerousAction` 経由。承認待ちは申請のみ作成し直接適用しない。
- **設計上Approval対象（今回UI未実装、docs明記）**: 在庫削除、在庫評価額の変更、破損請求の確定（`damage_charge_finalize`）、案件粗利/原価の外部共有・export、協力会社単価のexport。

### AI安全基盤の適用
`createEventNextProposalAction` は Phase 1-5 の `safeAiInput`（注入検出）→決定論生成→`saveAIOutputStandard`（AIOutput保存）→GrowthEvent（event.proposal.created）。外部送信は今回なし。

### 残リスク / 次フェーズ
- 強制解除/破損請求確定の「承認後の実処理（executeApprovedAction）」は未実装（申請まで）。
- 発注(PurchaseOrder)/棚卸(Stocktake)/車両・配送/設営人員/協力会社/看板AI見積/請求・入金・会計連動 は次フェーズ。
- EventTask/EventStaffAssignment/EventRisk は人員配置・リスク管理の本格化時に追加。
