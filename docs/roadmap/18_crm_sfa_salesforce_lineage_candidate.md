---
doc: roadmap/18
title: CRM / SFA / Salesforce Mini Lineage Candidate
status: Candidate
area: roadmap/crm-sfa-lineage
phase: Phase 0-20 / AI Workforce Infrastructure candidate
risk: docs-only
date: 2026-07-06
related:
  - docs/roadmap/17_embedded_saas_catalog_candidate.md
  - docs/roadmap/09_ai_workforce_infrastructure_definition_candidate.md
  - docs/roadmap/11_developer_cloud_marketplace_strategy_candidate.md
  - docs/roadmap/15_zero_ad_growth_and_ai_safety_boundaries_candidate.md
  - docs/audit/114_customer_pain_schema_design.md
---

# 18. CRM / SFA / Salesforce Mini Lineage Candidate

> 種別: **docs-only / Candidate**。**GitHubが正本**・**Obsidianは閲覧**。**369-vault は直接編集しない**（本ミッションでは触っていない）。
> 状態: **Candidate**（Official ではない）。**実装・契約・API連携・DB化・schema化・正式採用ではない**。
> 位置づけ: `docs/roadmap/17`（組み込み予定SaaSカタログ）の区分①「CRM / SFA / Salesforce Mini」を**最初の個別深掘り**として具体化した Lineage docs。

## 1. 目的

369 / IKEZAKI OS が **内包・代替・外部連携するCRM/SFA領域**（Lead〜商談化〜引き継ぎ）を、非エンジニアでも「何を自前で持ち・何を外部SaaSに任せ・AIにどこまでやらせて・どこから人間承認か」を判断できるように GitHub docs 側へ正本記録する。**実装ではない**。

## 2. 背景

369 の中核は **LeadMap AI**（地図×AIの新規開拓OS：リード抽出→AI分析→個別営業メール→承認→送信→追客→商談化）。CRM/SFA はこの営業活動の記録・進捗・引き継ぎを担う土台である。既存の中小企業は Salesforce 等の大型CRMを使いこなせないことが多く、**「Salesforce Mini（必要十分で安全なCRM/SFA）」を AI Workforce Infrastructure 上に内包**することが狙い。

## 3. 既存docsとの関係

- 上位カタログ: `docs/roadmap/17`（区分①内包・代替 / 区分②外部連携）。本書はその CRM/SFA 部分の深掘り。
- 上位概念: `docs/roadmap/09`（AI Workforce Infrastructure・8層/4層）。
- 成長/安全境界: `docs/roadmap/15`（広告費ゼロ成長・AI Safety境界・Human Certification Gate）。
- 顧客機微データ設計: `docs/audit/114`（Customer Pain schema設計・PII非保存の考え方を継承）。
- メール営業ルール: `CLAUDE.md`（ConsentRecord / SuppressionList / OutreachDraft / OutreachSendLog / decideApprovalAction）。

## 4. doc116 SaaSカタログとの関係

- `docs/roadmap/17` 区分① の「CRM / SFA / Salesforce Mini / Lead / Contact / Account / Deal / Pipeline」を、本書で機能候補・境界・承認ゲート・Phase・収益・moat まで**1段深く**記述する。
- 本書は Candidate であり、`docs/roadmap/17` を置換しない補完。**1カテゴリずつ別承認**の原則を踏襲。

## 5. Candidate / Official の区別

- 本 Lineage は **Candidate**。**実装・契約・API連携・DB化・schema化・正式採用ではない**。
- Salesforce 等の**外部連携は実装済み扱いにしない**（例示に留め、契約判断はしない）。
- schema/画面/Server Action/外部連携は、それぞれ**別の人間承認**を要する。

## 6. CRM / SFA / Salesforce Mini の位置づけ

- **CRM（顧客関係管理）**: 顧客・取引先・連絡先・活動履歴・Customer 360。
- **SFA（営業支援）**: リード〜商談〜受注のパイプライン・タスク・売上予測。
- **Salesforce Mini**: 大型CRMの必要十分な縮図。中小企業が**使い切れる**範囲に絞り、AI社員が安全に補助する。

## 7. 369が内包・代替するCRM/SFA機能候補（区分①）

> いずれも Candidate。schema/画面/Server Action は別承認。物理削除なし・ソフトアーカイブ前提・tenantId 必須。

