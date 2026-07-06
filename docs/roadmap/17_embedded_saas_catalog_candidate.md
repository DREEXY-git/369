---
doc: roadmap/17
title: 369 / IKEZAKI OS 組み込み予定SaaSカタログ Candidate
status: Candidate
area: roadmap/saas-catalog
phase: Phase 0-20 / AI Workforce Infrastructure candidate
risk: docs-only
date: 2026-07-06
related:
  - docs/roadmap/09_ai_workforce_infrastructure_definition_candidate.md
  - docs/roadmap/10_roadmap_phase_0_26_connection_candidate.md
  - docs/roadmap/11_developer_cloud_marketplace_strategy_candidate.md
  - docs/roadmap/12_plug_commerce_employee_app_strategy_candidate.md
  - docs/roadmap/13_ip_moat_strategy_candidate.md
  - docs/roadmap/14_function_master_231_252_candidates.md
  - docs/roadmap/15_zero_ad_growth_and_ai_safety_boundaries_candidate.md
  - docs/roadmap/16_github_obsidian_369vault_relationship_and_next_actions_candidate.md
---

# 17. 369 / IKEZAKI OS 組み込み予定SaaSカタログ Candidate

> 種別: **docs-only / Candidate**。**GitHubが正本**・**Obsidianは閲覧**。**369-vault は直接編集しない**（本ミッションでは触っていない）。
> 状態: **Candidate**（Official ではない）。実装・契約・API連携・DB化・正式採用ではない。
> 位置づけ: `docs/roadmap/09-16`（AI Workforce Infrastructure / Developer Cloud / Marketplace / PLUG / Employee App / IP moat / Obsidian関係）の**補完カタログ**。既存docsを**置換しない**。

## 1. 目的

369 / IKEZAKI OS が将来どのSaaS領域を **内包（自前で持つ）・代替（既存SaaSを置き換える）・外部連携・Marketplace化・将来候補（保留）** にするのかを、**非エンジニアでも判断できる一覧**として整理する。

これは「多機能SaaSの寄せ集め」を作る宣言ではない。**369は法人活動のインフラであり、AI社員が安全に働くための AI Workforce Infrastructure**である。そのインフラの上で、どのSaaSカテゴリを内包・代替・連携・Marketplace化・将来候補にするのかを地図として持つことが目的である。

## 2. 既存docsとの関係

- 本書は `docs/roadmap/09-16` の**補完**であり、既存docsを**置換しない**。
- 上位概念: `docs/roadmap/09`（AI Workforce Infrastructure定義・8層/4層）。
- Phase接続: `docs/roadmap/10`（三系統ロードマップ Phase 0-26）。
- Developer Cloud / Marketplace: `docs/roadmap/11`。PLUG / Employee App: `docs/roadmap/12`。IP moat: `docs/roadmap/13`。
- Candidate Function: `docs/roadmap/14`（Function Master 231-252・**正式昇格しない**）。
- 成長/安全境界: `docs/roadmap/15`。GitHub/Obsidian/369-vault: `docs/roadmap/16`。

## 3. Candidate / Official の区別

- 本カタログは **Candidate** である。**実装・契約・API連携・DB化・schema化・正式採用ではない**。
- 各カテゴリの実装・外部連携・契約判断は、**1カテゴリずつ個別の人間承認**を要する。
- Function Master 231-252 は Candidate 扱いのままで、**正式昇格しない**。
- Candidate note は GitHub 反映後に official 扱い（`docs/roadmap/16`）。

## 4. 分類ルール（6区分）

| 区分 | 意味 | 承認の重さ |
|---|---|---|
| **① 内包・代替候補** | 369が自前で持ち、既存SaaSを置き換える | 重い（schema/画面/権限/監査/本番） |
| **② 外部連携候補** | 369が外部SaaSとAPI/OAuthで連携する | 重い（OAuth/SSRF/送信承認） |
| **③ Marketplace / Developer Cloud 候補** | 第三者がAI社員/ツールを作り流通する面 | 重い（Safety Review/Billing） |
| **④ PLUG / Employee App 候補** | 従業員導線・購買・個人分離 | 重い（透明性/私的購買分離） |
| **⑤ Candidate保留** | 方向はあるが今は決めない | docs-only |
| **⑥ Do Not Build / 禁止** | 作らない・AI単独でやらせない | 恒久禁止 |

