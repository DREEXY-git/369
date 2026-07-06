---
doc: roadmap/21
title: CRM Lead-only 実装スプリント可否 最終判断 Candidate（docs-only）
status: Candidate
area: roadmap/crm-lead-only-implementation-gate
phase: 事業 Phase 2 Salesforce Mini / CRM基盤 / PDF Phase 2.5 初期MVP
risk: docs-only
date: 2026-07-06
related:
  - docs/roadmap/20_crm_lead_only_minimum_design_candidate.md
  - docs/audit/119_crm_lead_only_minimum_design.md
  - docs/roadmap/19_crm_minimum_vertical_slice_candidate.md
  - docs/audit/118_crm_minimum_vertical_slice_decision.md
---

# 21. CRM Lead-only 実装スプリント可否 最終判断 Candidate（docs-only）

> 種別: **docs-only / Candidate / commit-only**。**GitHubが正本**・**Obsidianは閲覧**。**369-vault は直接編集しない**。
> 状態: **Candidate**（Official ではない）。**実装・schema変更・migration・画面・Server Action・RBAC変更・外部送信ではない**。

## 1. 目的

GitHub 正本反映済みの doc118（`docs/roadmap/19`・CRM最小縦切り判断）と doc119（`docs/roadmap/20`・Lead-only 最小設計）を前提に、**CRM Lead-only を次の実装スプリントへ進めてよいか**を docs-only で最終判断する。**今回は実装しない**。

## 2. 既存docsとの関係

- 直接の上位: `docs/roadmap/20` / `docs/audit/119`（Lead-only 最小設計）・`docs/roadmap/19` / `docs/audit/118`（3案比較・推奨案A）。
- Lineage: `docs/roadmap/18`。PII設計継承: `docs/audit/114`。上位概念: `docs/roadmap/09`。実装ルール: `CLAUDE.md`。

## 3. Candidate / Official の区別

- 本書は **Candidate / docs-only**。**実装着手は §30 の別承認文言に基づく別の重い人間承認**。schema/migration/画面/Server Action は本書で決めない/作らない。

## 4. doc119 の要約

- Lead-only は Lead 1テーブル（会社名・拠点名レベル・source・placeId・fetchedAt・expiresAt・status・担当 userId・社内メモ・archivedAt）に限定。
- **Contact PII（氏名/電話/メール/住所）は初期範囲に入れない**。tenantId 必須・RBAC・writeAudit・NORMAL/INTERNAL のみ・company-brain-reference 非注入・AIは下書きのみ・外部送信なし。

## 5. 実装に進むための判断項目

- (a) 実装範囲が Lead 1テーブル＋最小CRUD＋一覧に収まるか。
- (b) Contact PII を持たずに価値が出るか（営業デモ可能か）。
- (c) 権限は既存で暫定可能か（`crm:*` 新設を避けられるか）。
- (d) schema/migration が「1テーブル1本」に収まるか。
- (e) 安全境界（tenantId/RBAC/writeAudit/AIロール mutation 禁止）を最初から組み込めるか。
- (f) 本番確認・外部送信・実LLM を伴わずにスプリントを閉じられるか。

## 6. schema変更の要否

- 実装するなら **Lead テーブル1つの追加が必要**になる見込み。ただし**本書では schema変更をしない**（`schema変更なし`）。是非の決定は §30 の別承認。

## 7. migrationの要否

- 実装するなら **migration 1本**が必要になる見込み。**本書では migration をしない**（`migrationなし`）。実行は別承認。

## 8. Lead候補列の最終確認

- id / tenantId / displayName（会社名・拠点名レベル）/ source / placeId / fetchedAt / expiresAt / status / assignedUserId（userId 参照のみ）/ internalNote（PII非依存）/ archivedAt / createdAt / updatedAt / createdByUserId / updatedByUserId。
- **氏名・電話・メール・住所・customerId・生テキスト・外部公開フラグは入れない**（`docs/audit/114` 継承）。

