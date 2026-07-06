# 120. CRM Lead-only 実装スプリント可否 最終判断 — docs/roadmap/21 の記録（docs-only・369-vault非編集）

- 日付: 2026-07-06
- 種別: **docs-only / commit-only**（実装可否の最終判断記録。コード差分ゼロ・369-vault非編集・実装なし）
- Audit Doc: 120
- Product Phase: Strategy / CRM / SFA / Salesforce Mini / 事業 Phase 2 / PDF Phase 2.5 / AI Workforce Infrastructure
- Complete Ledger Stage: R4 Commercial Core + R0 Governance Docs
- Lineage: Strategy / CRM-SFA Lineage / Lead-only Implementation Gate
- Stage: CRM Lead-only Implementation Gate (Candidate)
- Status: READY / GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `713d2e358ad0907a9bff2e24b20aaf940e72df97`
- Scope: doc118/doc119 を前提に、CRM Lead-only を次の実装スプリントへ進める条件が揃っているかを docs-only で最終判断
- Not Included: 実装・schema変更・migration・Prisma schema編集・Server Action・画面・RBAC変更・crm:* 新設・label定義変更・company-brain-reference変更・AI参照条件変更・Contact PII保存・外部SaaS連携・OAuth・Salesforce連携・外部送信・実LLM・AIコスト・本番確認・本番DB・deploy・push・Function Master昇格・doc121作成
- Next Action: doc120 push-only（別承認）または CRM Lead-only 実装スプリント着手（docs/roadmap/21 §30 別承認文言に基づく別の重い承認）
- Do Not Start: 実装 / schema変更 / migration / Server Action / 画面 / RBAC変更 / crm:* 新設 / 外部連携 / OAuth / 外部送信 / 実LLM / AIコスト / 本番確認 / Contact PII保存 / 369-vault編集 / doc121作成

## 1. 非エンジニア向け要約

- 今回は、CRM の「Lead-only（リードだけ）」を、**次に本当に手を動かして作り始めてよいかを紙で最終判断しただけ**の回です。
- 結論は **「条件は揃っている（READY / GO）」** ですが、**実際に作り始めるのはさらに別の承認が必要**です。範囲は Lead 1テーブル＋作成/編集/アーカイブ＋一覧に限定し、**顧客の個人情報（Contact PII）は入れない**・権限は既存のまま暫定・外部送信なし、という条件つきです。
- これは**判断（Candidate）の記録**であり、実装ではありません。**実装なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**。**369-vault は一切触っていません**。

## 2. 今回作成した docs（GitHub正本側・Candidate）

- `docs/roadmap/21_crm_lead_only_implementation_gate_candidate.md` — 実装スプリント可否の判断項目・schema/migration 要否・Lead候補列/status の最終確認・tenantId/RBAC/AIロール mutation 禁止/writeAudit/writeDataAccess/Data Classification・Contact PII 非採用・company-brain-reference 非変更・AI参照可否・外部送信なし・Human Certification Gate/Consent Gate/Security Gate・Business Event Ledger 将来接続・実装案の選択肢（案X/Y/Z）・推奨判断・停止条件・**実装へ進む場合の別承認文言（案）**・50/20/19/5本柱・Phase対応を整理。
- `docs/audit/120_crm_lead_only_implementation_gate.md`（本書） — 監査記録。

## 3. 既存docsとの関係

- 直接の上位: `docs/roadmap/20` / `docs/audit/119`（Lead-only 最小設計）・`docs/roadmap/19` / `docs/audit/118`（3案比較）。本書は「実装スプリントへ進むか」の最終判断。
- Lineage: `docs/roadmap/18`。PII設計継承: `docs/audit/114`。上位概念: `docs/roadmap/09`。

## 4. 明記したルール（恒久）

- 本判断は **Candidate / docs-only**。**判定 READY / GO は「条件が揃っている」であり、実装着手は §30 別承認**。
- 初期スプリントは **既存 knowledge 権限で暫定**（RBAC 無変更）・**`crm:*` 新設は別承認**。
- **Contact PII を入れない**・**company-brain-reference を変更しない**・**Data Classification は NORMAL/INTERNAL のみ**・**AIロール mutation 禁止**・**外部送信なし**。
- schema 追加1・migration 1本まで（実装時・別承認）。**本書では schema変更・migration をしない**。
- **GitHubが正本・Obsidianは閲覧・369-vaultを直接編集しない**。

## 5. 今回やらなかったこと