> **重要**: ①②③④は方向性の Candidate であり、**実装済み扱いにしない**。⑥は恒久禁止。

## 5. 369が内包・代替する予定のSaaSカテゴリ（区分①）

> いずれも**カテゴリ**であり、**特定製品の置き換えを約束するものではない**。実装は1カテゴリずつ別承認。

- **Core OS / IAM / SSO / RBAC / 監査ログ / 承認 / Trust Center** — 全機能の土台。tenantId スコープ・10ロール×8アクション・`writeAudit`・`requiresApproval`・Trust Center（透明性の窓口）。
- **Company Brain / Knowledge Base / Wiki / Docs / RAG / Data Classification** — 会社の頭脳。会社方針/商品カタログ/ナレッジ・機密ラベル（NORMAL/INTERNAL/CONFIDENTIAL/CUSTOMER_CONFIDENTIAL）・RAG参照は `writeDataAccess`。
- **CRM / SFA / Salesforce Mini / Lead / Contact / Account / Deal / Pipeline** — LeadMap AI を中核とする新規開拓〜商談化。
- **CPQ / Quote / Contract / e-sign候補 / Revenue Lifecycle** — 見積・契約・電子署名は候補。**AI単独の契約確定は禁止**。
- **AI Growth Engine / Marketing Analytics / 広告効果 / PR / SEO / MA / CDP候補** — 広告費ゼロ成長ループ（`docs/roadmap/15`）。**ステマ・虚偽口コミ・なりすまし禁止**。
- **Human Certification Gate / Workflow / Approval / Risk Review** — AIの生成物は下書き。危険操作は人間承認（Human Certification Gate）。
- **Finance / Accounting / Invoice / AR / AP / Expense / Cash Flow** — 会計・請求・入出金・経費・資金繰り。**AI単独の会計確定/送金は禁止**。
- **Oracle Mini / ERP / EPM / GRC / Internal Control** — 統合基幹・経営計画・内部統制の縮図（中小企業向け）。
- **Procurement / Purchase / Vendor / 3-Way Match / Enterprise Procurement** — 購買・仕入・取引先・3-way match（発注/入荷/請求照合）。
- **Inventory / SCM / Warehouse / Asset / Lease / Logistics** — 在庫・供給網・倉庫・資産・リース・物流。
- **Commerce / EC / Order Management / POS候補 / Subscription** — 受注・EC・POS候補・サブスク。
- **Service Cloud / CS / Ticket / Contact Center / Customer Success** — 問い合わせ・チケット・カスタマーサクセス。
- **HCM / ATS / HRIS / LMS / Skill / Training / Attendance候補** — 人事・採用・教育・スキル・勤怠候補。
- **Payroll / Evaluation（後半候補）** — 給与・人事評価は**後半候補**で、**AI単独確定を禁止**（Human Certification Gate 必須）。
- **Data Cloud / BI / KPI Dictionary / Analytics / Observability** — データ基盤・BI・KPI辞書・可観測性。
- **Integration Hub / API / Webhook / Connector / iPaaS / MCP候補** — 連携基盤・Webhook・コネクタ・MCP候補。
- **Developer Cloud / Agent SDK / CLI / Sandbox / Agent Manifest / Tool Manifest** — AI社員開発基盤（`docs/roadmap/11`）。
- **AI Employee Studio / Block Builder / Template Builder** — AI社員をノーコードで組み立てる面（Candidate）。
- **Marketplace / AI社員ストア / Creator Portal / Safety Review** — AI社員・ツールの流通と安全審査（`docs/roadmap/11`）。
- **Billing / Metering / Revenue Share / Partner Payout候補** — 課金・従量計測・レベニューシェア・パートナー支払候補。
- **PLUG Commerce / Browser Extension / Price Compare / Coupon / Affiliate Disclosure** — 購買支援（`docs/roadmap/12`）。**非開示アフィリエイト禁止**。
- **369 Employee App / Task / Approval / FAQ / AI相談 / 福利厚生 / 個人購買分離** — 従業員アプリ（`docs/roadmap/12`）。**私的購買履歴を会社管理者に見せない**。
- **Industry Cloud / Sector Templates** — 業種別テンプレート（Candidate）。
- **Security / Privacy / Legal Ops / Consent / eDiscovery / Incident / BCP** — セキュリティ・プライバシー・法務運用・同意管理・証拠開示・インシデント・事業継続。
- **Docs / Audit / Prompt / GitHub Evidence / Obsidian Knowledge** — 設計記録・監査・プロンプト・GitHub証拠・Obsidian知識（本docs体系そのもの）。

