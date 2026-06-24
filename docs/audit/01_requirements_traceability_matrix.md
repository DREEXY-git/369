# 01 — 要件トレーサビリティマトリクス

凡例: ✓=実装あり / △=部分・薄い / ✗=無し
状態: **完成** / 部分 / 見せかけ(モデル/画面だけ) / ダミー / **未実装**

| # | 領域 | DB | Action/API | UI | Worker | AI | RBAC | Audit | Test | 状態 | 主な不足・次アクション |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|---|
| 1 | リアルタイム連動基盤(Event/Outbox/Webhook) | ✗ | ✗ | ✗ | △ | ✗ | ✗ | △ | ✗ | **未実装** | EventLog/DomainEvent/Outbox/WebhookSubscription/Delivery、Idempotency、EventBus。**最優先の屋台骨** |
| 2 | 経営ダッシュボード | ✓ | △ | ✓ | △ | ✓ | △ | △ | ✗ | 部分 | KPI実データ接続済+チャート追加済。drill-down/期間比較/部門比較、test |
| 3 | AI経営参謀(CFO/COO等) | ✓ | △ | △ | △ | ✓ | △ | △ | ✗ | 部分 | 役割別エージェント、提案の構造化出力、銀行/士業向け資料生成 |
| 4 | 会計・財務・決算 | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **見せかけ** | Account/JournalEntry/TrialBalance はモデルのみ。**仕訳/試算表/決算書UI・確定ロック・承認 全欠如** |
| 5 | キャッシュフロー可視化 | ✓ | △ | ✓ | ✗ | △ | △ | △ | ✗ | 部分 | 13週/30/90/12mo 予測、ショート予測、CASHFLOW_FORECAST_JOB 未登録 |
| 6 | AI-OCR・自動仕訳 | △ | ✗ | △ | ✗ | ✗ | ✗ | ✗ | ✗ | **未実装** | OCRResult/Receipt モデル無し、**OCR Provider 無し**、仕訳候補生成 無し |
| 7 | 請求・入金・債権管理 | ✓ | △ | ✓ | △ | ✗ | △ | △ | ✗ | 部分 | 消込/督促/回収リスクAI、INVOICE_OVERDUE_JOB |
| 8 | 電子契約 | △ | △ | △ | ✗ | △ | △ | △ | ✗ | 部分 | ElectronicSignatureRequest 無し、署名Provider 無し、締結後の自動連動 |
| 9 | CRM・顧客管理 | ✓ | ✓ | ✓ | ✗ | ✓ | △ | △ | ✗ | 部分(良) | タイムライン/インサイト/編集あり。離脱予測・温度感の本実装、test |
| 10 | 営業管理 | ✓ | ✓ | ✓ | ✗ | △ | △ | △ | ✗ | 部分 | 日報/失注分析/売上予測の実装、AIフィードバック |
| 11 | LeadMap AI | ✓ | ✓ | ✓ | ✓ | ✓ | △ | △ | △ | **部分(最良)** | 規約遵守メタは保持。送信は下書き+承認あり。reply分類/route最適化の深化、test |
| 12 | AI見積・提案 | ✓ | ✓ | ✓ | ✗ | △ | △ | △ | ✗ | 部分 | 価格妥当性/粗利不足AI、提案書自動生成、電子契約連携 |
| 13 | **看板制作AI見積** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **未実装** | SignageEstimate + 13マスタ + 原価/粗利ロジック + UI。**フラッグシップ欠如** |
| 14 | 案件・プロジェクト管理 | △ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **未実装** | 汎用 Project/ProjectTask/Gantt 無し(EventProject はイベント特化) |
| 15 | タスク・ワークフロー | △ | ✗ | △ | ✗ | △ | ✗ | ✗ | ✗ | 見せかけ | Task/Workflow/Template 無し。/tasks は ActionItem 表示のみ |
| 16 | 人事・労務・勤怠 | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **見せかけ** | 多数モデル有も **UI/Action 皆無**。勤怠/給与/シフトの実運用導線 |
| 17 | 従業員位置情報 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **未実装** | Location/Consent/Geofence/AccessLog 無し。**同意・明示・閲覧ログ 必須** |
| 18 | 録音・議事録AI | ✓ | △ | ✓ | ✓ | ✓ | △ | △ | ✗ | 部分 | 録音同意/明示UI、話者分離、CallRecording連携 |
| 19 | 在庫・倉庫管理 | △ | △ | ✓ | ✗ | △ | △ | △ | ✗ | 部分 | Warehouse/InventoryItem/Movement/Stocktake/PO 薄い。発注点/棚卸 |
| 20 | EC・販売管理 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **未実装** | ECStore/Order/Cart/Shipment/Coupon、在庫・会計連動 |
| 21 | 自動マーケティング | △ | ✗ | ✗ | ✗ | △ | ✗ | ✗ | ✗ | 見せかけ | Email/Line/SMS Campaign/AutomationFlow 無し、配信承認 |
| 22 | AIコールセンター | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **未実装** | CallSession/Agent/Script/IVR、Telephony/Voice Provider |
| 23 | AI社員・アシスタント | ✓ | △ | ✓ | △ | ✓ | △ | △ | ✗ | 部分 | 役割/権限/参照データ設定、実行ゲート、評価、グループ会話 |
| 24 | AIマネージャー | △ | ✗ | ✗ | ✗ | △ | ✗ | ✗ | ✗ | 未実装 | 部署別AI管理職、進捗/負荷/エスカレーション |
| 25 | 報連相AI | ✓ | △ | ✓ | ✗ | △ | △ | △ | ✗ | 部分 | 報告漏れ/放置検知、緊急度判定、AI報告文生成 |
| 26 | 社内ノート・ナレッジ(RAG) | ✓ | △ | ✓ | ✓ | ✓ | △ | △ | ✗ | 部分 | **RBAC/機密ラベルでの retrieval フィルタ検証**、信頼度、削除/再生成 |
| 27 | ファイル・ドキュメント管理 | △ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 見せかけ | FileObject のみ。S3 signed URL/版/共有権限/検索UI |
| 28 | 補助金・助成金DB | ✓ | △ | ✓ | ✗ | △ | △ | △ | ✗ | 部分 | 期限アラート、申請書ドラフト、士業連携 |
| 29 | 士業連携 | ✓ | △ | ✓ | ✗ | ✗ | △ | △ | ✗ | 部分 | 相談チケット/資料共有/手数料 |
| 30 | セキュリティ・権限・監査 | ✓ | ✓ | ✓ | △ | ✗ | ✓ | △ | △ | 部分 | **ABAC/PolicyEngine、MFA/SSO/SCIM、writeDataAccess 拡充、改ざん検知** |
| 31 | バックアップ・復元 | ✓ | ✗ | ✗ | △ | ✗ | ✗ | △ | ✗ | 見せかけ | RestorePoint UI、巻き戻し、JSON/CSV export、暗号化設計 |
| 32 | 外部SaaS連携 | ✓ | ✗ | ✗ | ✗ | △ | ✗ | △ | ✗ | 見せかけ | Provider/Mock/Sync/Webhook検証/token refresh、連携UI |
| 33 | SaaS運営・課金 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **未実装** | TenantPlan/Subscription/Usage/AIPointLedger、課金UI |
| 34 | 業種別テンプレート | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **未実装** | IndustryTemplate/KPI/Dashboard/見積ロジック |
| 35 | 導入診断・改善ロードマップ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **未実装** | OnboardingDiagnosis/ImprovementRoadmap/ROISimulation |
| 36 | 予実管理・経営計画 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **未実装** | Budget/BudgetActual/ScenarioPlan、予実差異 |
| 37 | 通知・アラート | ✓ | △ | ✓ | △ | △ | △ | △ | ✗ | 部分 | チャネル別(Slack/LINE/メール)Provider、通知センター強化 |
| 38 | モバイル/PWA | ✗ | n/a | △ | n/a | n/a | n/a | n/a | ✗ | 未実装 | manifest/Service Worker。レスポンシブ+モバイルドロワーは実装済 |
| 39 | AI実行基盤・LLM管理 | ✓ | △ | △ | △ | ✓ | △ | △ | △ | 部分 | Gemini/OCR/Voice、cost/usage、ToolPermissionChecker、HumanApprovalGate実装 |
| 40 | 会社の記憶化・永久学習 | ✓ | △ | △ | ✓ | ✓ | △ | △ | ✗ | 部分 | =26と連動。信頼度/鮮度、退職者ノウハウ保全 |

