# 00. IKEZAKI OS 長期構想（Long Term Strategy） — Phase X-RM-01

> **既存プロンプト非破壊**の原則で作成。既存の IKEZAKI OS / 369 のプロンプト構成・機能・方針・安全ルール・Phase管理は一切変更しない。本書は「追加戦略ブロック」であり、既存方針の置換ではない。
> 種別: docs-only / roadmap design。実装・DB変更・課金・外部送信は一切含まない。

---

## 1. この文書の位置づけ

- Phase 1（統合AI経営OS + LeadMap AI の実用MVP）は**正式完了済み**（記録: `docs/audit/25_phase1_completion_record.md`）。
- 現在は **Phase X（短期品質フェーズ）**。E2E 検証基盤の実証（Phase X-02）まで完了し、品質改善を継続中。
- 本書は Phase X の途中で行う**方向整備**であり、チャットで追加採用された長期構想17領域を、既存方針を壊さずロードマップ・Feature Registry・各種 Matrix に落とすための最上位文書。
- ここに書かれた構想は**すべて「採用済み構想」だが「実装承認済み」ではない**。実装は各 Phase の入口で改めて人間承認を得る。

## 2. 長期ビジョン: Self-Evolving Agentic Business OS

369 / IKEZAKI OS は、中小企業向けの管理画面群から進化し、**人間社員と AI 社員が一緒に会社を動かす「自己進化型エージェント経営OS」**を目指す。

3つの柱:

1. **Company Brain（会社の頭脳）** — 会社方針・商品・会議・顧客課題・営業ナレッジを構造化し、AI が「その会社の文脈」で働ける知識基盤。
2. **Agent Workforce（AI社員）** — 役割・権限・予算・成果・監査ログを持つ AI 社員群（AI社員OS）。人間の Inbox と AI の Inbox が連携する。
3. **Decision & Action Gateway（安全な実行門）** — AI・MCP・API・外部ツール・将来のロボットが会社を動かすときも、危険操作は必ず承認・監査・証跡・二重実行防止・停止条件を通る。

この3本柱を、**Human Boundary（人間の境界）** と **Trust Center（信頼基盤）** が全体で包む。収益化（Usage-Based Billing 等）は Phase 8 まで実課金しない。

## 3. 追加採用済み構想 17領域の全体像

| # | 領域 | 一言でいうと | 主な送付先Phase |
|---|------|--------------|----------------|
| 1 | AI経営OS・AI社員系（AI社員OS / Agent Workforce Manager 等） | AI社員の役割・権限・成果・コストの管理 | Phase 4 中心（設計は Phase 2） |
| 2 | 会社知識・Company Brain系 | 会社の文脈をDB化しAIが理解する | **Phase 2 中心** |
| 3 | 営業AI・商品提案系（Consultative Sales AI 等） | 顧客に最適な提案・営業準備・下書き | **Phase 2 中心**（read-only/draft） |
| 4 | 採用・教育・育成系（Talent Graph 等） | 採用補助・オンボーディング・学習 | Phase 4〜5（設計は Phase 2） |
| 5 | 会議・議事録・ナレッジ変換系（Meeting Intelligence 等） | 会議を決定・タスク・教育資産に変換 | Phase 5（設計は Phase 2） |
| 6 | 安全実行・承認・監査系（Decision & Action Gateway 等） | 危険操作の承認・監査・停止 | Phase 2 で設計、以降全Phaseの土台 |
| 7 | 収益化・課金基盤系（Usage-Based Billing 等） | 利用量記録→将来の課金 | **Phase 8**（実課金はここまで凍結） |
| 8 | MCP / API / Developer Platform系（369 MCP/API Gateway 等） | 外部開発者・エージェント接続 | Phase 2 で内部scope設計、公開は将来 |
| 9 | 業務自動化・人間境界系（Human Boundary 等） | 何を自動化してよいかの台帳 | Phase 2 で分類確立 |
| 10 | Workflow・業務実行系（Workflow Fabric 等） | 承認付き業務フローの実行基盤 | Phase 2 設計、実行は Phase 4 以降 |
| 11 | 請求・売上・キャッシュ系（Revenue & Cash Autopilot 等） | 未回収・入金予測・督促下書き | Phase 3（高リスク・承認必須） |
| 12 | 文書・契約・資料AI系（Document Intelligence 等） | 契約書・請求書・議事録の解析 | Phase 3〜5（設計は Phase 2） |
| 13 | Trust Center・セキュリティ系（Global Trust Center 等） | データ分類・アクセスレビュー・同意 | Phase 2 baseline、本格は Phase 9 |
| 14 | 外部連携・Integration系（Integration Hub 等） | Google/Slack/会計/銀行等の連携 | Phase 2 分類のみ、実装は将来 |
| 15 | Marketplace・業種展開系 | テンプレート・スキルの流通 | Phase 7（分類は Phase 2） |
| 16 | Enshin OS統合系 | Enshin OS 機能の棚卸し・369 への吸収 | Phase 2-F でインベントリ化 |
| 17 | ロボット・物理世界連携系（Robot / External Tool Gateway） | 物理操作の安全境界（実行は禁止） | future / blocked（境界定義のみ） |

