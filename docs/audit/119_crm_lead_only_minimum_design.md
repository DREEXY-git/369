# 119. CRM Lead-only 最小設計 — docs/roadmap/20 の記録（docs-only・369-vault非編集）

- 日付: 2026-07-06
- 種別: **docs-only / commit-only**（実装前の最小設計記録。コード差分ゼロ・369-vault非編集・実装なし）
- Audit Doc: 119
- Product Phase: Strategy / CRM / SFA / Salesforce Mini / 事業 Phase 2 / AI Workforce Infrastructure
- Lineage: Strategy / CRM-SFA Lineage / Lead-only Minimum Design
- Stage: CRM Lead-only Minimum Design (Candidate)
- Status: READY / GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `54a8875244da72e099da30ea434c8355cc2ad371`
- Scope: doc118 推奨案A「Lead-only」を、実装判断できる粒度の最小設計として docs-only で整理
- Not Included: 実装・schema変更・migration・Prisma schema編集・Server Action・画面・RBAC定義変更・label定義変更・company-brain-reference変更・AI参照条件変更・外部SaaS連携・OAuth・Salesforce/HubSpot/kintone連携・外部送信・実LLM・AIコスト・本番確認・本番DB・deploy・Contact PII保存・push・Function Master正式昇格・doc120無承認作成
- Next Action: doc119 push-only（別承認）または CRM Lead-only 実装スプリント可否の最終判断（別の重い承認）
- Do Not Start: 実装 / schema変更 / migration / Server Action / 画面 / RBAC変更 / 外部連携 / OAuth / 外部送信 / 実LLM / AIコスト / 本番確認 / Contact PII保存 / 369-vault編集 / doc120作成

## 1. 非エンジニア向け要約

- 今回は、CRM を最初に薄く作るときの推奨「**Lead-only（リードだけ）**」について、**実装に進む判断ができる細かさまで紙で設計しただけ**の回です。
- Lead は「会社名・拠点名レベル・取得元・状態・担当・社内メモ」までに限定し、**顧客の個人情報（Contact PII）は初期範囲に入れません**。必要になったら停止して別承認にします。
- これは**設計（Candidate）の記録**であり、実装ではありません。**実装なし**・**schema変更なし**・**migrationなし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**。**369-vault は一切触っていません**。

## 2. 今回作成した docs（GitHub正本側・Candidate）

- `docs/roadmap/20_crm_lead_only_minimum_design_candidate.md` — Lead-only の最小目的・Lead 候補列・入れる/入れないデータ・Contact PII 非採用理由・status enum 候補・archivedAt・tenantId・RBAC・`crm:*` vs 既存 knowledge 権限の比較・writeAudit 対象・writeDataAccess 条件・Data Classification・PII非注入・AI下書き・外部送信なし・Human Certification Gate / Consent Gate / Security Gate・Business Event Ledger 将来接続・3案関係・Phase対応・50/20/19/5本柱接続・初期MVP非対象・停止条件・推奨判断を整理。
- `docs/audit/119_crm_lead_only_minimum_design.md`（本書） — 監査記録。

## 3. 既存docsとの関係

- 直接の上位: `docs/roadmap/19` / `docs/audit/118`（推奨案A）。本書は案A の1段詳細。
- Lineage: `docs/roadmap/18`。PII設計継承: `docs/audit/114`。上位概念: `docs/roadmap/09`。

## 4. 明記したルール（恒久）

- 本設計は **Candidate / docs-only**。**実装は別承認**。schema/migration/画面/Server Action は本書で決めない/作らない。
- **Contact PII を初期範囲に入れない**（必要になったら停止・別承認）。**顧客PIIを company-brain-reference に注入しない**。
- **tenantId 必須・RBAC・writeAudit** を全体前提とし、Lead-only では **writeDataAccess は原則不要**（PII を扱う段階で必須＝停止条件）。
- **Data Classification は NORMAL/INTERNAL のみ**（CUSTOMER_CONFIDENTIAL は使わない）。
- **AIは下書き・提案のみ**・外部送信なし・**Human Certification Gate**（今回該当機能なし）。
- **RBAC 定義は本書で変更しない**（`crm:*` 新設 vs 既存権限代替は実装時に別承認）。**GitHubが正本・369-vault非編集**。

## 5. 今回やらなかったこと