## 集計

- **完成**: 0
- 部分(実データ接続あり): 18
- 見せかけ(モデル/画面のみ): 8
- **未実装**: 14

→ 「完成」と呼べる領域は現時点で **ゼロ**。最も完成度が高いのは **LeadMap**（DB/UI/Worker/AI/承認/規約遵守が一通り通っている）。最も致命的な欠如は **#1 連動基盤 / #4 会計 / #13 看板見積 / #16 人事 / #17 位置情報 / #20 EC / #22 コールセンター / #33 課金**。

## Phase 1-2 更新（2026-06-23）

- **#1 リアルタイム連動基盤**: 未実装 → **部分**。DomainEvent/OutboxMessage/Webhook(署名検証) を新設、`emitDomainEvent`/`dispatchDomainEvent`/`deliverWebhook` を実装。顧客作成で `CUSTOMER_CREATED` を実発火→フォロータスク自動生成（DB/Action/Handler/Test 接続）。8-1〜8-4 のハンドラ実装済（QUOTE_APPROVED/CONTRACT_SIGNED/PAYMENT_RECEIVED/MEETING_MINUTES_CREATED）。
- **#30 セキュリティ・権限・監査**: 部分 → **強化(部分)**。ABAC Policy Engine(純関数)＋PolicyDecisionLog、機密参照ログ(DataAccessLog 拡張＋専用 Location/Recording)、承認ゲート関数群、同意基盤(ConsentPolicy/ConsentGrant) を実装。顧客詳細に ABAC＋機密参照ログを組込み。
- 新規管理UI: `/admin/data-access-logs`・`/admin/policy-decisions`・`/admin/events`・`/admin/compliance/consents`。
- 残: 位置/録音の「機能本体」UI、ABAC の全 detail/edit への横展開。

## Phase 1-3 更新（2026-06-24）

- **#1 連動基盤**: 部分 → **強化**。worker に `OUTBOX_DISPATCH_JOB`（15秒間隔・retry・dead-letter・JobRun・audit）追加。web から手動実行も可（`/admin/jobs`）。
- **#7 請求 / #5 財務**: Audit列を改善。`invoices/[id]`・`finance` に ABAC（FINANCIAL_CONFIDENTIAL）＋機密参照ログを組込み（staff は拒否）。
- **#17 従業員位置情報**: 未実装 → **部分**。EmployeeLocationLog ＋ `/admin/location-access`（同意＋勤務時間ゲート、LocationAccessLog 記録、拒否理由表示）。
- **#18 録音・議事録**: `meetings/[id]` の文字起こしを録音同意ゲート化（RecordingAccessLog）。本体 ABAC（meeting.label）も組込み。
- **#26 ナレッジ**: 検索に AI 参照ログ（DataAccessLog）追加（機密ラベルフィルタは既存）。
- **#30 セキュリティ**: 承認ゲートを実経路へ（危険操作5種の申請＋承認済みexport実行）。JobRun 基盤（`/admin/jobs`）。
