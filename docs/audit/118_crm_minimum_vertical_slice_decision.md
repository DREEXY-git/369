# 118. CRM最小縦切り 実装可否判断 — docs/roadmap/19 の記録（docs-only・369-vault非編集）

- 日付: 2026-07-06
- 種別: **docs-only / commit-only**（実装可否の判断記録。コード差分ゼロ・369-vault非編集・実装なし）
- Audit Doc: 118
- Product Phase: Strategy / CRM / SFA / Salesforce Mini / 事業 Phase 2 / AI Workforce Infrastructure
- Lineage: Strategy / CRM-SFA Lineage / Minimum Vertical Slice Decision
- Stage: CRM Minimum Vertical Slice Decision (Candidate)
- Status: READY / GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `f2a9a3d481ef7addb485475e72c4cf93825c0cfc`
- Scope: CRM/SFA/Salesforce Mini の最小縦切りを **案A: Lead-only / 案B: Lead + Deal / 案C: Lead + Deal + Pipeline** の3案で比較し、推奨案を docs-only で記録
- Not Included: 実装・schema変更・migration・Prisma schema編集・Server Action・画面・RBAC定義変更・label定義変更・company-brain-reference変更・AI参照条件変更・外部SaaS連携・OAuth・Salesforce/HubSpot/kintone連携・外部送信・実LLM・AIコスト・本番確認・本番DB・deploy・push・Contact PII の無承認保存・Function Master正式昇格
- Next Action: doc118 push-only（別承認）または 案A Lead-only 実装可否の最小設計 docs-only（別の重い承認）
- Do Not Start: 実装 / schema変更 / migration / Server Action / 画面 / 外部連携 / OAuth / 外部送信 / 実LLM / AIコスト / 本番確認 / Contact PII保存 / 369-vault編集 / doc119作成

## 1. 非エンジニア向け要約

- 今回は、CRM/SFA を最初にどこまで薄く作るかを、**Lead-only（案A）/ Lead+Deal（案B）/ Lead+Deal+Pipeline（案C）** の3案で比較し、**どれから進めるべきかを紙の上で判断しただけ**の回です。
- **推奨は案A（Lead-only）**です。理由は、顧客の個人情報（Contact PII）を最小化でき、権限・監査・テナント分離という土台に集中でき、営業デモにも使え、次の段階（Lead+Deal）へ進む条件を設計しやすいためです。
- これは**判断（Candidate）の記録**であり、実装ではありません。**実装なし**・**schema変更なし**・**migrationなし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**。**Salesforce 等の外部連携もしていません**。**369-vault は一切触っていません**。

## 2. 今回作成した docs（GitHub正本側・Candidate）

- `docs/roadmap/19_crm_minimum_vertical_slice_candidate.md` — CRM最小縦切りの3案（案A/B/C）を、目的・入れる/入れないデータ・schema要否・migration要否・PIIリスク・tenantId/RBAC/writeAudit/writeDataAccess・Human Certification Gate・Consent Gate・Security Gate・Company Brain接続・AI参照・外部送信・Phase対応・収益/moat・停止条件で比較し、**推奨案A**を提示。50カテゴリの扱い・4軸Phase・5本柱接続も記録。
- `docs/audit/118_crm_minimum_vertical_slice_decision.md`（本書） — 判断の監査記録。

## 3. 既存docsとの関係

- 上位 Lineage: `docs/roadmap/18`（CRM/SFA/Salesforce Mini Lineage）・`docs/audit/117`。本書はその**最初の実装範囲を決める前段の判断**。
- SaaSカタログ: `docs/roadmap/17`（区分①CRM/SFA）。PII設計: `docs/audit/114`。上位概念: `docs/roadmap/09`。

## 4. 明記したルール（恒久）

- 本判断は **Candidate / docs-only**。**推奨案A も含め実装は別承認**。
- **今回は schema/migration を決めない**（schema変更なし・migrationなし）。設計方向のみ。
- **Contact PII を初期範囲に入れない**（入れる必要が出たら停止・別承認）。**顧客PIIを company-brain-reference に注入しない**。
- **AIは下書き・提案のみ**。外部送信/契約/値引き/請求は **Human Certification Gate** 必須（今回実装しない）。
- **tenantId 必須・RBAC・writeAudit・writeDataAccess・Data Classification** を全案共通の前提とする。
- 特定SaaS名は**例示に留め**、契約判断・実連携はしない。**GitHubが正本・Obsidianは閲覧・369-vaultを直接編集しない**。

## 5. 今回やらなかったこと

