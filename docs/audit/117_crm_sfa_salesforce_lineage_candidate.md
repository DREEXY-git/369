# 117. CRM / SFA / Salesforce Mini Lineage Candidate — docs/roadmap/18 の記録（docs-only・369-vault非編集）

- 日付: 2026-07-06
- 種別: **docs-only / commit-only**（Lineage設計の記録。コード差分ゼロ・369-vault非編集・実同期なし）
- Audit Doc: 117
- Product Phase: Strategy / CRM / SaaS Catalog / AI Workforce Infrastructure
- Lineage: Strategy / CRM-SFA Lineage
- Stage: CRM/SFA Salesforce Mini Lineage Design (Candidate)
- Status: READY / GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `1f32d6ca2a7edcdb2d3046926aede88b22ae231c`
- Scope: 369が内包・代替・外部連携するCRM/SFA/Salesforce Mini 領域（Lead〜商談化〜引き継ぎ）を `docs/roadmap/18` の Lineage Candidate として記録
- Not Included: 実装・schema変更・migration・外部SaaS連携実装・OAuth設定・SaaS契約判断・Salesforce連携の実装済み扱い・Customer Pain本実装・Developer Cloud/Marketplace/PLUG/Employee App の実装・外部送信・実LLM・AIコスト・本番確認・push・高機密ラベル runtime 解禁
- Next Action: doc117 push-only（別承認）または CRM 最小縦切り実装可否判断（別の重い承認）
- Do Not Start: 実装 / schema変更 / migration / 外部SaaS連携実装 / OAuth / SaaS契約判断 / 外部送信 / 実LLM / AIコスト / 本番確認 / 369-vault編集 / 高機密ラベル runtime 解禁

## 1. 非エンジニア向け要約

- 今回は、doc116 で正本反映した「組み込み予定SaaSカタログ」の**最初の個別深掘り**として、**CRM / SFA / Salesforce Mini（顧客管理・営業支援）**を、369がどう内包・代替・連携するのかを **GitHub正本 docs に整理しただけ**の回です。
- 「AIが営業をどこまで手伝えて、どこから人間承認か」を明確にしました。**AIの営業メールは下書きのみ**、**外部送信は人間承認（Human Certification Gate）必須**、**AI単独の契約・値引き・請求・送信は禁止**です。
- これは**設計（Candidate）の記録**であり、実装ではありません。**実装なし**・**schema変更なし**・**migrationなし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**。**Salesforce 等の外部連携も実装していません（例示に留め、契約判断なし）**。**369-vault は一切触っていません**。

## 2. 今回作成した docs（GitHub正本側・Candidate）

- `docs/roadmap/18_crm_sfa_salesforce_lineage_candidate.md` — CRM/SFA/Salesforce Mini の位置づけ・内包/代替機能候補（Lead / Account / Contact / Deal / Opportunity / Pipeline / Activity / Task / Note / Customer 360 / Sales Playbook / Quote・Contract・Invoice handoff）・外部連携候補・AI営業提案（下書き固定）・Human Certification Gate・tenantId/RBAC/writeAudit/writeDataAccess/Data Classification・PII/顧客情報の扱い・Company Brain / AI Growth Engine / CPQ / Contract / Invoice / ERP 接続候補・Service/Marketing/Data Cloud 境界・Phase対応・収益ポイント・moat・やらないこと・承認ゲートを整理。

## 3. 既存docsとの関係

- 上位カタログ: `docs/roadmap/17`（組み込み予定SaaSカタログ・区分①にCRM/SFA/Salesforce Mini）。本書はその CRM/SFA 部分の深掘り・**補完**であり置換しない。
- 上位概念: `docs/roadmap/09`（AI Workforce Infrastructure）。成長/安全: `docs/roadmap/15`。PII設計: `docs/audit/114`。メール営業ルール: `CLAUDE.md`。

## 4. 明記したルール（恒久）

- 本 Lineage は **Candidate**。**実装・契約・API連携・DB化・schema化・正式採用ではない**。schema/画面/外部連携は各々別承認。
- **AI営業メールは下書きのみ**（OutreachDraft）・**外部送信は Human Certification Gate 必須**（承認後 decideApprovalAction）・**AI単独の契約/値引き/請求/送信は禁止**。
- **tenantId 必須・RBAC 判定・writeAudit・writeDataAccess・Data Classification** を通す。顧客 PII は高機密ラベル前提で runtime 解禁は別承認。
- **顧客 PII を company-brain-reference に注入しない**・生クレーム全文/通話録全文は保存しない（`docs/audit/114` 継承）。
- **CRM は商談まで**を主担当とし、**Service Cloud（CS/チケット）・Marketing Cloud（MA/広告）・Data Cloud（BI/CDP）は別 Lineage・別承認**として境界を明確化した（本書では踏み込まない）。
- 特定SaaS名は**例示に留め**、SaaS契約判断はしない。**GitHubが正本・Obsidianは閲覧・369-vaultを直接編集しない**。

