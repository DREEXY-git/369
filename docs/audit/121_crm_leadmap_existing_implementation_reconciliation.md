# 121. 既存LeadMap / CRM実装の追認・差分監査 — docs/roadmap/22 の記録（docs-only・369-vault非編集）

- 日付: 2026-07-06
- 種別: **docs-only / commit-only**（read-only 監査＋差分整理の記録。コード差分ゼロ・369-vault非編集・実装なし）
- Audit Doc: 121
- Product Phase: Strategy / CRM / SFA / Salesforce Mini / 事業 Phase 2 / PDF Phase 2.5
- Lineage: Strategy / CRM-SFA Lineage / Existing Implementation Reconciliation
- Stage: CRM LeadMap Existing Implementation Reconciliation (Candidate)
- Status: READY / GO（案A）
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `aa4051bedc445c61a63ca5c5076c3f3d7a13d2ff`
- Complete Ledger Stage: R4 Commercial Core + R0 Governance Docs
- Scope: 既存 `LocalBusinessLead` / `/leadmap` を CRM Lead 正本候補として追認できるかを read-only 監査し、doc118〜120 とのズレを docs-only で整理
- Not Included: 実装・schema変更・migration・UI変更・Server Action変更・RBAC変更・crm:* 新設・Contact PII追加・company-brain-reference変更・外部送信・実LLM・AIコスト・本番確認・本番DB・deploy・push・doc118〜120削除・369-vault編集
- Next Action: doc121 push-only（別承認）または 既存 LocalBusinessLead 薄い補強の実装可否判断 docs-only
- Do Not Start: 新規 Lead モデル / crm:* 新設 / schema変更 / migration / leadmap実装変更 / Contact PII追加 / 外部送信 / 実LLM / AIコスト / 369-vault編集

## 1. 非エンジニア向け要約

- 前回、CRM の「リード（Lead）」を新しく作ろうとしたら、**このプロダクトには既に LeadMap という本格的なリード〜商談〜顧客の仕組みが実装済み**だと分かり、作らずに止めました。
- 今回は、その **既存の仕組みを「CRM のリード正本」として正式に認める**判断を紙で整理しただけの回です。新しいテーブルも画面も作っていません。
- これは**判断（Candidate）の記録**であり、実装ではありません。**実装なし**・**schema変更なし**・**migrationなし**・**UI変更なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**。**369-vault は一切触っていません**。

## 2. 今回作成したdocs

- `docs/roadmap/22_crm_leadmap_existing_implementation_reconciliation_candidate.md`（33見出し・1から連番）— 既存 LeadMap/CRM 実装の棚卸し・doc118〜120 とのズレ表・新規 Lead を作らない理由・既存を正本候補として追認する方針（案A）・不足補強候補を整理。
- `docs/audit/121_crm_leadmap_existing_implementation_reconciliation.md`（本書）— 監査記録。

## 3. 既存実装の実測結果

- **リード実体**: `model LocalBusinessLead`（schema:2756）— tenantId・name・industry・address?/phone?/email?・placeId?・source・fetchedAt?/expiresAt?・**stage `LeadStage @default(NEW)`**・ownerId?・**customerId?/dealId?（CRM 連携）**・pipelineHistory 等。
- **Contact PII**: `LocalBusinessContact`（2805）が name?/title?/email?/phone? を保持（LeadMap は営業のため PII 保持設計）。
- **フルCRM**: `Customer`(494・**label 既定 CUSTOMER_CONFIDENTIAL**・PII)・`Contact`(527)・`Deal`(622・DealStage・amount・source manual|leadmap・leadId?)・`DealStageHistory`(652)・`Account`(905)。
- **enum**: `LeadStage`(84・16値 NEW..EXCLUDED)・`ConfidentialityLabel`(40・NORMAL..CUSTOMER_CONFIDENTIAL)。
- **UI**: `apps/web/app/(app)/leadmap/`（page/leads/campaigns/map/pipeline/routes/settings/actions.ts）＋ `api/leadmap/export`。
- **安全機構**: actions.ts に requireUser/hasPermission('leadmap')/tenantId/writeAudit/OutreachApproval(PENDING)。rbac に `leadmap`・`leadmap:external_send`・`leadmap:read`/`ai_read`。

## 4. 停止判断の理由（前回 doc121 実装ミッション）

- doc121 実装ミッションの Definition of Ready が「既存 Lead/CrmLead model がある」「既存CRM実装が見つかり重複の可能性がある」で停止と規定。
- 上記実測により**両条件に該当**。新規 `Lead` モデルは既存 `LocalBusinessLead` と二重化しデータモデルが分裂するため、実装せず停止した（変更ゼロ・clean 維持）。

## 5. doc118〜120 との関係

