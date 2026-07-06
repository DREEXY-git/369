---
doc: roadmap/22
title: 既存LeadMap / LocalBusinessLead を CRM Lead 正本候補として追認する差分整理 Candidate（docs-only）
status: Candidate
area: roadmap/crm-leadmap-reconciliation
phase: 事業 Phase 2 Salesforce Mini / CRM基盤 / PDF Phase 2.5
risk: docs-only
date: 2026-07-06
related:
  - docs/roadmap/21_crm_lead_only_implementation_gate_candidate.md
  - docs/roadmap/20_crm_lead_only_minimum_design_candidate.md
  - docs/roadmap/19_crm_minimum_vertical_slice_candidate.md
  - docs/roadmap/18_crm_sfa_salesforce_lineage_candidate.md
  - docs/audit/121_crm_leadmap_existing_implementation_reconciliation.md
---

# 22. 既存LeadMap / CRM実装と Lead-only 設計の差分整理 Candidate（docs-only）

> 種別: **docs-only / Candidate**。**GitHubが正本**・**Obsidianは閲覧**・**369-vault は直接編集しない**。
> 状態: **Candidate**。**実装・schema変更・migration・UI変更・Server Action変更ではない**（read-only 監査＋docs-only 記録）。

## 1. 目的

doc121 実装スプリント着手時に、既存リポジトリへ **既に LeadMap / CRM Lead 相当の実装が存在**することが判明した。本書は、既存 `LocalBusinessLead` / `/leadmap` を **CRM Lead の正本候補**として read-only で追認できるかを整理し、doc118〜120（greenfield 前提の Candidate）とのズレを docs-only で記録する。**新規実装はしない**。

## 2. なぜ実装を止めたか

doc121 の Definition of Ready は「既存 Lead / CrmLead model がある」「既存CRM実装が見つかり、重複の可能性がある」場合に停止と定めていた。実測で既存に `LocalBusinessLead`（実リード）＋フルCRM（Customer/Contact/Deal/Account）＋`/leadmap` UI＋安全な Server Action が存在したため、**新規 `Lead` モデルはデータモデル分裂を招く**と判断し、実装せず停止した。

## 3. 既存実装の発見

- schema: `LeadSearchCampaign` / `LeadSearchCondition` / `LocalBusinessLead` / `LocalBusinessContact` / `LeadInsight` / `LeadScore` / `LeadPipelineStageHistory` / `Customer` / `Contact` / `Deal` / `DealStageHistory` / `Account` / enum `LeadStage` / enum `DataSource` / enum `ConfidentialityLabel`。
- UI: `apps/web/app/(app)/leadmap/`（`page.tsx` / `leads` / `campaigns` / `map` / `pipeline` / `routes` / `settings` / `actions.ts`）＋ `apps/web/app/api/leadmap/export`。
- 権限: `packages/shared/src/rbac.ts` に `leadmap` アクション・`leadmap:external_send`・`leadmap:read`/`ai_read` が既存。

## 4. LocalBusinessLead の位置づけ

- `LocalBusinessLead`（schema:2756）は **LeadMap AI の実リード実体**。tenantId・name・industry・address?/phone?/email?・website?・rating・reviewCount・placeId?・source(DataSource)・attributionRequired・fetchedAt?/expiresAt?・cachePolicy・priority・**stage `LeadStage @default(NEW)`**・ownerId?・**customerId?（商談化で CRM Customer に連携）**・dealId?・lastContactAt? を保持。
- 関連: campaign / contacts / placeSnapshots / reviews / websiteScans / socialProfiles / insights / scores / outreachDrafts / pipelineHistory。
- **doc119 が新規に作ろうとした「Lead 1テーブル」は、実質この `LocalBusinessLead` が既に担っている**。

## 5. LocalBusinessContact と Contact PII

- `LocalBusinessContact`（schema:2805）は leadId 紐づきで **name?/title?/email?/phone?（Contact PII）を既に保持**。
- doc119/120 は「Contact PII 非保存」を前提にしていたが、**LeadMap は営業（outreach）のため PII を保持する設計**。これは前提の根本的なズレ（§11）。

## 6. Customer / Contact / Deal / Account との関係