- **Lead（リード）** — LeadMap AI からの抽出リード。source/placeId/fetchedAt/expiresAt 等の帰属情報を保持（Google由来ルール遵守）。
- **Account（取引先）** — 企業・組織単位。
- **Contact（連絡先）** — 個人単位。**PII の扱いは §16 に従う**。
- **Deal / Opportunity（商談）** — 金額・確度・フェーズ・想定クローズ日。
- **Pipeline（パイプライン）** — フェーズ遷移とステージ管理。
- **Activity / Task / Note（活動・タスク・メモ）** — 電話/訪問/メール履歴・ToDo・メモ。
- **Customer 360** — 顧客に紐づく方針/商談/活動/請求引き継ぎの一望（read-only 集約から段階実装）。
- **Sales Playbook（営業プレイブック）** — 業種別トーク/手順のテンプレート（Company Brain 連携）。
- **Quote handoff / Contract handoff / Invoice handoff（引き継ぎ）** — 見積/契約/請求への**引き継ぎ点のみ**を持ち、CPQ/契約/会計の確定は各領域＋人間承認に委ねる。

## 8. 外部連携する可能性のあるSaaSカテゴリ（区分②）

> 特定企業名は**例示に留め**、契約判断・実装はしない。連携は OAuth/SSRFガード/送信承認を伴う別承認。

- **CRM / SFA 系** — 例: Salesforce / HubSpot / kintone（**例示・契約判断なし**）。既存CRMからの移行・双方向同期候補。
- **MA / 広告 系** — マーケティングオートメーション・広告効果測定（`docs/roadmap/15` AI Growth Engine と接続）。
- **メール / カレンダー 系** — Google Workspace / Microsoft 365 のメール・予定（外部送信は Human Certification Gate）。
- **チャット / 通知 系** — Slack / Teams / LINE への通知。
- **名刺 / 企業データ 系** — 名刺管理・企業DB（取り込みは許諾データのみ）。

## 9. AI営業提案 / AIの役割と境界

- **AI営業提案**: リード分析・優先度付け・次アクション提案・トーク提案を**下書き・提案**として生成する。
- **AI営業メールは下書きのみ**（`OutreachDraft`）。**送信は `/approvals` 承認後、`decideApprovalAction` 経由**。
- **外部送信は Human Certification Gate 必須**（`EXTERNAL_SEND_ENABLED=true` ＋ 人間承認時のみ）。送信前に `isSuppressed` で抑止確認、返信の `detectUnsubscribeRequest` は `SuppressionList` へ。
- **AI単独の契約・値引き・請求・送信は禁止**（`ROLE_PERMISSIONS` の AI_AGENT/AI_ASSISTANT は外部送信・承認・削除を持たない）。
- AI は法務/税務/財務を断定助言しない。リスク・確認観点・専門家相談候補に留める。

## 10. 権限・監査・機密（tenantId / RBAC / writeAudit / writeDataAccess / Data Classification）

- **tenantId**: 全レコードにスカラの `tenantId`。クエリは必ず `tenantId` でスコープ（Tenant へのリレーションは張らない）。
- **RBAC**: `packages/shared/rbac.ts`（10ロール×8アクション）。CRM 操作は `hasPermission` 判定を通す。**RBAC定義は本書では変更しない**。
- **writeAudit**: 作成・編集・アーカイブ・引き継ぎ・承認申請などの変更系は監査ログ。
- **writeDataAccess**: 機密（Contact の PII 等）参照時は閲覧ログ（本文・PII をログに入れない）。
- **Data Classification**: ラベル（NORMAL / INTERNAL / CONFIDENTIAL / CUSTOMER_CONFIDENTIAL）。顧客機微は高機密ラベル前提（`docs/audit/108-114` の設計を継承・**runtime解禁は別承認**）。

## 11. Company Brain との接続

- Sales Playbook・会社方針・商品カタログは **Company Brain**（`/brain/*`）から参照（read-only・NORMAL/INTERNAL・`canAccessLabel`）。
- 外部LLM送信時は `externalAiAllowed=true` ＋ `maskText` 済みのみ（既定は注入ゼロの安全側）。**company-brain-reference は本書では変更しない**。

## 12. AI Growth Engine との接続

- リード獲得〜育成〜商談化のループを `docs/roadmap/15` の**広告費ゼロ成長ループ**と接続。**虚偽口コミ・ステマ・なりすまし禁止**。効果測定は下書き提案に留め、外部発信は人間承認。

## 13. Human Certification Gate との接続