## 9. status enumの最終確認

- 候補: NEW / REVIEWING / QUALIFIED / EXCLUDED / ARCHIVED。遷移は一方向基本・逆行は writeAudit。**enum の最終確定は実装着手時の別承認**。

## 10. archivedAt方針

- 物理削除なし。削除は archivedAt セットのソフトアーカイブのみ。一覧は既定で `archivedAt: null`。restore は別承認。

## 11. tenantId方針

- 全レコードにスカラ `tenantId`（Tenant リレーションなし）。全クエリ `tenantId` スコープ。

## 12. RBAC方針

- 参照・作成・編集・アーカイブは `hasPermission` 判定。**AIロールは mutation 不可**。**本書では RBAC 定義を変更しない**。

## 13. crm:* 新設の是非

- **是非は本書で確定しない**。実装本格化時に `crm:*`（read/update 等）を新設する案は妥当だが、**RBAC変更は別承認**（今回禁止事項）。初期スプリントでは §14 の暫定を推奨。

## 14. 既存 knowledge 権限代替の是非

- **初期スプリントの暫定として、既存 `knowledge:read`/`knowledge:update` 相当での代替を推奨**（RBAC 定義を変えずに薄い縦切りを通せる）。ただし責務の明確化のため、本格化時に `crm:*` へ移行（別承認）。

## 15. AIロール mutation 禁止

- AI_AGENT / AI_ASSISTANT は Lead の作成・編集・アーカイブを**一律拒否**（`isHumanUser` 相当で人間専用化・rbac 無変更）。AIは下書き・提案のみ。

## 16. writeAudit対象

- Lead の作成 / 編集 / アーカイブ / status 遷移 / 担当変更は `writeAudit`（本文・PII をログに入れない）。

## 17. writeDataAccess要否

- Lead-only（PII なし・INTERNAL まで）では **writeDataAccess は原則不要**。**Contact PII / CUSTOMER_CONFIDENTIAL を扱う段階に入った時点で必須＝停止条件**。

## 18. Data Classification

- **NORMAL / INTERNAL のみ**（会社名・拠点名・source・status 等）。**CUSTOMER_CONFIDENTIAL は使わない**。高機密 runtime 解禁は `docs/audit/112` 停止条件から別承認。

## 19. Contact PII非採用

- Contact PII を初期範囲に**入れない**。必要になった時点で**停止・別承認**（Security Gate 負荷最小化・可逆性・Consent 要件回避）。

## 20. company-brain-reference非変更

- Lead 本文・社内メモを company-brain-reference に**注入しない**・**変更しない**（封印維持）。

## 21. AI参照の可否

- AI はリード分析・優先度提案・次アクション提案を**下書き・提案**として生成可（PII を渡さない）。確定・送信・削除は持たない。

## 22. 外部送信なし

- Lead-only では**外部送信なし**（メール/LINE/DM/SNS/PR いずれもスコープ外・Human Certification Gate）。

## 23. Human Certification Gate

- 外部送信・契約・値引き・請求・送金・採用確定・会計確定は人間承認必須。Lead-only に該当機能を含めない（将来接続点として記録）。

## 24. Consent Gate

- 顧客メール/LINE/DM/紹介/導入事例/成果数値公開/個人情報外部送信は同意確認必須。Lead-only は外部送信なしのため**今回発動しない**。

## 25. Security Gate

- tenantId / RBAC / writeAudit / writeDataAccess / Data Classification / **PII非注入**を維持。Contact PII を含める場合は停止条件（§19）。

## 26. Business Event Ledger将来接続

- リード作成 / status 遷移 / 担当変更を、将来 **Business Event Ledger**（369独自差別化の柱）へ記録する接続点。**今回は実装しない**（writeAudit を土台に将来接続）。

## 27. 実装案の選択肢