- `Customer`（schema:494）＝ CRM 顧客。**`label ConfidentialityLabel @default(CUSTOMER_CONFIDENTIAL)`**・phone/email/address（PII）・contacts/deals/complaints/invoices。
- `Contact`（schema:527）＝ 顧客連絡先 PII。
- `Deal`（schema:622）＝ SFA 商談。`stage DealStage`・amount(Decimal)・probability・expectedCloseAt・**source(manual|leadmap)**・**leadId?（LeadMap 連携）**・stageHistory/activities/quotes/proposals。
- `Account`（schema:905）＝ 取引先。
- **リード → 商談化 → CRM Customer/Deal の橋（customerId/dealId/leadId）が既に配線済み**。

## 7. LeadStage と doc119 status enum の差分

- 既存 `LeadStage` = NEW / ANALYZED / DRAFTED / PENDING_APPROVAL / READY / SENT / OPENED / CLICKED / REPLIED / APPOINTMENT / NEGOTIATING / QUOTED / WON / LOST / UNSUBSCRIBED / EXCLUDED（16値・outreach 全ライフサイクル）。
- doc119 提案 = NEW / REVIEWING / QUALIFIED / EXCLUDED / ARCHIVED（5値）。
- **差分**: 既存は営業実務に即した16値。doc119 の REVIEWING/QUALIFIED/ARCHIVED は既存に無い（NEW/EXCLUDED は共通）。**既存 `LeadStage` を正とし、doc119 enum は採用しない**のが妥当。

## 8. 既存 `/leadmap` UI の棚卸し

- `/leadmap`（トップ）・`/leadmap/leads`（一覧・tenantId スコープ・stage/campaign/q フィルタ・priority 降順・take 100）・`/leadmap/leads/[id]`（詳細）・`/leadmap/leads/[id]/analysis`・`/leadmap/leads/[id]/outreach`・`/leadmap/pipeline`・`/leadmap/map`・`/leadmap/campaigns/new`・`/leadmap/routes`・`/leadmap/settings`。
- **doc118〜120 が新設しようとした一覧/詳細/パイプラインは既に存在**（`/crm/leads` の新設は不要）。

## 9. 既存 Server Action の棚卸し

- `apps/web/app/(app)/leadmap/actions.ts`：`requireUser` → `hasPermission(user,'leadmap',...)` → `tenantId` スコープ → 変更系は `writeAudit` → `revalidatePath`。
- AI 経路は `actorType: 'ai_agent'` を明示し、outreach は `OutreachApproval`（PENDING）＝**人間承認前提**。外部送信は `leadmap:external_send` 権限でゲート。
- **doc120 が要求した安全条件（requireUser/tenantId/hasPermission/writeAudit/物理削除なし/AI境界）は既存で概ね充足**。

## 10. tenantId / RBAC / writeAudit の実測

- tenantId: `LocalBusinessLead`・`Customer`・`Deal` ほか全モデルにスカラ tenantId（クエリも tenantId スコープ・実測）。
- RBAC: `leadmap` は専用アクションとして rbac に既存。**doc の「`crm:*` 新設 vs knowledge 権限代替」の論点は、既に `leadmap` 権限があるため実質決着**（新設不要）。
- writeAudit: campaign 作成・AI 分析・outreach 生成/承認申請などで実測。

## 11. doc118〜120 の前提とのズレ

| 論点 | doc118〜120（greenfield前提） | 既存実装（実測） |
|---|---|---|
| Lead 実体 | 新規 `Lead` 1テーブル | 既存 `LocalBusinessLead` |
| Contact PII | 非保存 | LocalBusinessContact/Customer/Contact が保持 |
| status | NEW/REVIEWING/QUALIFIED/EXCLUDED/ARCHIVED | `LeadStage` 16値 |
| 権限 | knowledge 暫定 or `crm:*` 新設 | 専用 `leadmap` 権限が既存 |
| UI | `/crm/leads` 新設 | `/leadmap/*` が既存 |
| CRM 接続 | handoff 候補 | customerId/dealId/leadId で配線済み |
| 高機密ラベル | 別承認で将来 | Customer が既定 CUSTOMER_CONFIDENTIAL |

## 12. 新規 Lead モデルを作らない理由

