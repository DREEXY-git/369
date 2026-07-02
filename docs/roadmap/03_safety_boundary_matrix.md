# 03. Safety Boundary Matrix（安全境界マトリクス） — Phase X-RM-01

> 既存プロンプト非破壊・docs-only。既存の安全ルール（CLAUDE.md・各フェーズプロンプトの停止条件）を**弱めず**、追加構想17領域に適用する安全境界を1枚に固定する。
> 関連: Human Boundary は `04_human_boundary_matrix.md`、Automation Level は `08_automation_level_taxonomy.md`。

---

## 1. 大原則

1. **AIは外部送信・承認・削除を持たない**（ROLE_PERMISSIONS の AI_AGENT / AI_ASSISTANT を変更しない）。
2. 危険操作（外部送信/契約/請求/支払/削除/エクスポート/人事/物理操作）は必ず承認（ApprovalRequest、将来は Decision & Action Gateway）を通す。
3. AI の生成物は必ず下書き。実行は人間承認後のみ。
4. すべての危険操作に監査ログ（writeAudit）、機密参照に writeDataAccess。
5. 迷ったら停止して人間に確認。検証していないものを成功扱いしない。

## 2. 領域別 Safety Boundary

| 領域 | 危険操作 | AIが自動でよい範囲 | 人間承認が必須の範囲 | 停止条件（即中断） | 監査ログ |
|---|---|---|---|---|---|
| DB / schema / migration | schema変更・migration・db push/reset | なし（読み取り分析のみ） | すべての schema/migration（個別承認） | 未承認 migrate 要求・本番DB接続の気配 | 必須 |
| 認証 / RBAC | ロール権限変更・認証方式変更 | なし | すべて。特に AI ロール権限は**変更自体を原則禁止** | AI権限の拡大を要求された場合 | 必須 |
| 課金 / billing | 実課金・runtime課金判定・課金分類の変更 | UsageEvent（usage_only）の閲覧・集計 | Phase 8 まで**実課金は全面禁止**（承認でも不可＝人間の Phase 判断が先） | billable_candidate の runtime 使用検知 | 必須 |
| 決済 / payment | 決済処理・Stripe live・資金移動 | なし | Phase 8 まで全面禁止 | 決済API・資金移動の実装要求 | 必須 |
| 請求 / 会計 / 契約 | 請求発行・会計仕訳・契約締結 | read-only 分析・下書き（Dunning Draft 等） | 発行・送信・締結・修正すべて | 金額計算ロジックの無承認変更 | 必須 |
| 給与 / 人事決定 | 採否決定・評価確定・給与・昇給・解雇 | 補助（要約・質問案・基準整理）のみ | **承認でも AI は決定しない（human-only）** | AIに採否・評価を「決めさせる」要求 | 必須（人間操作も記録） |
| 個人情報 / PII | PII の表示・エクスポート・外部AI送信 | マスキング済みデータの分析 | エクスポート・外部送信・高機密閲覧 | 生PIIの外部LLM送信検知（maskText 未経由） | 必須＋writeDataAccess |
| 外部送信（メール/Webhook/SNS） | 実メール・Webhook実送信・SNS投稿 | 下書き作成・宛先分析（suppression 確認込み） | すべての実送信（EXTERNAL_SEND_ENABLED＋承認＋抑止確認） | 抑止リスト未確認送信・大量送信の気配 | 必須（OutreachSendLog 等） |
| MCP / API 公開 | エンドポイント公開・scope付与・key発行 | 内部設計・分類（docs） | 公開は現時点で**全面禁止**（future。公開前条件は doc06） | 公開・外部疎通の実装要求 | 必須 |
| 本番環境 | 本番DB操作・Vercel環境変数・本番デプロイ設定 | なし（本番確認は利用者実測のみ） | すべて | 本番接続文字列の使用気配 | 必須 |
| ロボット / 物理操作 | ロボット実行指示・物理機器制御 | なし（分類・設計 docs のみ） | **現時点は承認があっても実行しない（blocked）** | 物理実行の要求 | 必須（将来） |
| Workflow 実行 | 外部送信・金銭・人事を含むフロー実行 | Dry Run・フロー設計・テンプレ分類 | Approval Step を含まない危険フローは作成自体を禁止 | 承認ステップの省略要求 | Workflow Audit 必須 |
| Marketplace | 出品・課金・外部コード導入 | 分類・カテゴリ設計 | 出品審査・導入承認（将来） | 未審査コードの導入要求 | 必須 |
| Enshin OS 統合 | 未確認機能の実装 | インベントリ・分類（docs） | 実装はすべて個別承認 | 詳細未確認のまま実装に進む気配 | 必須 |

## 3. 実行禁止領域（承認の有無に関わらず現時点で禁止）

- 実課金・実決済・Stripe live 連携・runtime 課金判定（Phase 8 の人間判断まで）。
- MCP/API の外部公開。
- ロボット実行指示・物理世界に影響する操作。
- 採否決定・自動不採用・社員評価確定・給与・昇給・解雇判断（恒久 human-only）。
- Automation Level L5 以上の実行系自動化。
- 無承認の外部送信・実メール送信・Webhook実送信・SNS/口コミ量産。
- AI ロール（AI_AGENT / AI_ASSISTANT）への外部送信・承認・削除権限の付与。

## 4. 将来の安全装置の位置づけ（Phase 2-D 設計 → Phase 4 実装）

| 装置 | 役割 | 現時点の代替 |
|---|---|---|
| Decision & Action Gateway 2.0 | 危険操作の単一実行門（分類→承認→実行→証跡） | ApprovalRequest＋requiresApproval |
| Action Escrow | 実行の一時保留と取り消し猶予 | 承認待ち状態 |
| Risk Score | 操作ごとの危険度自動算定 | requiresApproval の静的分類 |
| Dry Run | 本実行前の乾式実行 | FakeLLM / Demo provider |
| Execution Receipt | 実行結果の証跡（何を・誰が・いつ・何に基づき） | writeAudit |
| Duplicate Guard | 二重実行防止 | idempotencyKey（UsageEvent 実装済みパターン） |
| Kill Switch / Emergency Stop | 即時停止 | EXTERNAL_SEND_ENABLED 等の env フラグ |
| Two-person Approval | 高危険操作の二人承認 | 単独承認（将来強化） |
| Rollback Plan | 巻き戻し手順の事前定義 | 手動リカバリ |

## 5. 運用

- 新機能はまず Feature Registry（doc02）で Risk / AL / HB を分類し、本 Matrix の該当行に従う。
- 本 Matrix の変更は docs-only であっても人間承認を必要とする（安全境界の緩和は特に）。
- 監査記録: `docs/audit/28_long_term_strategy_integration.md`。