- **案X: いま実装スプリントへ進む**（Lead-only・PII なし・既存権限暫定・writeAudit のみ・外部送信なし）。schema1＋migration1。
- **案Y: もう1段 docs を固めてから実装**（status enum・権限方針の最終確定を先に別 docs で詰める）。
- **案Z: CRM を後回しにし別 Lineage（Finance/Procurement 等）を先に docs 化**。

## 28. 推奨判断

**判定: READY / GO（実装スプリントへ進める「条件は揃っている」）。ただし本書は docs-only であり、実装着手そのものは §30 の別承認を必須とする。**

- 推奨は **案X を次の別承認で実行**：Lead-only・PII なし・既存 knowledge 権限暫定・writeAudit のみ・AIロール mutation 禁止・外部送信なし・schema1＋migration1・本番確認は人間承認後。
- 条件が揃っている根拠: 範囲が Lead 1テーブルに収まり（§5-8）、PII を持たず（§19）、権限を変えずに暫定可能（§14）、安全境界を最初から組み込める（§15-16）。

## 29. 停止条件

以下が必要になったら**実装着手せず停止・別承認**：
- Contact PII 保存 / writeDataAccess runtime / CUSTOMER_CONFIDENTIAL runtime 解禁。
- RBAC 変更 / `crm:*` 新設。
- company-brain-reference 変更 / AI 参照条件変更。
- 外部送信 / 外部SaaS連携 / OAuth。
- 実LLM / AIコスト / 本番確認。
- schema が2テーブル以上 / migration が複数本に膨らむ。

## 30. 実装へ進む場合の別承認文言（案）

> 「CRM Lead-only 実装スプリントを承認する。範囲は Lead 1テーブル＋作成/編集/アーカイブ＋一覧に限定。Contact PII 非保存・既存 knowledge 権限で暫定・AIロール mutation 禁止・writeAudit 必須・外部送信なし・Data Classification は NORMAL/INTERNAL のみ。schema 追加1・migration 1本まで許可。RBAC 変更・`crm:*` 新設・外部連携・実LLM・本番 deploy は含めない。本番確認は実装後に別途人間承認。」

## 31. 50カテゴリカバレッジ（短縮）

- **直接**: C08 CRM/Customer360、C09 SFA/Sales OS、C46 Governance Docs。
- **間接**: C01, C03, C04, C05, C06, C07, C10, C11, C12, C15, C18, C20, C26, C28, C30, C33, C34, C37, C38, C39, C48。
- **後続**: C02, C13, C14, C16, C17, C19, C21, C22, C23, C24, C25, C27, C29, C31, C32, C35, C36, C40, C41, C42, C43, C44, C47, C49, C50。
- **禁止/Future隔離**: C45 Physical AI/IoT/Robotics。**不明**: なし。

## 32. 20大カテゴリ

- 直接: 3.CRM/SFA・18.セキュリティ/権限/監査・1.AI経営OS本体・2.Company Brain。
- 間接: 4.ERP/基幹・5.AD OS/Growth・11.Developer Platform・12.業務自動化/Workflow・14.法務/契約・15.BI/経営分析・19.課金/Unit Economics。
- 禁止: 20.フィジカルAI/ロボット連携。

## 33. 追加19領域

- 確認のみ（実装しない）: AI Governance・Data Governance/Semantic Layer・Enterprise Admin/Identity/SSO/SCIM・AI Evaluation/Red Team・Trust Center/Compliance Center・Observability/SRE・Billing/Metering/FinOps・Marketplace Governance・MCP/Integration Platform・Onboarding/Migration・Customer-facing Portal・Risk/Insurance/Liability。

## 34. 5本柱

1. **Human Certification Gate 全社共通化**（今回直接扱う・外部作用の承認境界）。
2. **Business Event Ledger 全社展開**（今回直接扱う・Lead イベントの記録接続点・§26）。
3. AI社員の免許制度 / 4. AI社員の給与明細 / 5. AI社員派遣所（将来接続候補・記録のみ）。

## 35. 初期MVP非対象

