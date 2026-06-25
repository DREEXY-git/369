# 13 — Planning Hokko Golden Path 監査（Phase 1-11）

プランニングホッコー向けの中心業務フロー（顧客→案件→…→請求→入金→資金繰り→経営可視化）を
「本当にUIから一本で進められるか」で監査し、薄い継ぎ目を最小補強した記録。
方針: 横展開せず、新規DBモデルを追加せず、既存モデルを連結して Golden Path を通す。

## Golden Path 20ステップ 監査結果

判定凡例: ✅ UIから完全に通る / △ 部分的・別画面 / ⚠️ libはあるがUI継ぎ目が弱い / ❌ 未実装

| # | ステップ | 監査前 | 監査後 | 実体 |
|---|---|---|---|---|
| 1 | 顧客作成 | ✅ | ✅ | /customers/new |
| 2 | イベント案件作成 | ✅ | ✅ | /operations/events/new（顧客選択あり＝1と連結） |
| 3 | 商品・備品割当 | ✅ | ✅ | event detail: assignAssetToEventAction |
| 4 | リース予約・在庫予約 | △ | △ | 割当は event detail、リース予約は /inventory/lease（分離。P2で統合余地） |
| 5 | 配送・設営・撤去・回収 | ✅ | ✅ | event detail: createEventLogisticsTasksAction（一括） |
| 6 | 人員配置 | ✅ | ✅ | event detail: assignEventStaffAction |
| 7 | イベントリスク登録 | ✅ | ✅ | event detail: createEventRiskAction（任意ステップ） |
| 8 | 原価登録 | ✅ | ✅ | event detail: recordEventCostAction（財務権限で表示） |
| 9 | 売上登録 | ✅ | ✅ | event detail: recordEventRevenueAction |
| 10 | 粗利計算 | ✅ | ✅ | event detail: calculateEventProfitabilityAction |
| 11 | Finance Bridge作成 | ⚠️ | ✅ | **新規: event detail から bridgeEventToFinanceAction（冪等）**。従来は /finance/bridge のみ |
| 12 | 請求候補作成 | ✅ | ✅ | bridge時に InvoiceCandidate 自動生成 |
| 13 | 仕訳候補作成 | ✅ | ✅ | bridge時に JournalCandidate 自動生成 |
| 14 | 正式請求書化 | ✅ | ✅ | /finance/invoice-candidates → 承認 → 正式化 → /invoices/[id] |
| 15 | 送信承認申請 | ✅ | ✅ | /invoices/[id]（Phase 1-10） |
| 16 | 承認後送信 | ✅ | ✅ | /invoices/[id]（Phase 1-10、executeApprovedAction） |
| 17 | 入金記録 | ✅ | ✅ | /invoices/[id]（Phase 1-10） |
| 18 | 売掛金回収 | ✅ | ✅ | 入金で Receivable.status=collected（Phase 1-10） |
| 19 | 資金繰り反映 | ✅ | ✅ | /finance/cashflow 予定vs実績（Phase 1-10） |
| 20 | 経営ダッシュボード | △ | △ | /dashboard/ceo は Deal中心。EventProject Golden Path 横断指標は未集約（P1残） |

監査前の結論: **データ層は20ステップ全て lib+action+DB が存在**。問題は「継ぎ目の遷移性」と「現在地/次の一手の不在」。

## 監査で補強した内容（Phase 1-11）

- **純ロジック** `packages/shared/src/golden-path.ts` `computeGoldenPath()`:
  既存モデル由来の事実（件数/金額/ステータス）だけを受け取り、各ステップ status・次アクション・進捗％・低粗利警告・全額回収判定を返す純関数（UI/DB非依存）。
- **集約クエリ** `apps/web/lib/domains/operations/golden-path.ts` `getEventGoldenPathStatus()`:
  EventProject の counts ＋ FinanceEvent(event_revenue=bridged) ＋ InvoiceCandidate(sourceType=EventProject) ＋ Invoice(via invoiceId) を横断集約し computeGoldenPath を呼ぶ。