## 6. 外部連携する予定のSaaSカテゴリ（区分②）

> 特定企業名は**例示に留め**、契約判断はしない。連携は OAuth/SSRFガード/送信承認を伴う別承認。

- **Google Workspace / Microsoft 365 系** — メール・カレンダー・ドキュメント・ID。
- **Slack / Teams / LINE / Email / Calendar 系** — 通知・チャット・予定連携。
- **会計ソフト / 請求 / 決済 / 銀行連携 系** — 例: freee / マネーフォワード 等（**例示・契約判断なし**）。
- **CRM / MA / 広告 / Analytics 系** — 既存CRM・広告・解析との橋渡し。
- **EC / Marketplace / POS / Shipping 系** — 例: Shopify / 各種モール / 配送（**例示**）。
- **HR / ATS / 勤怠 / 給与 系** — 人事・採用・勤怠・給与SaaSとの連携。
- **Storage / Docs / Notion / Wiki 系** — 外部ストレージ・ドキュメント・Wiki。
- **GitHub / CI / Monitoring / Security Review 系** — 開発・CI・監視・セキュリティレビュー。
- **SSO / SCIM / SIEM / DLP 系** — エンタープライズID・プロビジョニング・監査・情報漏えい対策。
- **Payment / Billing / Tax / E-invoicing 系** — 決済・課金・税・電子インボイス。

## 7. 収益源 / キャッシュポイント

- 基本料（テナント月額）
- 従量課金（利用量）
- AI社員稼働量（Runtime稼働）
- Company Brain参照量（RAG参照）
- Tool API呼び出し（Tool Manifest経由）
- Developer Cloud利用料
- Marketplace手数料
- Revenue Share（クリエイター配分）
- Safety Review / Certification（安全審査・認証）
- PLUG手数料候補（購買支援）
- Enterprise Support（法人サポート）
- Trust / Procurement Package（信頼・調達パッケージ）

## 8. 参入障壁 / moat

- Company Brain蓄積（会社ごとの頭脳データ）
- Permission / Approval / Audit の運用履歴（統制の実績）
- AI社員 Runtime依存（動かす基盤の内在化）
- Agent Manifest / Tool Manifest（AI社員とツールの規格）
- Safety Review / Certification（安全審査の関門）
- Marketplace流通（クリエイター経済圏）
- Billing Meter（課金計測の内在化）
- 企業内導線 / Employee App（従業員接点）
- PLUG購買ネットワーク（購買導線）
- GitHub Evidence Repository（設計・監査の証拠）
- Obsidian Knowledge Graph（知識グラフ）
- IP moat（特許・商標・営業秘密候補・`docs/roadmap/13`／**要専門家確認**）

## 9. 禁止・安全代替（区分⑥ Do Not Build）

- **虚偽口コミ・ステマ・なりすまし禁止**。
- **AI単独の請求 / 送金 / 契約 / 採用合否 / 給与評価 / 会計確定 を禁止**（Human Certification Gate 必須）。
- **従業員の私的購買履歴を会社管理者へ見せない**（PLUG / Employee App の個人購買分離）。
- **非開示アフィリエイト禁止**（Affiliate Disclosure 必須）。
- **外部送信は人間承認**（`EXTERNAL_SEND_ENABLED=true` ＋ 承認時のみ）。
- **実LLM / AIコストは承認制**（env未設定は Fake で動作）。
- **安全代替**: 断定せず**下書き・提案・承認申請・Human Certification Gate・監査ログ**に留める。AIは法務/税務/労務/財務を断定助言しない（リスク・確認観点・専門家相談候補に留める）。

