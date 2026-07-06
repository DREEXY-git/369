---
doc: roadmap/25
title: 高機密ラベル runtime 統制の現状監査 Candidate（docs-only）
status: Candidate
area: roadmap/security-privacy-audit
phase: 事業 Phase 2 CONDITIONAL COMPLETE → Phase 3 移行残件② / PDF Phase 2.5
risk: docs-only
date: 2026-07-06
related:
  - docs/roadmap/24_phase2_formal_completion_record_candidate.md
  - docs/audit/108_high_confidential_label_enablement_policy_decision.md
  - docs/audit/110_high_confidential_label_access_predicate_implementation.md
  - docs/audit/114_customer_pain_schema_design_docs_only.md
  - docs/audit/124_high_confidential_runtime_control_audit.md
---

# 25. 高機密ラベル runtime 統制の現状監査 Candidate（docs-only）

> 種別: **docs-only / read-only audit / Candidate**。**GitHubが正本**・**Obsidianは閲覧**・**369-vault は直接編集しない**。
> 状態: **Candidate**。**実装・schema変更・migration・RBAC変更・runtime 解禁ではない**（read-only 監査＋docs 記録のみ）。

## 1. 目的

Phase 3 AI Growth Engine 進入の残件②「**高機密ラベル runtime 統制**の現状監査」を docs-only で実施し、doc108〜114 の設計と実コードのズレを整理する。**runtime 解禁ではない**。

## 2. 現在地の正

- 事業 Phase 2 **CONDITIONAL COMPLETE**（doc123）／ Phase 3 進入は **HOLD**。PDF Phase 2.5。Complete Ledger **R4 Commercial Core + R0 Governance Docs**（本監査は **R12 Trust / Compliance / Security** への接続）。
- HEAD = origin/main = origin/current-feature = `b4aa49890e59d29711097aae55ef01f5239c2dae`（実測）。

## 3. 監査対象

- `packages/shared/src/labels.ts`（`canAccessLabel`・`CUSTOMER_CONFIDENTIAL`）・`packages/shared/src/customer-pain-access.ts`（doc110 標準閲覧式）・`apps/web/lib/company-brain-reference.ts`（AI参照）・`apps/web/lib/db.ts`/`audit.ts`/`security/policy.ts`（`writeDataAccess`/`DataAccessLog`/ABAC）・`packages/db/prisma/schema.prisma`（`Customer`/`Contact`/`LocalBusinessContact`/`LocalBusinessLead`/`DataAccessLog`）・doc108〜114。

## 4. doc108〜114 の設計要約

- doc108: 高機密ラベル解禁は **DO_NOT_ENABLE_YET**（まだ解禁しない）。doc109: 最小実装設計（標準閲覧式）。doc110: 閲覧判定の純粋関数 `canViewCustomerPainDetail`（tenantId × knowledge:update × `canAccessLabel(CUSTOMER_CONFIDENTIAL)` × `isHumanUser` × archivedAt null の AND）。doc111: 静的安全ゲート。doc112: 候補A+B完了後も **runtime 解禁しない**。doc113/114: Customer Pain schema 設計（docs-only・schema変更なし）。

## 5. 実コードの実測結果

- **`canAccessLabel`**（labels.ts:45）: OWNER バイパス＋`LABEL_ALLOWED_ROLES` 参照の純粋関数。`CUSTOMER_CONFIDENTIAL` に許可ロール定義あり（labels.ts:28）。
- **AI参照経路**（company-brain-reference.ts）: `AI_READABLE_LABELS = ['NORMAL','INTERNAL']`（:33）で **DB where フィルタ**（`label: { in: AI_READABLE_LABELS }`）＋`canAccessLabel` で**二重ガード**。外部LLM は `externalAiAllowed=true`＋`maskText`、CaseStudy は `anonymized=true`＋`private` のみ。→ **CUSTOMER_CONFIDENTIAL は AI に構造的に注入されない**。
- **`writeDataAccess`/`DataAccessLog`**（db.ts:62・schema:331）: 実装済み。`audit.ts` に `confidential_view`/`ai_reference`/`export`、`security/policy.ts` に ABAC assert＋DataAccessLog。
- **`customer-pain-access.ts`**（doc110）: 純粋関数として存在するが **apps から未接続**（Customer Pain 本実装は未着手）。
- **safety seal**: `node scripts/check-company-brain-safety.mjs` exit 0（実測）。

## 6. Customer / Contact / LocalBusinessContact / LocalBusinessLead の扱い