- **bridge 冪等化** `bridgeEventProjectToFinance`:
  既存 InvoiceCandidate(sourceType=EventProject) があれば二重生成しない（event detail / bridge どちらから来ても安全）。
- **event detail UI** `/operations/events/[id]`:
  「Golden Path — 現在地と次の一手」カード（進捗バー、次アクション、Finance Bridge ボタン、請求候補/請求書/資金繰りリンク、顧客表示、低粗利警告）。
- **薄い action** `bridgeEventToFinanceAction`（operations/actions.ts）: 認証→finance権限→lib呼び出し→event詳細へ戻る。
- **入口** `/planning-hokko`: 各案件カードを event detail へリンク、「次の一手」導線を明示。

## まだ残る実務上の不足

- **20 経営ダッシュボード**: CEO コックピットは Deal 中心で、EventProject Golden Path の粗利/回収/資金繰りを横断集計していない（P1残）。
- **4 リース/在庫予約**: event detail の「商品割当」と /inventory/lease の予約が分離（P2）。
- 請求の「候補→正式化」承認と「正式 Invoice の外部送信」承認がともに ApprovalRequest.action='invoice_send'（識別は payload で実施）。可読性のため将来 `invoice_finalize` 分離が望ましい（P2、03 参照）。
- 入金消込が複数 await（非トランザクション）。途中失敗時の整合は将来ハードニング（P2）。

## 営業デモとして使える範囲

- 顧客→案件→商品/物流/人員/原価/売上/粗利→**Finance Bridge（案件詳細から1クリック）**→請求候補→正式請求書→送信承認→入金→資金繰り反映 までを、案件詳細の「現在地と次の一手」に沿って一本で実演可能。
- 財務機密（原価/粗利/請求金額/資金繰り）は権限分離（スタッフは不可視）。

## 本番提供できない理由（正直な評価）

- 実メール送信は既定 OFF（EXTERNAL_SEND_ENABLED=false で監査のみ）。実運用は配信/バウンス/再送設計が未了。
- 本格会計（試算表/決算書）・銀行API入金照合・OCR・契約/給与/労務・AI社員本体は未着手（P2、対象外）。
- 経営ダッシュボードの案件横断 KPI 集約が未了。

## 次Phaseで本当にやるべきこと

1. 経営ダッシュボードに Golden Path KPI（進行中案件の進捗・粗利・未回収・資金繰り影響）を集約（ステップ20の完成）。
2. リース/在庫予約と案件商品割当の統合（ステップ4）。
3. デモシナリオ seed の強化（入金前/入金済の両案件、承認待ち）。
4. 承認種別の `invoice_finalize` / `invoice_send` 分離（可読性・監査性）。

---

## Phase 1-12 — Golden Path KPI Executive Dashboard（ステップ20の完成・2026-06-24）

方針: 横展開せず・新規DBモデルゼロ・既存モデルのみ。Phase 1-11 で案件ごとに可視化した Golden Path を、
**社長が一目で「どの案件が危ないか／次に何をすべきか／未回収・粗利・資金繰りにどう効くか」**を把握できる
経営 KPI へ集約。**ステップ20「経営ダッシュボード」を △ → ✅** に引き上げた。

### 実装（集計は page.tsx に書かず lib に分離）
- **純ロジック** `packages/shared/src/golden-path-dashboard.ts`（DB/UI 非依存・テスト容易）:
  - `summarizeExecutiveDashboard(facts, opts)` … 全体KPI＋案件別KPI＋「今すぐ見るべき案件」優先度
  - `redactExecutiveFinance(dashboard, canViewFinance)` … finance 項目を **データ整形段階で null 化**（UI 非依存のゲート）
  - `EXEC_ATTENTION_WEIGHT/LABEL` … 優先度の重みと表示名
- **集約クエリ** `apps/web/lib/domains/operations/golden-path-dashboard.ts`:
  - `getGoldenPathExecutiveDashboardData(tenantId, canViewFinance)` … 全 EventProject ＋ EventRisk/LogisticsTask/
    FinanceEvent/InvoiceCandidate/Invoice/Receivable/ApprovalRequest を **バッチ取得＋Map突合（N+1回避）**、
    既存 `computeGoldenPath` で進捗判定、`getCashflowBridgeData` で今月入金/支払予定を取得し、summarize → redact。