- 外部API完全連携・Salesforce/HubSpot/kintone 実連携・OAuth・外部メール送信・LINE送信・DM大量送信・SNS投稿・PR配信・SEO公開・契約締結・請求書発行/送付・入金消込確定・会計仕訳確定・値引き確定・採用合否確定・Contact PII 保存・個人情報外部送信・実LLM API・AIコスト・本番確認・本番DB・deploy・フィジカルAI。

## 36. Phase対応

- **事業 Phase 2**: Salesforce Mini / CRM基盤の実装スプリント可否判断。
- **PDF Phase 2.5**: 初期MVP（Lead-only の read-only 集約〜人間書き込み）。
- **戦略 Phase 20-26**: 将来接続候補（今回対象外）。
- **Complete Ledger**: **R4 Commercial Core + R0 Governance Docs** 中心。

## 37. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `713d2e358ad0907a9bff2e24b20aaf940e72df97`・working tree clean・`origin/main..HEAD` 空・doc120/roadmap21 未存在・roadmap20/doc119 存在）。
- 上位: `docs/roadmap/20` / `docs/audit/119`・`docs/roadmap/19` / `docs/audit/118`（実測・存在）。
- 封印維持: `node scripts/check-company-brain-safety.mjs` exit 0（実測）。
- 369-vault 非編集: `git status --short -- 369-vault` 空（実測）。

## 38. Assumption Log

- 本書は Candidate・docs-only。**実装は §30 の別承認**。
- 初期スプリントは既存 knowledge 権限暫定を推奨（RBAC 無変更）。`crm:*` 新設は本格化時に別承認。
- Contact PII は初期範囲に入れない。schema/migration は本書で決めない。369-vault は未編集。

## 39. Unknowns Log

- status enum の最終確定・遷移規則。`crm:*` 新設の最終タイミング。displayName の拠点名粒度（PII 境界）。source enum の値。案B（Lead+Deal）へ進む運用実績の定義。Business Event Ledger の記録形式。実装スプリントの担当と期間。

## 40. Risk Register

- 「READY / GO」を実装済みと誤読するリスク → 「条件は揃っている・実装着手は別承認」を §28/§30 に明記。
- schema/migration を今回やってしまうリスク → 「本書では schema変更なし・migrationなし」を明記。
- RBAC を先に変えるリスク → 既存権限暫定を推奨・`crm:*` は別承認。
- Contact PII 混入リスク → 非採用・停止条件・Security Gate。
- AI に PII を渡すリスク → company-brain-reference 非注入・下書きのみ。
- 外部送信の暴発リスク → 外部送信なし・Human Certification Gate・Consent Gate。

## 41. Definition of Done

- [x] 実装スプリント可否の判断項目・schema/migration 要否・Lead候補列/status の最終確認・権限方針・各Gate・Business Event Ledger 接続・実装案選択肢・推奨判断・停止条件・別承認文言を記録。
- [x] 判定 READY / GO（条件は揃っている）を提示しつつ、実装着手は別承認と明記。
- [x] 実装・schema変更・migration・外部送信・実LLM・AIコスト・本番確認なし（docs-only）。
- [x] safety script exit 0・369-vault非編集。

## 42. 次回推奨プロンプト案

1. **doc120 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 20項目報告）。
2. **CRM Lead-only 実装スプリント着手（§30 別承認）**（Lead 1テーブル＋最小CRUD＋一覧・既存権限暫定・schema1＋migration1・本番確認は別承認）。
3. 次の Lineage 深掘り（Finance / Procurement / Inventory・docs-only・別承認）。

## 43. 判定

**判定: READY / GO**（CRM Lead-only を実装スプリントへ進める条件が揃っていることを docs-only で確認した）。

ただし、これは実装着手そのものの承認ではない。**docs-only**・**Candidate**・**実装なし**・**schema変更なし**・**migrationなし**・**画面/Server Action なし**・**RBAC変更なし**・**crm:* 新設なし**・**company-brain-reference変更なし**・**外部SaaS連携なし**・**OAuth設定なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**Contact PII保存なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