- doc118〜120 は **greenfield（新規 Lead 1テーブル・Contact PII 非保存・新 status enum・crm:*/knowledge 権限）前提の Candidate** だった。
- 実装は既に存在（案A）。**doc118〜120 は削除せず**、greenfield 前提の設計 Candidate として温存し、本書＋roadmap22 で既存実装との突合結果を正本化する。

## 6. 今回やらなかったこと

- 実装・schema変更・migration・Prisma schema編集・`Lead` モデル新設・`crm:*` 新設・RBAC変更・label定義変更・company-brain-reference変更・`/crm/leads` 新設・既存 `/leadmap` 変更・Server Action変更・UI変更・Contact PII追加。
- 外部送信・実LLM・AIコスト・本番DB接続・本番deploy・369-vault編集・doc118〜120削除・push。

## 7. Complete Function Coverage Matrix（50カテゴリ・短縮）

- **直接対象**: C08 CRM/Customer360、C09 SFA/Sales OS、C46 Governance Docs。
- **間接対象**: C01, C03, C04, C05, C06, C07, C10, C11, C12, C15, C18, C20, C26, C28, C30, C33, C34, C37, C38, C39, C48。
- **後続**: C02, C13, C14, C16, C17, C19, C21, C22, C23, C24, C25, C27, C29, C31, C32, C35, C36, C40, C41, C42, C43, C44, C47, C49, C50。
- **禁止 / Future隔離**: C45 Physical AI/IoT/Robotics。**不明**: なし。

## 8. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `aa4051bedc445c61a63ca5c5076c3f3d7a13d2ff`・clean・`origin/main..HEAD` 空・doc121/roadmap22 未存在・max audit=120）。
- schema/UI/Server Action/rbac の実測は §3 に記載（行番号つき）。
- 封印維持: `node scripts/check-company-brain-safety.mjs` exit 0（実測）。
- 369-vault 非編集: `git status --short -- 369-vault` = 空（実測）。

## 9. Assumption Log

- 本監査は Candidate・docs-only の追認整理であり、実装ではない。
- 既存 `LocalBusinessLead` を CRM Lead 正本候補として扱う（案A）。doc118〜120 は削除せず温存。
- 既存 `leadmap` 権限があるため `crm:*` 新設・knowledge 代替の論点は解消。369-vault 未編集。

## 10. Unknowns Log

- `LocalBusinessLead` に archivedAt / internalNote を足すか。doc118〜120 起草時に既存実装を参照したか。CRM `Customer`/`Deal` と LeadMap の役割分担の最終確定。高機密ラベル（Customer 既定 CUSTOMER_CONFIDENTIAL）の runtime 閲覧統制の現状。

## 11. Risk Register

- 二重リード実体リスク → 新規 Lead を作らず既存追認（案A）で回避。
- doc と実装の乖離放置リスク → 本書＋roadmap22 で正本化。
- 既存 `/leadmap` 破壊リスク → 今回 read-only・非接触。
- PII 前提取り違えリスク → 既存は PII 保持設計と明記。
- 未push commit の揮発リスク → doc121 push-only（別承認）で解消。

## 12. Definition of Done

- [x] 既存 LeadMap/CRM 実装を read-only で棚卸し（schema/UI/Server Action/権限）。
- [x] doc118〜120 とのズレを整理・新規 Lead を作らない理由を明記。
- [x] 既存を CRM Lead 正本候補として追認（案A）・不足補強候補を記録・doc118〜120 は削除せず。
- [x] CURRENT_STATE / PROGRESS にポインタ追記・docs/10_obsidian 入口に1行追記（GitHub docs側のみ）。
- [x] 実装・schema変更・migration・UI変更なし（docs-only）・safety exit 0・369-vault非編集・見出し1から連番。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 13. 次回推奨プロンプト案

1. **doc121 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 20項目報告）。
2. **既存 LocalBusinessLead 薄い補強の実装可否判断 docs-only**（archivedAt / internalNote を足すか・別の重い承認）。
3. 高機密ラベル運用の既存 Customer（CUSTOMER_CONFIDENTIAL 既定）への接続現状監査（doc108〜114 ライン・docs-only）。

## 14. 判定

**判定: READY / GO（案A）** — 既存 `LocalBusinessLead` / `/leadmap` を CRM Lead の正本候補として追認し、新規 `Lead` モデル・`/crm/leads` は作らない。doc118〜120 は削除せず greenfield 前提の Candidate として温存。

ただし、これは実装ではない。**docs-only**・**Candidate**・**schema変更なし**・**migrationなし**・**UI変更なし**・**Server Action変更なし**・**RBAC変更なし**・**crm:* 新設なし**・**Contact PII追加なし**・**company-brain-reference変更なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