- 既存 `LocalBusinessLead` と**二重のリード実体**になり、真実の源が2つに分裂する。
- 既存の campaign/insight/score/pipeline/outreach/CRM 連携をすべて再実装する羽目になる。
- LeadMap の Google 帰属・キャッシュ方針・source 管理を失う。

## 13. `/crm/leads` を新設しない理由

- `/leadmap/leads` が既に一覧/詳細/フィルタ/パイプラインを提供。
- 別ルート新設は導線分裂・回帰リスク・保守二重化を招く。

## 14. 既存実装を CRM Lead 正本候補として扱う方針

- **`LocalBusinessLead` = CRM Lead の正本候補**、`/leadmap` = その正本 UI として追認する（Candidate）。
- doc118〜120 は削除せず、「**greenfield 前提の Candidate だった**」と位置づけ、本書で既存実装との突合結果を残す。

## 15. 今後の不足補強候補（実装は別承認）

- **アーカイブ導線**: `LocalBusinessLead` に `archivedAt`（ソフトアーカイブ）が無い（stage=EXCLUDED はあるが物理的な非表示アーカイブとは別概念）。
- **社内メモ**: doc119 の internalNote 相当が `LocalBusinessLead` に無い。
- **AIロール mutation 一律拒否の明文化**: 既存は actorType 運用だが、人間専用化の一貫性を docs で明文化する余地。
- いずれも **既存モデルへの薄い追加**であり、新規テーブルではない（別承認）。

## 16. 実装するなら何を直すべきか

- 新規作成ではなく、**既存 `LocalBusinessLead` / `/leadmap` の薄い補強**に限定（§15）。
- schema を触る場合も **既存 `LocalBusinessLead` へのフィールド追加1つ＋migration1本**まで（別の重い承認）。
- 既存の campaign/outreach/CRM 連携は壊さない（回帰ゲート必須）。

## 17. 実装してはいけないこと

- 新規 `Lead` モデル・`/crm/leads` 新設・既存 `/leadmap` の破壊的変更・Contact PII の新規追加・`crm:*` 新設・RBAC 変更・外部送信・実LLM・本番 deploy。

## 18. Contact PII / Consent / Security Gate

- 既存 `Customer`/`Contact`/`LocalBusinessContact` は PII を保持し、`Customer.label` は既定 **CUSTOMER_CONFIDENTIAL**。**高機密ラベル運用（doc108〜114）はここに接続**する。
- Consent Gate: outreach は `ConsentRecord`/`SuppressionList`/`OutreachApproval` 前提（既存設計）。Security Gate: tenantId/RBAC/writeAudit は充足、PII の company-brain-reference 非注入は維持。

## 19. Human Certification Gate

- 外部送信は `leadmap:external_send` 権限＋`OutreachApproval`（PENDING→人間承認）で既にゲート。AI 単独送信なし（既存設計が Human Certification Gate に整合）。

## 20. Business Event Ledger 将来接続

- `LeadPipelineStageHistory`・`DealStageHistory`・`writeAudit` が、将来 Business Event Ledger へ集約する接続点（今回実装しない）。

## 21. 完全機能台帳 50カテゴリ対応（短縮）

- 直接: C08 CRM/Customer360・C09 SFA/Sales OS・C46 Governance Docs。
- 間接: C01,C03,C04,C05,C06,C07,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C37,C38,C39,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C40,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。不明: なし。

## 22. 20大カテゴリ対応

- 直接: 3.CRM/SFA・18.セキュリティ/権限/監査・1.OS本体・2.Company Brain。
- 間接: 4.ERP・5.AD OS/Growth・11.Developer Platform・12.業務自動化・14.法務/契約・15.BI・19.課金/Unit Economics。禁止: 20.フィジカルAI。

## 23. 追加19領域対応

- 確認のみ: AI Governance・Data Governance/Semantic Layer・AI Evaluation・Trust Center・Observability・MCP/Integration・Onboarding/Migration・Customer-facing Portal・Risk/Insurance/Liability（実装しない）。

## 24. 5本柱対応

1. Human Certification Gate（外部送信の承認境界・既存 OutreachApproval に整合）。
2. Business Event Ledger（stageHistory/writeAudit を将来集約・§20）。
3〜5. AI社員の免許/給与明細/派遣所（将来接続候補・記録のみ）。