- 危険操作（外部送信・契約・請求・値引き・大量送信）は `requiresApproval` で承認必須。
- AI生成物は必ず下書き（`ApprovalRequest` を作る）。**人間が承認して初めて外部作用**（Human Certification Gate）。

## 14. CPQ / Contract / Invoice / ERP への接続候補

- CRM は**引き継ぎ点（handoff）**のみを持つ。
- **CPQ / Quote**: 商談確定時に見積作成へ引き継ぐ（CPQ 実装は別承認）。
- **Contract**: 契約は e-sign 候補を含め**別領域＋人間承認**。AI単独の契約確定は禁止。
- **Invoice / AR**: 受注後の請求は会計領域へ引き継ぐ。AI単独の請求確定は禁止。
- **ERP / EPM**: 売上見込みは経営計画へ連携（Oracle Mini 縮図・別承認）。

## 15. Service Cloud / Marketing Cloud / Data Cloud との境界

- **Service Cloud（CS/チケット）**: 受注後のサポートは別 Lineage。CRM は商談までを主担当とし、CS へ引き継ぐ。
- **Marketing Cloud（MA/広告）**: 獲得前のマーケは AI Growth Engine 側。CRM は獲得後のリード管理を主担当。
- **Data Cloud（BI/CDP）**: 全社データ統合・KPI は Data Cloud 側。CRM は自領域データを提供する立場。
- 本書は CRM/SFA の**境界を明確化**し、各 Cloud の実装には踏み込まない（別 Lineage・別承認）。

## 16. PII / 顧客情報の扱い

- **入れてよい**: tenantId / 会社名 / 商談金額・確度・フェーズ / 活動日時 / 担当 userId 参照。
- **扱い注意（高機密・別承認）**: Contact の氏名・電話・メール・住所などの PII。**保存は Data Classification（CUSTOMER_CONFIDENTIAL 候補）＋writeDataAccess 前提**で、runtime 解禁は別承認。
- **入れない / 別承認**: 生のクレーム全文・失注理由生テキスト・通話録全文・外部公開フラグ（`docs/audit/114` の「入れてはいけない列」を継承）。
- **AI に読ませない範囲**: 顧客 PII は company-brain-reference に注入しない。

## 17. Phase対応（詳細）

> 要約: 本 CRM/SFA Lineage は **事業ロードマップ Phase 2（Salesforce Mini / CRM基盤）** を主対象とし、**Phase 0（Core OS / 安全基盤）・Phase 1（Company Brain 基盤）** を前提、**Phase 3-19（AI Growth Engine / Human Certification Gate / Oracle Mini・ERP / Data Cloud / Service Cloud / Marketing Cloud / Enterprise Governance）** を隣接、**PDF系 OS本体 Phase 2.5-18** と **戦略構想 Phase 18.5-26** を将来接続として位置づける。**いずれも本書では実装しない（docs-only / Candidate）**。

### 17-1. 今回の作業Phase

- 作業レーン: **Strategy / SaaS Catalog / CRM-SFA Lineage / Documentation Governance**。
- 種別: **docs-only / Candidate / commit-only**。
- **今回は CRM 実装Phaseではない**（Phase 2 CRM/SFA の設計候補を記録するだけ）。実装・schema・migration・外部連携・OAuth・SaaS契約判断はしない。

### 17-2. 事業ロードマップ Phase 0-20 における位置

- **主対象Phase — Phase 2: Salesforce Mini / CRM基盤**。
  - 対象機能: 顧客管理 / 連絡先管理 / リード管理 / 商談管理 / パイプライン / 活動履歴 / タスク / AI営業提案。
  - LeadMap AI を起点に **Lead→Deal→Pipeline の薄い縦切り**（最小CRUD＋権限＋監査＋デモデータ）を一気通貫する前提。
- **前提Phase**
  - **Phase 0: Core OS / 安全基盤** — tenantId / RBAC / writeAudit / writeDataAccess / Approval / Human Certification Gate の土台（既に基盤あり）。
  - **Phase 1: Company Brain 基盤** — 会社方針 / 商品 / Sales Playbook / 顧客事例 / FAQ / Company Brain参照（Phase 2-A で foundation 完了）。