- 実装・schema変更・migration・Prisma schema編集・Server Action・画面・RBAC/label定義変更・company-brain-reference変更・AI参照条件変更。
- 外部SaaS連携・OAuth・Salesforce/HubSpot/kintone連携・外部メール送信・実LLM・AIコスト・本番確認・本番DB・deploy・push。
- Contact PII 保存の決定・Function Master 正式昇格・Customer Pain本実装・369-vault編集・doc119作成。

## 6. Complete Function Coverage Matrix（50カテゴリ・短縮）

- **直接対象**: C08 CRM/Customer360、C09 SFA/Sales OS、C46 Governance Docs。
- **間接対象**: C01, C03, C04, C05, C06, C07, C10, C11, C12, C15, C18, C20, C26, C28, C30, C33, C34, C37, C38, C39, C48。
- **後続**: C02, C13, C14, C16, C17, C19, C21, C22, C23, C24, C25, C27, C29, C31, C32, C35, C36, C40, C41, C42, C43, C44, C47, C49, C50。
- **禁止 / Future隔離**: C45 Physical AI/IoT/Robotics。
- **不明**: なし。

## 7. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `f2a9a3d481ef7addb485475e72c4cf93825c0cfc`・working tree clean・`origin/main..HEAD` 空・doc118未存在・roadmap18/doc117存在）。
- 作成物: `docs/roadmap/19` と本書 doc118 を新設。
- 推奨判断: 案A（Lead-only）— PII/Security Gate 負荷最小・薄い縦切り優先。
- 369-vault 非編集: `git status --short -- 369-vault` = 空（実測）。
- 封印維持: AI注入 0・`anonymized: true` 2・apps の Customer Pain runtime 0・`node scripts/check-company-brain-safety.mjs` exit 0（実測）。

## 8. Assumption Log

- 本判断は Candidate・docs-only であり、推奨案A も実装は別承認。
- 安全側の初期推奨（案A Lead-only）を採用。PII/Security Gate 負荷が最小で「薄い縦切り優先」に合致するため方針どおり。
- 金額・確度は INTERNAL、Contact PII は初期範囲に入れない。
- 369-vault は未編集。docs/10_obsidian は入口1行の最小追記のみ。

## 9. Unknowns Log

- 案A Lead テーブルの正確な列・`crm:*` 権限新設 vs 既存 knowledge 権限代替。Lead status enum の値と遷移。案B へ進む停止条件クリア基準。Contact PII 保存時期と CUSTOMER_CONFIDENTIAL runtime 解禁の境界。Business Event Ledger の記録形式（将来）。

## 10. Risk Register

- 案を実装済みと誤読するリスク → 全案「今回は実装しない・別承認」を明記。
- 過剰設計リスク（案C 先行）→ 案A 推奨・段階的停止条件を明記。
- PII 混入リスク（特に案C 活動履歴）→ Contact PII 非保存・停止条件・Security Gate を明記。
- schema/migration を今回決めてしまうリスク → 「今回は決めない」を明記。
- AI に PII を渡すリスク → company-brain-reference 非注入・下書きのみ。
- 外部送信の暴発リスク → 外部送信なし・Human Certification Gate・Consent Gate。
- 未push commit の揮発リスク → doc118 push-only（別承認）で解消。

## 11. Definition of Done

- [x] `docs/roadmap/19` と本書に、CRM最小縦切りの3案比較と推奨案A を記録。
- [x] 各案の目的・データ・schema要否・PII・各Gate・Phase・停止条件を比較。
- [x] 実装・schema変更・migration・外部送信・実LLM・AIコスト・本番確認が一切ない（docs-only）。
- [x] CURRENT_STATE / PROGRESS にポインタ追記・docs/10_obsidian 入口に1行追記（GitHub docs側のみ）。
- [x] 許可5ファイル以内・safety script exit 0・369-vault非編集。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 12. 次回推奨プロンプト案

1. **doc118 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 20項目報告）。
2. **案A Lead-only 実装可否の最小設計 docs-only**（Lead テーブル候補列・status enum・`crm:*` 権限要否・schema要否は決めるが migration はまだ・別の重い承認）。
3. 次の Lineage 深掘り（Finance / Procurement / Inventory・docs-only・別承認）。

## 13. 判定

**判定: READY / GO**（CRM最小縦切りの3案比較と推奨案A を docs-only で記録した）。

ただし、これは実装の決定ではない。**docs-only**・**Candidate**・**実装なし**・**schema変更なし**・**migrationなし**・**画面/Server Action なし**・**外部SaaS連携なし**・**OAuth設定なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