- **表示部品** `apps/web/components/golden-path-kpi.tsx`: `GoldenPathKpiGrid`／`AttentionList`（CEO・planning-hokko で再利用、page を薄く保つ）。
- **UI**:
  - `/dashboard/ceo`: 既存 Deal 中心 KPI は無改変のまま末尾に「プランニングホッコー Golden Path（経営KPI）」セクションを追加。
  - `/planning-hokko`: KPI グリッド＋「今すぐ見るべき案件」＋案件別進捗/次の一手。**既存の金額表示に finance ゲートを追加（軽微なセキュリティ是正）**。
  - `/operations/events/[id]`: Golden Path カードに経営ダッシュボードへの往復導線（planning-hokko／社長コックピット／資金繰り）。

### Golden Path KPI の定義
- **全体**: 進行中/完了件数・平均進捗（進行中案件平均）・今月開催/完了・低粗利数・高リスク数・未完了/遅延物流・
  人員未割当・Finance未接続・請求候補/正式請求未作成・未送信請求・未回収額・延滞額・入金済・今月入金/支払予定・承認待ち。
- **案件別**: 進捗%・次の一手・high/critical risk・未完了/遅延物流・人員割当・bridge/請求候補/正式請求/送信/入金 状態・
  売上/原価/粗利/粗利率・未回収額・延滞・承認待ち件数・詳細リンク。
- **「今すぐ見るべき案件」優先度**: 売掛延滞(100) > 高リスク(80) > 請求未送信(60) > 未回収(50) > 低粗利(40) >
  物流遅延(35) > 承認待ち(30) > Finance未接続(20)。理由の重み合計でスコア化し降順表示。

### 権限制御（finance ゲート）
- finance 機密（売上/原価/粗利/粗利率/未回収/延滞/入金済/入金・支払予定/低粗利判定）は `hasPermission(user,'finance','read')`。
- STAFF 等は **UI で隠すだけでなく `redactExecutiveFinance` で lib 段階から null 化**し、finance 由来の attention 理由
  （延滞/未回収/低粗利）も除外して優先度を再計算。進捗・リスク・物流・承認・next アクションは表示。

### テスト結果
- unit: `golden_path_dashboard.test.ts` **18 件**（平均進捗/低粗利/延滞/高リスク/優先度/redact可視性/全体集計）。合計 **186 passed**。
- integration: `p1_12_executive_dashboard.itest.ts` **6 件**（複数案件集計/未回収[invoice+payment+receivable+financeEvent]/
  低粗利・高リスク・物流遅延・承認待ち検出/tenant分離/STAFF redact）。合計 **73 passed**。
- e2e spec: `executive_dashboard.spec.ts`（CEO KPI 表示／planning-hokko 平均進捗・次の一手／event→dashboard 導線／
  STAFF は金額不可視）。サンドボックスのブラウザDL制約で未実行（実環境/CIで実行）。

### まだ残る弱点（正直な評価）
- **「今月完了」は completedAt 不在のため `status=completed かつ eventDate が当月` を代理ロジックで判定**（将来 `completedAt`
  追加で精緻化）。同様に「今月開催」は eventDate 基準。
- 経営 KPI は EventProject 起点のみ集約。Deal/見積由来の請求やイベント外 FinanceEvent は今月入金/支払予定の合算にのみ反映。
- リアルタイム集計（リクエスト毎の force-dynamic）。案件数が大規模化したらキャッシュ/集計テーブル化が必要（現状は中小規模前提）。
- ステップ4（リース/在庫予約統合）は引き続き未統合（P2）。

### 次に本当にやるべきこと
1. `EventProject.completedAt`（または完了 DomainEvent）導入で「今月完了/リードタイム」を正確化。
2. 「今すぐ見るべき案件」から各是正アクション（請求送信/督促/リスク対応）への深いディープリンク。
3. KPI のキャッシュ/集計テーブル化（規模拡大時）。
4. 承認種別 `invoice_finalize`／`invoice_send` 分離（可読性・監査性、03 参照）。