- 実装・schema変更・migration・Prisma schema編集・Server Action・画面・RBAC変更・crm:* 新設・label定義変更・company-brain-reference変更・AI参照条件変更。
- Contact PII保存・外部SaaS連携・OAuth・Salesforce連携・外部送信・実LLM・AIコスト・本番確認・本番DB・deploy。
- Function Master 正式昇格・369-vault編集・doc121作成・push。

## 6. Complete Function Coverage Matrix（50カテゴリ・短縮）

- **直接対象**: C08 CRM/Customer360、C09 SFA/Sales OS、C46 Governance Docs。
- **間接対象**: C01, C03, C04, C05, C06, C07, C10, C11, C12, C15, C18, C20, C26, C28, C30, C33, C34, C37, C38, C39, C48。
- **後続**: C02, C13, C14, C16, C17, C19, C21, C22, C23, C24, C25, C27, C29, C31, C32, C35, C36, C40, C41, C42, C43, C44, C47, C49, C50。
- **禁止 / Future隔離**: C45 Physical AI/IoT/Robotics。**不明**: なし。

## 7. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `713d2e358ad0907a9bff2e24b20aaf940e72df97`・working tree clean・`origin/main..HEAD` 空・doc120/roadmap21 未存在・roadmap20/doc119 存在）。
- 作成物: `docs/roadmap/21` と本書 doc120 を新設。
- 判定: READY / GO（条件は揃っている）／実装着手は §30 別承認。
- 369-vault 非編集: `git status --short -- 369-vault` = 空（実測）。
- 封印維持: AI注入 0・`anonymized: true` 2・apps の Customer Pain runtime 0・`node scripts/check-company-brain-safety.mjs` exit 0（実測）。

## 8. Assumption Log

- 本判断は Candidate・docs-only であり、実装着手は §30 別承認。
- 初期スプリントは既存 knowledge 権限暫定を推奨（RBAC 無変更）。`crm:*` 新設は本格化時に別承認。
- Contact PII は初期範囲に入れない。schema/migration は本書で決めない。369-vault は未編集。

## 9. Unknowns Log

- status enum の最終確定・遷移規則。`crm:*` 新設の最終タイミング。displayName の拠点名粒度（PII 境界）。source enum の値。案B へ進む運用実績の定義。Business Event Ledger の記録形式。実装スプリントの担当と期間。

## 10. Risk Register

- 「READY / GO」を実装済みと誤読するリスク → 「条件は揃っている・実装着手は別承認」を明記。
- schema/migration を今回やってしまうリスク → 「本書では schema変更なし・migrationなし」を明記。
- RBAC を先に変えるリスク → 既存権限暫定を推奨・`crm:*` は別承認。
- Contact PII 混入リスク → 非採用・停止条件・Security Gate。
- AI に PII を渡すリスク → company-brain-reference 非注入・下書きのみ。
- 外部送信の暴発リスク → 外部送信なし・Human Certification Gate・Consent Gate。
- 未push commit の揮発リスク → doc120 push-only（別承認）で解消。

## 11. Definition of Done

- [x] `docs/roadmap/21` と本書に、実装スプリント可否の判断項目・schema/migration 要否・権限方針・各Gate・実装案選択肢・推奨判断・停止条件・別承認文言を記録。
- [x] 判定 READY / GO（条件は揃っている）を提示しつつ、実装着手は別承認と明記。
- [x] 実装・schema変更・migration・外部送信・実LLM・AIコスト・本番確認が一切ない（docs-only）。
- [x] CURRENT_STATE / PROGRESS にポインタ追記・docs/10_obsidian 入口に1行追記（GitHub docs側のみ）。
- [x] 許可5ファイル以内・safety script exit 0・369-vault非編集・見出し番号1から連番。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 12. 次回推奨プロンプト案

1. **doc120 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 20項目報告）。
2. **CRM Lead-only 実装スプリント着手（§30 別承認）**（Lead 1テーブル＋最小CRUD＋一覧・既存権限暫定・schema1＋migration1・本番確認は別承認）。
3. 次の Lineage 深掘り（Finance / Procurement / Inventory・docs-only・別承認）。

## 13. 判定

**判定: READY / GO**（CRM Lead-only を実装スプリントへ進める条件が揃っていることを docs-only で確認した）。

ただし、これは実装着手そのものの承認ではない。**docs-only**・**Candidate**・**実装なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**crm:* 新設なし**・**company-brain-reference変更なし**・**外部SaaS連携なし**・**OAuth設定なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**Contact PII保存なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