- **隣接Phase**
  - **Phase 3: AI Growth Engine** — 獲得〜育成ループ（接続候補）。
  - **Phase 4: Human Certification Gate** — 外部送信・契約・請求の承認境界。
  - **Phase 5: Oracle Mini / ERP基盤** — 売上見込み〜経営計画への handoff 候補。
  - **Phase 12: Data Cloud / BI** — 分析・KPI 接続候補。
  - **Phase 13: Service Cloud / Customer Success** — 受注後サポート（別 Lineage）。
  - **Phase 14: Marketing Cloud / PR / SEO** — 獲得前マーケ・外部発信（別 Lineage）。
  - **Phase 19: Enterprise Governance** — エンタープライズ統制の将来要件。

### 17-3. PDF系 OS本体 Phase 2.5-18 との対応

- **OS本体 Phase 2.5: 初期MVP** — CRM の read-only 集約から着手（Company Brain foundation に接続）。
- **OS本体 Phase 4: Brain拡充** — Sales Playbook / 会社方針を Company Brain に拡充し CRM から参照。
- **OS本体 Phase 5: AI社員テンプレ化** — 営業AI社員のテンプレート化（下書き提案・承認境界つき）。
- **OS本体 Phase 7: Fit-Gap Engine** — 既存CRMからの移行/差分分析（外部連携は別承認）。
- **OS本体 Phase 8: β外部提供** — CRM/SFA を含む β 提供（外部送信は Human Certification Gate）。
- **OS本体 Phase 9-10: GA / 一般提供** — CRM/SFA の一般提供。
- いずれも **read-only 集約 → 人間書き込み → AI提案（下書き）→ 承認送信** の順で段階実装（今回は実装しない）。

### 17-4. 戦略構想 Phase 18.5-26 との対応

- **Phase 20: AI Employee Studio Template** — 営業AI社員を Studio でテンプレ化（将来接続候補）。
- **Phase 22: SDK & Developer Portal** — CRM 連携ツールを SDK / Developer Portal で提供（将来接続候補）。
- **Phase 23: Safety Review & Certification** — 営業AI・連携ツールの安全審査/認証（将来接続候補）。
- **Phase 24: 369 Marketplace Launch** — Sales Playbook / 営業AI社員の Marketplace 流通（将来接続候補）。
- **Phase 26: Open AI Workforce Economy** — AI社員経済圏への CRM/SFA 接続（将来接続候補）。
- **いずれも今回実装しない**（Developer Cloud / Marketplace / Open AI Workforce Economy は将来接続候補）。

### 17-5. Phase境界と今回やらないこと

- **今回は Phase 2 のCRM実装ではない**。**Phase 2 CRM/SFA の設計候補**である。
- **Phase 3 AI Growth Engine** は接続候補であり**今回実装しない**。
- **Phase 4 Human Certification Gate** は承認境界であり**今回実装しない**。
- **Phase 5 Oracle Mini / ERP** への接続は handoff 候補であり**今回実装しない**。
- **Phase 12 Data Cloud / BI** は分析接続候補であり**今回実装しない**。
- **Phase 13 Service Cloud / CS** は別 Lineage であり**今回実装しない**。
- **Phase 14 Marketing Cloud / PR / SEO** は外部公開・投稿・配信を**しない**。
- **Phase 19 Enterprise Governance** は将来要件として記録するだけ。
- **Phase 20 / 22 / 23 / 24 / 26** の Developer Cloud / Marketplace / Open AI Workforce Economy は将来接続候補であり**今回実装しない**。

## 18. 収益ポイント

- 基本料（CRM/SFA を含むテナント月額）
- AI営業提案の稼働量（AI社員稼働量）
- Company Brain 参照量（Playbook/方針参照）
- 外部連携コネクタ利用料（CRM/MA/メール連携・別承認）
- 商談〜請求引き継ぎに伴う上位機能（CPQ/契約/会計）へのアップセル
- Sales Playbook テンプレートの Marketplace 手数料候補

## 19. moat（参入障壁）

- LeadMap AI × 地図データ × 帰属管理の運用実績。
- Company Brain に蓄積された会社ごとの営業ナレッジ（Playbook）。
- Permission / Approval / Audit の運用履歴（安全な営業自動化の実績）。
- Human Certification Gate による「AIが暴走しない営業」の信頼。
- CRM データ × AI社員 Runtime の相互依存（`docs/roadmap/13` IP moat と接続）。

## 20. やらないこと（Do Not Build / 今回の非対象）

- **AI単独の外部送信 / 契約 / 値引き / 請求 / 送金 を禁止**（Human Certification Gate 必須）。
- **虚偽口コミ・ステマ・なりすまし・非開示アフィリエイト禁止**。
- **大量迷惑送信を助長する実装をしない**。
- 顧客 PII の生テキスト・通話録全文の保存（`docs/audit/114` 継承）。
- 本書での実装・schema変更・migration・外部連携実装・OAuth・SaaS契約判断。