## 5. 今回やらなかったこと

- 実装・schema変更・migration・外部SaaS連携実装・OAuth・SaaS契約判断・Salesforce連携の実装済み扱い。
- Customer Pain本実装・Developer Cloud/Marketplace/PLUG/Employee App の実装・高機密ラベル runtime 解禁。
- docs/roadmap の大幅改変・既存 audit docs の一括編集・369-vault編集・docs/10_obsidian 既存ルールの確定化・実同期。
- 外部送信・実LLM・AIコスト・本番確認・本番DB・本番deploy・push。

## 6. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `1f32d6ca2a7edcdb2d3046926aede88b22ae231c`・working tree clean・`origin/main..HEAD` 空・doc117/roadmap18 未存在・roadmap17 存在）。
- 作成物: `docs/roadmap/18_crm_sfa_salesforce_lineage_candidate.md` を新設。
- 369-vault 非編集: `git status --short -- 369-vault` = 空（実測）。
- 封印維持: company-brain-reference への AI注入 0・`anonymized: true` 2・apps の Customer Pain runtime 0・`node scripts/check-company-brain-safety.mjs` exit 0（実測）。

## 7. Assumption Log

- 本 Lineage は Candidate であり、**実装・契約・連携の確定ではない**。
- CRM/SFA の語彙は `docs/roadmap/17` と既存 LeadMap AI 用語を踏襲。
- 特定SaaS名（Salesforce/HubSpot/kintone 等）は例示に留め、契約判断はしない。
- PII の扱いは `docs/audit/114` の非保存方針を継承。369-vault は未編集。

## 8. Unknowns Log

- CRM/SFA の最初の縦切り範囲（Lead のみ / Lead+Deal / Pipeline まで）。Contact PII を保存する時期と Data Classification runtime 解禁の境界。外部CRM連携の具体的SaaS選定・移行方式・双方向同期の可否。Sales Playbook を Company Brain のどのテーブルに載せるか。Customer 360 集約の実装順序。

## 9. Risk Register

- AI が顧客へ勝手に送信するリスク → 下書き固定＋Human Certification Gate＋isSuppressed。
- 顧客 PII の漏えい/AI混入リスク → Data Classification＋writeDataAccess＋company-brain-reference 非注入。
- 外部CRM連携を実装済みと誤読するリスク → 区分②は例示・未実装の候補と明記。
- Candidate を正式採用と誤読するリスク → Candidate・別承認を明記。
- 大量送信で迷惑扱いされるリスク → 同意/抑止/送信ログ/承認を必須と明記。
- 未push commit の揮発リスク → doc117 push-only（別承認）で解消。

## 10. Definition of Done

- [x] `docs/roadmap/18` に CRM/SFA/Salesforce Mini の内包・代替機能候補・外部連携候補・AI営業提案・Human Certification Gate・PII/権限/監査・接続候補・境界・Phase・収益・moat・やらないこと・承認ゲートを網羅。
- [x] AI営業メールは下書きのみ・外部送信は人間承認・AI単独禁止を明記。
- [x] Candidate・別承認・369-vault非編集・実装なしを明記。
- [x] CURRENT_STATE / PROGRESS にポインタ追記・docs/10_obsidian ダッシュボード入口に1行追記（GitHub docs側のみ）。
- [x] 許可5ファイルのみで Gate 全 green・safety script exit 0。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 11. 次回推奨プロンプト案

1. **doc117 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 17項目報告）。
2. **CRM 最小縦切り実装可否判断**（Lead のみ／Lead+Deal／Pipeline まで・schema要否は別の重い承認）。
3. 次の Lineage 深掘り（例: Finance / Procurement / Inventory Lineage・docs-only・別承認）。

## 12. 判定

**判定: READY / GO**（369が内包・代替・連携するCRM/SFA/Salesforce Mini 領域を、`docs/roadmap/18` の Lineage Candidate として記録した）。

ただし、これは実装・契約・連携の確定ではない。**docs-only**・**Candidate**・**実装なし**・**schema変更なし**・**migrationなし**・**外部連携実装なし**・**OAuth設定なし**・**SaaS契約判断なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