## 25. Phase対応

- 事業 Phase 2（Salesforce Mini / CRM基盤）＝**既に実装済み領域**。PDF Phase 2.5（初期MVP）は既存 `/leadmap` が該当。戦略 Phase 20-26 は将来接続。

## 26. Complete Ledger R0-R14

- **R4 Commercial Core**（CRM/SFA 実装本体）＋**R0 Governance Docs**（本 docs 体系）が中心。R1/R2/R3/R7/R8/R9/R11/R12 は間接。

## 27. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `aa4051bedc445c61a63ca5c5076c3f3d7a13d2ff`・clean・`origin/main..HEAD` 空・doc121/roadmap22 未存在）。
- schema 実測: `LocalBusinessLead`(2756)・`LocalBusinessContact`(2805)・`Customer`(494)・`Contact`(527)・`Deal`(622)・`Account`(905)・`enum LeadStage`(84)・`enum ConfidentialityLabel`(40)。
- UI 実測: `apps/web/app/(app)/leadmap/`（leads/campaigns/map/pipeline/routes/settings/actions.ts）。
- 安全機構 実測: actions.ts の requireUser/hasPermission('leadmap')/tenantId/writeAudit/OutreachApproval・rbac の `leadmap`/`leadmap:external_send`。
- 封印維持: `node scripts/check-company-brain-safety.mjs` exit 0（実測）。369-vault 非編集（実測）。

## 28. Assumption Log

- 本書は Candidate・docs-only の追認整理であり、実装ではない。
- 既存 `LocalBusinessLead` を CRM Lead 正本候補として扱う（案A）。doc118〜120 は削除せず greenfield 前提の Candidate と位置づける。
- 既存 `leadmap` 権限があるため `crm:*` 新設・knowledge 代替の論点は解消。369-vault 未編集。

## 29. Unknowns Log

- `LocalBusinessLead` に archivedAt / internalNote を足すか（不足補強の是非）。
- doc118〜120 起草時に既存実装を参照したか（乖離の原因）。
- CRM `Customer`/`Deal` と LeadMap の役割分担の最終確定（どこまでが Lead でどこからが Customer か）。
- 高機密ラベル（Customer 既定 CUSTOMER_CONFIDENTIAL）の runtime 閲覧統制の現状。

## 30. Risk Register

- 二重リード実体リスク → 新規 Lead を作らず既存追認（案A）で回避。
- doc と実装の乖離を放置するリスク → 本書で突合結果を正本化。
- 既存 `/leadmap` を誤って壊すリスク → 今回 read-only・非接触。
- PII 前提の取り違えリスク → 既存は PII 保持設計と明記。
- 高機密ラベル未統制リスク → doc108〜114 ラインとの接続を明記（別承認）。

## 31. Definition of Done

- [x] 既存 LeadMap/CRM 実装を read-only で棚卸し（schema/UI/Server Action/権限）。
- [x] doc118〜120 とのズレを表で整理（§11）。
- [x] 新規 Lead モデル・`/crm/leads` を作らない理由を明記。
- [x] 既存を CRM Lead 正本候補として追認する方針（案A）と不足補強候補（別承認）を記録。
- [x] 実装・schema変更・migration・UI変更なし（docs-only）・safety exit 0・369-vault非編集。

## 32. 次回推奨プロンプト案

1. **doc121 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 20項目報告）。
2. **既存 LocalBusinessLead 薄い補強の実装可否判断 docs-only**（archivedAt / internalNote を足すか・別の重い承認）。
3. 高機密ラベル運用の既存 Customer（CUSTOMER_CONFIDENTIAL 既定）への接続現状監査（doc108〜114 ライン・docs-only）。

## 33. 判定

**判定: READY / GO（案A）** — 既存 `LocalBusinessLead` / `/leadmap` を **CRM Lead の正本候補として追認**し、新規 `Lead` モデル・`/crm/leads` は作らない。doc118〜120 は削除せず、greenfield 前提の Candidate として温存し、本書で既存実装との突合結果を残す。

ただし、これは実装ではない。**docs-only**・**Candidate**・**schema変更なし**・**migrationなし**・**UI変更なし**・**Server Action変更なし**・**RBAC変更なし**・**crm:* 新設なし**・**Contact PII追加なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