---

## Phase 1-13 — Golden Path Action Deep Links + completedAt + Approval 分離（2026-06-24）

目的: Phase 1-12 で「見える・気づく」を実現。本 Phase は **「すぐ対処する」導線**を整える。横展開なし・既存モデルのみ（completedAt の最小フィールド追加を除く）。

### Action Deep Links（reason → 是正アクション）
- 純ロジック `golden-path-actions.ts`: `buildGoldenPathActionLinks(kpi)` / `getGoldenPathActionForReason` / `visibleGoldenPathActions`（finance系を非financeで除外）。href 生成と finance 要否を一元管理（UI に散らさない）。
- reason→href: 延滞/未回収/未送信→`/invoices/{id}`（finance）、低粗利→`#finance-summary`（finance）、高リスク→`#risks`、物流遅延→`#logistics`、承認待ち→`/approvals`、Finance未接続→`#golden-path`（非finance）。invoiceId 欠如時は `#finance-summary` フォールバック。
- `AttentionList` に「対処」アクションボタンを追加。「次の一手（前進）」と「対処（是正）」を視覚的に区別。
- event detail に deep link 用アンカー `#golden-path / #finance-summary / #costs / #staff / #risks / #logistics / #proposals`。

### completedAt 精緻化（最小フィールド追加）
- `EventProject.completedAt DateTime?` 追加。`completeEventProject` でセット（loadOutAt 維持）。KPI「今月完了」は completedAt 優先・null 時のみ `status=completed かつ eventDate 当月` で代理（`isCompletedInMonth`）。理由は 12 に記録。

### Approval 種別分離
- `invoice_finalize`（候補→正式化＝内部確定）を `invoice_send`（外部送信）から分離。実行は後方互換（entityType='InvoiceCandidate' ＋ in[...]）。既存の外部送信/正式化フローは不変。

### 権限制御
- finance 系アクションは `requiresFinance` ＋ redact ＋ `visibleGoldenPathActions` で STAFF 非表示（深層防御）。invoiceId も redact 対象。非 finance（リスク/物流/承認/Bridge導線）は STAFF にも表示。Finance Bridge **実行**は引き続き finance:create。

### テスト
- unit **200 passed**: golden_path_actions（reason別 action/finance filter）＋ golden_path_dashboard（completedAt 優先/fallback/invoiceId redact）＋ approval（finalize/send 分離）。
- integration **80 passed**: `p1_13_golden_path_actions.itest.ts`（completedAt セット/集計・action link・redact・tenant分離・approval 分離）。
- e2e spec: `golden_path_actions.spec.ts`（是正アクション表示・高リスク→#risks・低粗利→#finance-summary・STAFF finance 非表示）。

### まだ残る弱点（正直な評価）
- 是正アクションは「該当箇所へジャンプ」まで（その場でワンクリック実行はしない）。
- completedAt は今後の新規完了に有効。過去の完了案件は completedAt=null のため fallback で集計。
- リードタイム/月次完了率の時系列分析は未実装（completedAt を起点に将来拡張可）。

### 次にやるべきこと
1. 是正アクション先での「その場ワンクリック実行」（請求送信/督促のインライン化）。
2. completedAt を用いたリードタイム・月次完了率の時系列 KPI。
3. `requestInvoiceSend` 等の関数名を実態（finalize）へリネーム（呼び出し元含む安全な範囲で）。

---

## Phase 1-14 — Golden Path Inline Corrective Actions（2026-06-24）

**位置づけ**: 「Golden Path 是正アクションの**インライン化**」であり横展開（新業務領域）ではない。IKEZAKI OS 全体（全世界企業のAI経営OS）に対しては**まだ初期段階**だが、**プランニングホッコー向け実用MVP**としては「見える→気づく→該当箇所へ飛ぶ→**その場で是正処理を進める**」まで到達し、Golden Path の実務性が一段上がった。