- 実装・schema変更・migration・Prisma schema編集・Server Action・画面・RBAC/label定義変更・company-brain-reference変更・AI参照条件変更。
- 外部SaaS連携・OAuth・Salesforce/HubSpot/kintone連携・外部送信・実LLM・AIコスト・本番確認・本番DB・deploy。
- Contact PII 保存・Function Master 正式昇格・369-vault編集・doc120作成・push。

## 6. Complete Function Coverage Matrix（50カテゴリ・短縮）

- **直接対象**: C08 CRM/Customer360、C09 SFA/Sales OS、C46 Governance Docs。
- **間接対象**: C01, C03, C04, C05, C06, C07, C10, C11, C12, C15, C18, C20, C26, C28, C30, C33, C34, C37, C38, C39, C48。
- **後続**: C02, C13, C14, C16, C17, C19, C21, C22, C23, C24, C25, C27, C29, C31, C32, C35, C36, C40, C41, C42, C43, C44, C47, C49, C50。
- **禁止 / Future隔離**: C45 Physical AI/IoT/Robotics。**不明**: なし。

## 7. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `54a8875244da72e099da30ea434c8355cc2ad371`・working tree clean・`origin/main..HEAD` 空・doc119/roadmap20 未存在・roadmap19/doc118 存在）。
- 作成物: `docs/roadmap/20` と本書 doc119 を新設。
- 推奨: 案A Lead-only を「PII なし・既存権限暫定・writeAudit のみ・外部送信なし」の最小範囲で実装候補（実装は別承認）。
- 369-vault 非編集: `git status --short -- 369-vault` = 空（実測）。
- 封印維持: AI注入 0・`anonymized: true` 2・apps の Customer Pain runtime 0・`node scripts/check-company-brain-safety.mjs` exit 0（実測）。

## 8. Assumption Log

- 本設計は Candidate・docs-only であり、実装は別承認。
- Lead 候補列・status enum は設計案であり schema 化・migration はしない。
- RBAC は本書で変更しない（既存 knowledge 権限代替 vs `crm:*` 新設は実装時に別承認）。
- Contact PII は初期範囲に入れない。369-vault は未編集。

## 9. Unknowns Log

- Lead status enum の最終値と遷移規則。`crm:*` 新設 vs 既存権限代替の最終決定。displayName に拠点名をどこまで含めるか（PII 境界）。source enum の値。案B へ進む「運用実績」の定義。Business Event Ledger の記録形式。

## 10. Risk Register

- 設計を実装済みと誤読 → 「今回は実装しない・別承認」を明記。
- Lead 候補列に PII が紛れ込むリスク → 「入れないデータ」「PII非注入」「停止条件」を明記。
- RBAC を先に変えてしまうリスク → 「本書で RBAC 変更しない」を明記。
- internalNote に顧客個人情報を書くリスク → 「PII非依存・社内メモ」と明記。
- 過剰設計（案B/C 先行）リスク → Lead-only 限定・段階停止条件。
- AI に PII を渡すリスク → company-brain-reference 非注入・下書きのみ。
- 未push commit の揮発リスク → doc119 push-only（別承認）で解消。

## 11. Definition of Done

- [x] `docs/roadmap/20` と本書に、Lead-only の最小設計（Lead候補列・status enum・権限方針・監査/機密・停止条件・推奨判断）を記録。
- [x] Contact PII を初期範囲に入れない方針と理由を明記。
- [x] 実装・schema変更・migration・外部送信・実LLM・AIコスト・本番確認が一切ない（docs-only）。
- [x] CURRENT_STATE / PROGRESS にポインタ追記・docs/10_obsidian 入口に1行追記（GitHub docs側のみ）。
- [x] 許可5ファイル以内・safety script exit 0・369-vault非編集。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 12. 次回推奨プロンプト案

1. **doc119 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 20項目報告）。
2. **CRM Lead-only 実装スプリント可否の最終判断**（schema 化 / migration / `crm:*` 新設の是非を決める別の重い人間承認）。
3. 次の Lineage 深掘り（Finance / Procurement / Inventory・docs-only・別承認）。

## 13. 判定

**判定: READY / GO**（案A Lead-only を実装判断できる粒度の最小設計として docs-only で記録した）。

ただし、これは実装の決定ではない。**docs-only**・**Candidate**・**実装なし**・**schema変更なし**・**migrationなし**・**画面/Server Action なし**・**RBAC変更なし**・**company-brain-reference変更なし**・**外部SaaS連携なし**・**OAuth設定なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**Contact PII保存なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