## 21. 承認ゲート

- **schema/画面/Server Action の実装**: それぞれ別の人間承認。
- **外部連携（CRM/MA/メール）**: OAuth/SSRF/送信承認を伴う別承認。
- **外部送信**: Human Certification Gate（`EXTERNAL_SEND_ENABLED=true` ＋ 承認）。
- **高機密ラベル runtime 解禁**: `docs/audit/112` の停止条件から別の重い承認。

## 22. Evidence Map

- 上位カタログ: `docs/roadmap/17`（実測・区分①にCRM/SFA/Salesforce Mini あり）。
- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `1f32d6ca2a7edcdb2d3046926aede88b22ae231c`・working tree clean・`origin/main..HEAD` 空）。
- 封印維持: `node scripts/check-company-brain-safety.mjs` exit 0（実測）。
- 369-vault 非編集: `git status --short -- 369-vault` 空（実測）。
- メール営業ルール継承: `CLAUDE.md`（OutreachDraft / SuppressionList / decideApprovalAction）。

## 23. Assumption Log

- 本 Lineage は Candidate であり、**実装・契約・連携の確定ではない**。
- CRM/SFA の語彙は `docs/roadmap/17` と既存 LeadMap AI 用語を踏襲。
- 特定SaaS名（Salesforce/HubSpot/kintone 等）は例示に留め、契約判断はしない。
- PII の扱いは `docs/audit/114` の非保存方針を継承。369-vault は未編集。

## 24. Unknowns Log

- CRM/SFA の最初の縦切り範囲（Lead のみ / Lead+Deal / Pipeline まで）。
- Contact PII を保存する時期と Data Classification runtime 解禁の境界。
- 外部CRM連携の具体的SaaS選定・移行方式・双方向同期の可否。
- Sales Playbook を Company Brain のどのテーブルに載せるか。
- Customer 360 集約の実装順序（read-only から）。

## 25. Risk Register

- AI が顧客へ勝手に送信するリスク → 下書き固定＋Human Certification Gate＋`isSuppressed`。
- 顧客 PII の漏えい/AI混入リスク → Data Classification＋writeDataAccess＋company-brain-reference 非注入。
- 外部CRM連携を実装済みと誤読するリスク → 区分②は例示・未実装の候補と明記。
- Candidate を正式採用と誤読するリスク → Candidate・別承認を全体に明記。
- 大量送信で迷惑扱いされるリスク → 同意/抑止/送信ログ/承認を必須と明記。
- CRM が肥大し薄い縦切りが崩れるリスク → 「Lead→Deal→Pipeline の薄い縦切り優先」を明記。

## 26. Definition of Done

- [x] CRM/SFA/Salesforce Mini の内包・代替機能候補（Lead〜handoff）を列挙。
- [x] 外部連携候補（CRM/MA/広告/メール/カレンダー）を例示に留めて記載。
- [x] AI営業提案・下書き固定・外部送信の Human Certification Gate・AI単独禁止を明記。
- [x] tenantId/RBAC/writeAudit/writeDataAccess/Data Classification/PII の扱いを明記。
- [x] Company Brain / AI Growth Engine / Human Certification Gate / CPQ・契約・請求・ERP 接続候補・Service/Marketing/Data Cloud 境界を明記。
- [x] Phase対応・収益ポイント・moat・やらないこと・承認ゲートを記載。
- [x] docs-only（コード差分ゼロ）・safety script exit 0・369-vault非編集。

## 27. 次回推奨プロンプト案

1. **doc117 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 17項目報告）。
2. **CRM 最小縦切り実装可否判断**（Lead のみ／Lead+Deal／Pipeline まで・schema要否は別の重い承認）。
3. 次の Lineage 深掘り（例: Finance / Procurement / Inventory Lineage・docs-only・別承認）。

## 28. 判定

**判定: READY / GO**（369が内包・代替・連携するCRM/SFA/Salesforce Mini 領域を、`docs/roadmap/18` の Lineage Candidate として整理した）。

ただし、これは実装・契約・連携の確定ではない。**docs-only**・**Candidate**・**実装なし**・**schema変更なし**・**migrationなし**・**外部連携実装なし**・**OAuth設定なし**・**SaaS契約判断なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