- **Customer**（schema:506）: `label ConfidentialityLabel @default(CUSTOMER_CONFIDENTIAL)`・PII（phone/email/address）。`/customers` ルート（page/[id]/edit/actions.ts）が存在。
- **Contact**・**LocalBusinessContact**: Contact PII（name/email/phone）を保持。**LocalBusinessLead**: PII（address/phone/email）を保持（LeadMap 営業のため）。
- **ズレ**: これら **CRM/LeadMap の人間 UI 閲覧経路で `canAccessLabel(CUSTOMER_CONFIDENTIAL)` ＋ `writeDataAccess(confidential_view)` が配線されているかは本監査の grep では確認できず**（`canAccessLabel` の利用は company-brain-reference.ts のみ）。

## 7. CUSTOMER_CONFIDENTIAL の現状

- ラベル定義・許可ロール・badge は存在。`Customer` 既定ラベルは CUSTOMER_CONFIDENTIAL。**AI 参照からは構造的に除外**（§5）。**人間 UI 側の閲覧統制の配線は未確認**（§6）。

## 8. canAccessLabel / RBAC / tenantId の現状

- `canAccessLabel` は純粋関数として実装・AI参照経路で runtime 実行。**RBAC**（`hasPermission`/`canForRoles`）・**tenantId** スコープは CRM/LeadMap の Server Action で実測済み（doc121）。**本監査では RBAC を変更しない**。

## 9. writeDataAccess / DataAccessLog の現状

- `writeDataAccess`（db.ts:62）・`DataAccessLog`（schema:331）・ABAC（security/policy.ts）は実装済み。AI参照は `ai_reference`、機密閲覧は `confidential_view` で記録可能。**CRM Customer/Contact の人間閲覧で `confidential_view` が実際に呼ばれているかは未確認**（§6・要追加監査）。

## 10. Company Brain / AI参照への注入状況

- Company Brain の AI 参照は **NORMAL/INTERNAL のみ**（`AI_READABLE_LABELS`）＋`canAccessLabel`＋外部LLM時 externalAiAllowed＋maskText。**CUSTOMER_CONFIDENTIAL・顧客PII は注入されない**（封印は閉じている）。

## 11. 外部送信 / externalAiAllowed / 実LLM の現状