全機能の個別分類は `docs/roadmap/02_feature_registry.md` を正とする。

## 4. 実装しないもの / future / blocked の宣言

長期構想に含まれていても、以下は**現時点で実装しない**。

- **実課金・実決済・Stripe live 連携・runtime 課金判定** → **Phase 8** まで凍結（`docs/roadmap/05_monetization_matrix.md`）。
- **MCP/API の外部公開** → 将来（future）。Phase 2 では read-only の内部 scope 設計まで（`docs/roadmap/06_mcp_api_exposure_matrix.md`）。
- **Automation Level L5 以上（承認済み実行・限定自律・自律運転）** → future / blocked（`docs/roadmap/08_automation_level_taxonomy.md`）。
- **ロボット実行指示・物理世界に影響する操作** → **blocked**。分類・安全境界・監査設計のみ。
- **採否決定・自動不採用・社員評価確定・給与・昇給・解雇判断** → **human-only（恒久）**。AI は補助・要約・基準整理まで。
- **無承認の外部送信・実メール送信・Webhook実送信・SNS/口コミ量産** → blocked。外部送信は承認ゲート＋抑止リスト必須の既存ルールを維持。

## 5. 既存資産との関係（壊さないもの）

- UsageEvent 8種類（すべて `usage_only`・非課金記録）は現状を維持。正本は `docs/audit/usage_event_emit_matrix.md`。
- RBAC（AI に外部送信・承認・削除なし）、承認制（`ApprovalRequest`）、監査ログ（`writeAudit` / `writeDataAccess`）、SSRF ガード（`safeFetch`）、抑止リスト（`SuppressionList`）は長期構想でも**全構想の前提**とする。
- 状態管理ルール（doc22: PROGRESS=履歴 / CURRENT_STATE=現在地 / git refs が正）を維持。
- Phase 1 完了の事実・基準 commit（`e95f887`）・本番確認 GO 記録（doc14）は変更しない。

## 6. Phase 送付方針（サマリー）

- **Phase X（現行）**: 品質・検証基盤。E2E red の最小修正（X-03）等。長期構想の実装はしない。
- **Phase 2**: Company Brain / CRM / Sales AI の **read-only・draft・recommend 中心**の安全拡張＋各種分類の確立（詳細: `docs/roadmap/01_phase2_master_roadmap.md`）。
- **Phase 3**: Quote-to-Cash / 請求・入金・会計入口（高リスク・承認必須）。
- **Phase 4**: AI社員基盤（Agent Registry / Runs / Budget / Safety）。
- **Phase 5**: Meeting / Transcript / Knowledge 変換。
- **Phase 6**: 経営ダッシュボード（Business Twin の入口）。
- **Phase 7**: 業種テンプレート / Marketplace。
- **Phase 8**: 課金・クレジット・SaaS化（実課金はここで初めて解禁を検討）。
- **Phase 9**: Enterprise / SSO / SCIM / compliance（Global Trust Center 本格化）。
- **Phase Y**: 事業・導入・GTM。

## 7. 安全原則（長期構想にも適用）

既存安全ルールを弱めない。加えて長期構想には以下を適用する。

1. すべての新機能は Feature Registry に登録し、Risk / Automation Level / Human Boundary / Monetization / MCP/API Exposure を分類してから設計に入る。
2. 危険操作（外部送信・契約・請求・支払・削除・エクスポート・人事・物理操作）は Decision & Action Gateway（将来）または既存 `requiresApproval` を必ず通す。
3. AI の生成物は必ず下書き。AI は外部送信・承認・削除権限を持たない（ROLE_PERMISSIONS 不変）。
4. 「検証していないものを成功扱いしない」— E2E 基盤（Phase X-02 で実証済み）を Phase 2 以降の出口条件に組み込む。
5. 迷ったら停止して人間に確認する。

> 本書は構想の分類・整理であり、いかなる機能の実装承認でもない。各 Phase の着手は個別の人間承認を必要とする。