### 今回実装したもの（既存 action 再利用中心・新規 server action ゼロ・新規DBモデルゼロ）
- **物流遅延→完了**: event detail `#logistics` に未完了タスクの「完了」ボタン（既存 `updateLogisticsTaskStatusAction` 再利用）。`returnToEvent` opt-in 追加（案件詳細へ戻す。URL は DB の `task.eventId` で構築＝open-redirect 回避）。`/operations/logistics` の既存挙動は不変。完了で `status=done`＋`completedAt`＋Growth/Domain/Audit（既存）。承認不要・`inventory:update`。
- **高リスク→解消**: event detail `#risks` の「解消」ボタン（既存 `updateEventRiskStatusAction`、open/monitoring 対象、`inventory:update`）。
- **Finance未接続→Bridge**: Golden Path カードの「Finance Bridge へ進む」（既存 `bridgeEventToFinanceAction`、`finance:create`。STAFF には実行ボタンを出さず「財務担当がブリッジを行います」表示）。
- **請求書未送信→送信承認申請**: invoice detail の既存フロー（`requestInvoiceExternalSendApprovalAction`→承認→`executeApprovedInvoiceExternalSendAction`）。重複申請防止・承認ゲート・`EXTERNAL_SEND_ENABLED` を維持。
- **未回収/延滞→入金記録**: invoice detail の入金フォーム（既存 `recordPaymentAction`）。延滞時に「⚠️ 支払期日を過ぎています（延滞）」ヒント追加。
- **AttentionList 文言**: 実行性のある表現へ（「リスクを確認・解消」「物流タスクを確認・完了」「請求書送信を申請」「入金を記録」「Finance Bridgeへ進む」「原価・売上を見直す」）。

### 今回あえて実装しなかったもの
- **督促メールの実送信**（将来 Phase 候補。今回は延滞表示＋入金記録導線まで）。
- **外部メール送信の本格実装**（既存の承認ゲート経由フローのみ利用）。
- **低粗利の自動是正**（原価・売上の見直し導線=`#finance-summary` に留め、実行しない）。
- 横展開（会計本体/銀行API/OCR/契約/給与/労務/AI社員本体）。

### 権限制御
- finance系（入金記録/送信承認申請/承認済み送信実行/原価売上見直し/Finance Bridge実行）は `invoice:update`/`finance:create`、invoice detail は ABAC で非finance閲覧不可。AttentionList の finance系は redact＋`visibleGoldenPathActions` で STAFF 非表示。
- non-finance（リスク解消/物流完了）は `inventory:update`。承認実行は `approval:approve`。

### テスト
- unit **203**: `golden_path_actions.test.ts`（label 実行性・finance filter・low_margin 見直し導線）。
- integration **88**: `p1_14_inline_corrective_actions.itest.ts`（物流 done→completedAt・遷移規則・リスク resolved・finance:create RBAC・invoice_send 重複なし・入金で Invoice/Receivable/Payment/FinanceEvent 整合・tenant分離）。
- e2e spec: `golden_path_inline.spec.ts`（リスク解消/物流完了ボタン・送信申請/入金フォーム・STAFF finance非表示）。

### 残リスク
- 是正アクションは「その場で1アクション実行/申請」まで。複数ステップの一括処理や督促などの能動アウトリーチは未対応。
- 物流 `blocked` タスクは直接「完了」不可（todo/in_progress のみ。仕様どおりだが運用周知が必要）。
- 過去案件は `completedAt=null` のため「今月完了」は fallback 集計（混在）。

### 次に本当にやるべきこと
1. 督促（dunning）の**承認ゲート付き**ドラフト生成＋送信申請（実送信は承認後・EXTERNAL_SEND_ENABLED 準拠）。
2. completedAt を用いたリードタイム・月次完了率の時系列 KPI。
3. `requestInvoiceSend` 等の関数名リネーム（実態=finalize）。

### 本番確認が必要な項目（次回デプロイ後）
- event detail の物流「完了」ボタンで案件詳細に戻り `status=done`/`completedAt` が反映されること。
- invoice detail の送信承認申請→承認→送信、入金記録が本番で動作し、外部送信が必ず承認ゲートを通ること。
- STAFF で finance 系是正アクションが本番でも非表示であること。