## 10. Phase対応（要約）

- **事業 Phase 0-20**: 立ち上げ〜収益化〜拡大の事業軸（`docs/roadmap/10`）。区分①の縦切り（CRM→会計→在庫→…）を薄く通す。
- **OS本体 Phase 2.5-18（PDF系統）**: Company Brain foundation（Phase 2-A 完了）から機能拡張。区分①の内包・代替を段階実装。
- **戦略構想 Phase 18.5-26**: Developer Cloud / Marketplace / PLUG / Employee App / AI社員経済圏（区分③④）。
- 各Phaseとも**内包→連携→Marketplace化**の順で、1カテゴリずつ別承認。詳細対応表は `docs/roadmap/10`。

## 11. 次アクション

- **push-only**（本doc116を feature → main へ fast-forward・別承認）。
- **1カテゴリずつ個別深掘り**（例: CRM Lineage / Finance Lineage / Procurement Lineage を独立docs化）。
- **実装は別承認**（schema/画面/Server Action/外部連携/契約判断は本書の範囲外）。

## 12. Evidence Map

- 既存戦略docs: `docs/roadmap/09-16`（実測・本書はその補完）。
- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `8070acf5b8ca0b88c7d5ed986f56749588238162`・working tree clean・`origin/main..HEAD` 空）。
- 封印維持: `node scripts/check-company-brain-safety.mjs` exit 0（実測）。
- 369-vault 非編集: `git status --short -- 369-vault` 空（実測）。

## 13. Assumption Log

- 本カタログは Candidate であり、**関係・契約・実装の確定ではない**。
- カテゴリ名は既存 `docs/roadmap/09-16` の語彙を踏襲し、既存docsを置換しない補完として追加した。
- 特定企業名は例示に留め、SaaS契約判断はしない。
- 369-vault は未編集（GitHub正本を維持）。

## 14. Unknowns Log

- 各カテゴリの内包 / 連携 / Marketplace化の**優先順位と時期**。
- 外部連携の**具体的なSaaS選定と契約条件**。
- Billing Meter / Revenue Share の**具体的な料率**。
- Payroll / Evaluation を内包する**時期と承認境界**。
- どのカテゴリを最初に個別深掘り（Lineage独立docs化）するか。

## 15. Risk Register

- 「多機能SaaSの寄せ集め」に見えるリスク → **AI Workforce Infrastructure**という上位概念（`docs/roadmap/09`）を先頭に明記。
- Candidate を実装済み・契約済みと誤読するリスク → 全区分に **Candidate・別承認**を明記。
- 外部連携を実装済み扱いするリスク → 区分②は OAuth/SSRF/送信承認を伴う**未実装の候補**と明記。
- AI単独で危険操作をさせるリスク → 区分⑥ Do Not Build と Human Certification Gate を明記。
- 従業員私的購買の可視化リスク → 個人購買分離を明記。
- カテゴリ肥大で縦切りが薄くなるリスク → 「1カテゴリずつ別承認」「薄い縦切り優先」を明記。

## 16. Definition of Done

- [x] `docs/roadmap/17` に内包・代替 / 外部連携 / Marketplace / PLUG / Employee App / 収益源 / moat / 禁止・安全代替 / Phase対応 / 次アクションを網羅。
- [x] 6区分の分類ルールと、区分①のSaaSカテゴリを抜け漏れなく列挙。
- [x] 特定企業名は例示に留め、契約判断をしない。
- [x] Candidate・別承認・369-vault非編集・実装なしを明記。
- [x] docs-only（コード差分ゼロ）・safety script exit 0。

## 17. 判定

**判定: READY / GO**（369が内包・代替・連携・Marketplace化・将来候補にするSaaS領域を、`docs/roadmap/17` の Candidate カタログとして抜け漏れなく整理した）。

ただし、これは**関係・契約・実装の確定ではない**。**docs-only**・**Candidate**・**369-vault非編集**・**実装なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**・**company-brain-reference変更なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