- 外部LLM送信は `externalAiAllowed=true` のレコードのみ＋`maskText`（true を立てる UI は無く構造的にゼロ）。本監査では **外部送信なし**・**実LLMなし**・**AIコストなし**・`externalAiAllowed true 解禁なし**。

## 12. ロードマップ上の現在地（10項目・明示見出し）

### 12-1. 現在のPhase

- 事業 Phase 2 **CONDITIONAL COMPLETE** / PDF Phase 2.5 / Complete Ledger **R4 Commercial Core + R0 Governance Docs**（本監査は R12 Trust/Compliance/Security 接続）。

### 12-2. 現在のPhaseで完了したこと

- AI参照経路の高機密ラベル封印（NORMAL/INTERNAL のみ＋canAccessLabel 二重ガード）・`writeDataAccess`/`DataAccessLog`/ABAC 実装・`canAccessLabel` 純粋関数・doc110 標準閲覧式の純粋関数化・safety seal exit 0。

### 12-3. 現在のPhaseで未完了のこと

- CRM Customer/Contact/LocalBusinessLead の**人間 UI 閲覧での `canAccessLabel` ＋ `writeDataAccess(confidential_view)` 配線が未確認**・doc110 標準閲覧式（customer-pain-access.ts）は **apps 未接続**・高機密ラベル runtime 解禁は doc112 停止条件のまま**未解禁**。

### 12-4. 次に進むPhase

- 事業 Phase 3（AI Growth Engine）／ PDF Phase 3（承認・監査基盤）。

### 12-5. 次のPhaseへ進むために必ず完了すべきこと

1. CRM Customer/Contact 閲覧の `canAccessLabel`＋`writeDataAccess` 配線の確認（追加 read-only 監査）。2. doc110 標準閲覧式の実接続方針の確定（別承認）。3. Phase 3 移行残件①③④⑤⑥（doc123）。

### 12-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）

- **HOLD**（本監査は判定 B）。Phase 3 進入は **人間 Phase Gate 承認**事項。

### 12-7. GO / HOLD の理由

- AI参照封印は閉じている（GO 相当）が、**人間 UI 閲覧側の CUSTOMER_CONFIDENTIAL 統制配線が未確認**・doc110 標準閲覧式が未接続のため、runtime 統制全体は **HOLD**。安全側判断。

### 12-8. 人間承認が必要な判断

- 高機密ラベル runtime 解禁の可否（doc112 停止条件からの重い承認）・Customer 閲覧統制の実装可否・doc110 標準閲覧式の実接続・Phase 3 進入可否。

### 12-9. 次Phaseに進む前にやってはいけないこと

- 高機密ラベル runtime 無承認解禁・canAccessLabel/writeDataAccess の無承認実装・externalAiAllowed true 解禁・外部送信・実LLM・AIコスト・schema変更・migration・RBAC変更・company-brain-reference変更・leadmap実装変更。

### 12-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか

- **roadmap**: 本書 `docs/roadmap/25`。**audit**: `docs/audit/124`。**CURRENT_STATE**: doc124 要約1段落。**PROGRESS**: 箇条書き＋見出し。**Obsidian Dashboard**: 入口1行（GitHub docs 側のみ）。369-vault は**非編集**。

## 13. Complete Function Coverage Matrix（50カテゴリ）

| Cat | 名称 | 区分 |
|---|---|---|
| C01 | Core OS / Tenant基盤 | 間接 |
| C02 | Enterprise Identity / Admin | 後続 |
| C03 | Permission / Approval / Audit | 対象（直接） |
| C04 | AI Governance / Agent Control Plane | 間接 |
| C05 | AI Safety / Evaluation / Red Team | 間接 |
| C06 | Data Governance / Semantic Layer | 対象（直接） |
| C07 | Company Brain / Knowledge OS | 間接 |
| C08 | CRM / Customer 360 | 対象（直接） |
| C09 | SFA / Sales OS | 間接 |
| C10 | Quote / Pricing / Product Master | 間接 |
| C11 | Contract / Legal Ops | 間接 |
| C12 | Invoice / Billing | 間接 |
| C13 | Payment / Reconciliation | 後続 |
| C14 | Accounting / Finance | 後続 |
| C15 | ERP / Operations | 間接 |
| C16 | EC / POS / Reservation | 後続 |
| C17 | Procurement / PLUG / Price Compare | 後続 |
| C18 | AD OS / Growth Engine | 間接 |
| C19 | Ads Management | 後続 |
| C20 | SNS / LINE / Email / DM | 間接 |
| C21 | SEO / Content / PR | 後続 |
| C22 | Referral / Affiliate / Creator / Business Network | 後続 |
| C23 | HR / Recruiting | 後続 |
| C24 | Labor / People Ops | 後続 |
| C25 | Education / Academy | 後続 |
| C26 | Customer Support / CS | 間接 |
| C27 | Project / Task / Workflow | 後続 |
| C28 | BI / Dashboard / Reporting | 間接 |
| C29 | Business Simulator / Digital Twin | 後続 |
| C30 | AI Employee Platform | 間接 |
| C31 | AI Employee Development Environment | 後続 |
| C32 | AI Employee Marketplace | 後続 |
| C33 | Developer Platform | 間接 |
| C34 | Integration Hub / Adapter | 間接 |
| C35 | Browser Extension / Desktop / Mobile | 後続 |
| C36 | Billing / Metering / FinOps | 後続 |
| C37 | Trust Center / Compliance Center | 対象（直接） |
| C38 | Consent / Privacy / Data Protection | 対象（直接） |
| C39 | Security / Zero Trust | 対象（直接） |
| C40 | Observability / SRE / Incident | 間接 |
| C41 | Onboarding / Migration | 後続 |
| C42 | Vertical Template Factory | 後続 |
| C43 | White-label / Embedded | 後続 |
| C44 | International / Multi-region | 後続 |
| C45 | Physical AI / IoT / Robotics | 禁止 / Future隔離 |
| C46 | Governance Docs / GitHub / Obsidian | 対象（直接） |
| C47 | Sales / Partner / Go-to-market Ops | 後続 |
| C48 | Risk / Insurance / Liability | 間接 |
| C49 | App Review / Marketplace Governance | 後続 |
| C50 | Community / Ecosystem Analytics | 後続 |

（不明: なし）

## 14. 20大カテゴリとの接続

- 直接: 1.AI経営OS本体・2.Company Brain・3.CRM/SFA・18.セキュリティ/権限/監査・14.法務/契約/コンプライアンス・15.BI/経営分析（AD OS/Growth Engine=5 は Phase 3 予告）。

## 15. 追加19領域との接続

- AI Governance / Data Governance / AI Evaluation・Red Team / Trust Center / Observability / Consent・Privacy / Risk・Insurance・Liability（今回は確認・実装しない）。

## 16. 369独自差別化5本柱との接続

1. **Human Certification Gate**（外部作用の承認境界・今回直接保護）。2. **Business Event Ledger**（DataAccessLog/writeAudit を将来集約・今回直接保護）。3〜5. AI社員の免許制度/給与明細/派遣所（将来接続として記録）。

## 17. 初期MVPで作らないもの

- 外部API完全連携・広告完全自動運用・LINE/DM/SNS/PR/SEO自動化・請求/会計/契約の自動確定・値引き確定・個人情報外部共有自動化・同意なし外部送信・虚偽口コミ・ステマ・成果保証表現・法的適合の断定・クロステナント学習・フィジカルAI実装・医療/法律/税務/労務判断の自動確定。

## 18. Global AI Rules

- **AIができること**: 分析・下書き・提案・要約・参照（tenantId スコープ・**NORMAL/INTERNAL のみ**・read-only）。
- **AIが無承認でしてはいけないこと**: 外部送信・契約・値引き・請求・送金・採用確定・会計確定・削除・高機密ラベル解禁・externalAiAllowed true 化・実LLM/AIコスト発生。
- **Human Certification Gate**（危険操作は人間承認）・**Consent Gate**（送信/公開は同意確認）・**Security Gate**（tenantId/RBAC/writeAudit/writeDataAccess/Data Classification/PII非注入/高機密ラベル runtime 統制）。

## 19. 判定案

- **B: HOLD**。AI参照経路の高機密ラベル封印は閉じている（GO 相当）が、**CRM Customer/Contact 人間 UI 閲覧のラベル統制配線が未確認**・doc110 標準閲覧式が未接続・runtime 解禁は doc112 停止条件のまま。安全側で **HOLD**。

## 20. Phase 3 HOLD解除への影響

- 本監査は残件②を**部分的に前進**（AI参照封印は確認済み・GO 相当）させたが、**残件②を完全 green にはしていない**（人間閲覧側の統制配線が未確認）。Phase 3 進入は引き続き HOLD・**人間 Phase Gate 承認**事項。

## 21. 次に必要な補強

- CRM Customer/Contact 閲覧経路の `canAccessLabel`＋`writeDataAccess(confidential_view)` 配線の追加 read-only 監査（docs-only）。doc110 標準閲覧式の実接続方針の確定（別承認）。

## 22. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `b4aa49890e59d29711097aae55ef01f5239c2dae`・clean・`origin/main..HEAD` 空・doc124/roadmap25 未存在・max audit=123）。
- 実測: `canAccessLabel`(labels.ts:45)・`AI_READABLE_LABELS`(company-brain-reference.ts:33)・`writeDataAccess`(db.ts:62)・`DataAccessLog`(schema:331)・`Customer.label` 既定 CUSTOMER_CONFIDENTIAL(schema:506)・`customer-pain-access.ts` apps 未接続・safety exit 0。

## 23. Assumption Log

- 本書は Candidate・docs-only の read-only 監査であり、**runtime 解禁・実装ではない**。
- AI参照封印は閉じていると実測。人間 UI 閲覧側は grep で確認できず → 安全側で HOLD。369-vault 未編集。

## 24. Unknowns Log

- CRM Customer/Contact 詳細画面での canAccessLabel/writeDataAccess の実配線。doc110 標準閲覧式の実接続時期。LocalBusinessLead/Contact PII の閲覧統制の実装状況。

## 25. Risk Register

- 人間 UI で顧客機密が統制なく閲覧されるリスク → 未確認として明記・追加監査を残件に。
- 監査 green を「runtime 解禁OK」と誤読するリスク → 「HOLD・runtime 解禁しない・人間 Phase Gate 承認」を明記。
- AI に顧客機密が注入されるリスク → NORMAL/INTERNAL 限定＋canAccessLabel 二重ガードで閉じていると実測。
- 未push commit の揮発リスク → doc124 push-only（別承認）で解消。

## 26. Definition of Done

- [x] doc108〜114 設計と実コードのズレを read-only で監査（labels/canAccessLabel/writeDataAccess/DataAccessLog/company-brain-reference/Customer/Contact/LocalBusinessLead）。
- [x] AI参照封印（NORMAL/INTERNAL 二重ガード）を確認・人間 UI 閲覧統制の未確認を明記。
- [x] 判定 B: HOLD・Phase 3 進入は人間 Phase Gate 承認事項・現在地10項目・50カテゴリ Matrix・Global AI Rules を記録。
- [x] 実装・schema変更・migration・RBAC変更・runtime 解禁・外部送信・実LLM・AIコスト・本番確認なし（docs-only）・safety exit 0・369-vault非編集。

## 27. 次回推奨プロンプト案

1. **doc124 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 20項目報告）。
2. **CRM Customer/Contact 閲覧統制の追加 read-only 監査 docs-only**（canAccessLabel/writeDataAccess 配線の実測）。
3. **外部送信 Human Certification Gate 運用の現状監査 docs-only**（残件③・`leadmap:external_send`＋OutreachApproval・read-only）。

## 28. 判定

**判定: B — HOLD（docs 整理として READY / GO・ただし高機密ラベル runtime 統制は完全 green ではない）**。

AI参照経路の高機密ラベル封印は閉じているが、人間 UI 閲覧側の CUSTOMER_CONFIDENTIAL 統制配線が未確認・doc110 標準閲覧式が未接続のため **HOLD**。**Phase 3 進入は人間 Phase Gate 承認事項**。**docs-only**・**Candidate**・**実装なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**canAccessLabel 実装なし**・**writeDataAccess 実装なし**・**runtime 解禁なし**・**externalAiAllowed true 解禁なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
