---
doc: roadmap/26
title: CRM Customer / Contact 閲覧統制の追加監査 Candidate（docs-only）
status: Candidate
area: roadmap/security-privacy-audit
phase: 事業 Phase 2 CONDITIONAL COMPLETE → Phase 3 HOLD / PDF Phase 2.5
risk: docs-only
date: 2026-07-06
related:
  - docs/roadmap/25_high_confidential_runtime_control_audit_candidate.md
  - docs/audit/124_high_confidential_runtime_control_audit.md
  - docs/audit/110_high_confidential_label_access_predicate_implementation.md
  - docs/audit/125_customer_contact_confidential_view_control_audit.md
---

# 26. CRM Customer / Contact 閲覧統制の追加監査 Candidate（docs-only）

> 種別: **docs-only / read-only audit / Candidate**。**GitHubが正本**・**Obsidianは閲覧**・**369-vault は直接編集しない**。
> 状態: **Candidate**。**実装・schema変更・migration・RBAC変更・runtime 解禁ではない**（read-only 監査＋docs 記録のみ）。

## 1. 目的

doc124（**高機密ラベル runtime 統制** の現状監査・判定 B: HOLD）で未確認だった「**CRM Customer / Contact / LocalBusinessLead** の人間UI閲覧経路で `canAccessLabel(CUSTOMER_CONFIDENTIAL)` と `writeDataAccess(confidential_view)` が配線されているか」を read-only で追加監査し、docs-only で正本記録する。

## 2. 現在地の正

- 事業 Phase 2 **CONDITIONAL COMPLETE**（doc123）／ Phase 3 進入 **HOLD**。PDF Phase 2.5。Complete Ledger **R4 Commercial Core + R0 Governance Docs**（本監査は R12 Trust/Compliance/Security 接続）。
- HEAD = origin/main = origin/current-feature = `4382f74536845854c263219cf9bcd799b563e116`（実測）。

## 3. 監査対象

- `apps/web/app/(app)/customers/`（page/[id]/edit/insights/timeline/new/actions.ts）・`apps/web/lib/security/policy.ts`（ABAC 統合層 `assertCanViewConfidential`）・`packages/shared/src/policy.ts`（`canAccessLabel` 判定）・`apps/web/lib/db.ts`/`audit.ts`（`writeDataAccess`/`confidential_view`/`DataAccessLog`）・`packages/shared/src/customer-pain-access.ts`（doc110 標準閲覧式）・schema（`Customer`/`Contact`/`LocalBusinessContact`/`LocalBusinessLead`）。

## 4. doc124から引き継ぐ未確認点

- doc124 は `canAccessLabel` を直接 grep したため利用箇所を company-brain-reference.ts のみと捉え、**Customer 人間UI閲覧のラベル統制配線を「未確認」**とした。本監査は **ABAC 統合層 `assertCanViewConfidential` 経由の配線**を追跡する。

## 5. Customer閲覧経路の実測

- **`customers/[id]/page.tsx`（詳細）**: `requireUser`＋tenantId スコープ＋**`assertCanViewConfidential(user, { label: customer.label, ... })`（:30）を実行**。`Customer.label` 既定 CUSTOMER_CONFIDENTIAL がここで統制される。`PolicyDenied` で拒否。→ **詳細閲覧のラベル統制は閉じている**。
- 同型の `assertCanViewConfidential` は meetings/[id]・finance・invoices・invoices/[id] でも使用（横展開済み）。
- **`customers/page.tsx`（一覧）**: `requireUser`＋tenantId スコープはあるが、**行ごとの `assertCanViewConfidential` は無い**（`LabelBadge` 表示のみ）。→ **一覧の行レベル機密統制は詳細より緩い**（要確認点）。
- **`customers/actions.ts`（変更系）**: `requireUser`＋`hasPermission(user,'customer',...)`＋tenantId＋`writeAudit`。

## 6. Contact閲覧経路の実測

- `Contact` は `Customer` に紐づく PII。専用の単体閲覧ルートは確認されず、Customer 詳細配下で扱われる想定。**Contact 単体の閲覧統制配線は本監査では未確認**（要追加確認）。

## 7. LocalBusinessLead / LocalBusinessContact閲覧経路の実測

- `LocalBusinessLead`/`LocalBusinessContact` は LeadMap の実体（PII 保持）。閲覧は `/leadmap/*`（`leadmap` 権限＋tenantId＋writeAudit）。**assertCanViewConfidential ではなく leadmap 権限系で統制**（別体系）。LeadMap の高機密ラベル統制の一体化は要確認点。

## 8. canAccessLabel配線状況

- `canAccessLabel`（labels.ts:45）は純粋関数。runtime 利用は (a) company-brain-reference.ts（AI参照）・(b) knowledge/search・(c) **`packages/shared/src/policy.ts`(:156) の ABAC 判定** → apps の `assertCanViewConfidential` 経由で **Customer 詳細に到達**。→ **Customer 詳細のラベル統制は canAccessLabel 経由で閉じている**。

## 9. writeDataAccess(confidential_view)配線状況

- `writeDataAccess`（db.ts:62）・`confidential_view`（db.ts:40・audit.ts:10 `writeConfidentialView`）・`DataAccessLog`（schema:339）実装済み。`assertCanViewConfidential`（security/policy.ts）は判定と併せ **DataAccessLog / PolicyDecisionLog を記録**（admin/data-access-logs・admin/policy-decisions で可視化）。→ **Customer 詳細閲覧は DataAccessLog に残る**。一覧・Contact 単体は要確認。

## 10. tenantId / RBAC / AIロール除外の状況

- **tenantId**: Customer 全経路で `where: { tenantId: user.tenantId }` スコープ（実測）。**RBAC**: 変更系は `hasPermission(user,'customer',...)`。**AIロール除外**: `isHumanUser`（rbac.ts）は customer-pain-access.ts の標準閲覧式に組み込み済みだが、**Customer 詳細の assertCanViewConfidential 経路での AIロール除外の明示は要確認**（ABAC subject.roles 依存）。

## 11. doc110標準閲覧式の接続状況

- `customer-pain-access.ts`（doc110・`canViewCustomerPainDetail` = tenantId × knowledge:update × `canAccessLabel(CUSTOMER_CONFIDENTIAL)` × `isHumanUser` × archivedAt null）は **apps 未接続**（Customer Pain 本実装は未着手＝doc114 まで docs-only の仕様どおり）。Customer 詳細は別系統の `assertCanViewConfidential` で統制されている。

## 12. ロードマップ上の現在地（10項目・明示見出し）

### 12-1. 現在のPhase

- 事業 Phase 2 **CONDITIONAL COMPLETE** / PDF Phase 2.5 / Complete Ledger **R4 Commercial Core + R0 Governance Docs**（本監査は R12 Trust/Compliance/Security 接続）。

### 12-2. 現在のPhaseで完了したこと

- **Customer 詳細閲覧のラベル統制は `assertCanViewConfidential`（ABAC・canAccessLabel＋DataAccessLog）で配線済み**と確認（doc124 の未確認点を前進）。AI参照封印（NORMAL/INTERNAL 二重ガード）・writeDataAccess/DataAccessLog/ABAC 実装・safety exit 0。

### 12-3. 現在のPhaseで未完了のこと

- **Customer 一覧の行レベル機密統制**（assertCanViewConfidential なし）・**Contact 単体閲覧経路の統制**未確認・LocalBusinessLead/Contact の高機密ラベル一体化未確認・doc110 標準閲覧式は apps 未接続・高機密ラベル runtime 解禁は doc112 停止条件のまま。

### 12-4. 次に進むPhase

- 事業 Phase 3（AI Growth Engine）／ PDF Phase 3（承認・監査基盤）。

### 12-5. 次のPhaseへ進むために必ず完了すべきこと

1. Customer 一覧・Contact 単体・LocalBusinessLead 閲覧の機密統制の追加確認（read-only）。2. doc110 標準閲覧式の実接続方針の確定（別承認）。3. Phase 3 残件①③④⑤⑥（doc123）。

### 12-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）

- **HOLD**（本監査は判定 B）。Phase 3 進入は **人間 Phase Gate 承認**事項。

### 12-7. GO / HOLD の理由

- Customer 詳細のラベル統制は閉じている（前進）が、一覧の行レベル統制・Contact 単体経路が未確認・doc110 標準閲覧式が未接続のため、runtime 統制全体は **HOLD**。安全側判断。

### 12-8. 人間承認が必要な判断

- 高機密ラベル runtime 解禁の可否（doc112 停止条件）・Customer 一覧/Contact の統制強化の実装可否・doc110 標準閲覧式の実接続・Phase 3 進入可否。

### 12-9. 次Phaseに進む前にやってはいけないこと

- 高機密ラベル runtime 無承認解禁・canAccessLabel/writeDataAccess の無承認実装・externalAiAllowed true 解禁・外部送信・実LLM・AIコスト・schema変更・migration・RBAC変更・company-brain-reference変更・leadmap実装変更・customers 実装変更。

### 12-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか

- **roadmap**: 本書 `docs/roadmap/26`。**audit**: `docs/audit/125`。**CURRENT_STATE**: doc125 要約1段落。**PROGRESS**: 箇条書き＋見出し。**Obsidian Dashboard**: 入口1行（GitHub docs 側のみ）。369-vault は**非編集**。

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

- 直接: 1.AI経営OS本体・2.Company Brain・3.CRM/SFA・18.セキュリティ/権限/監査・14.法務/コンプライアンス・15.BI（AD OS/Growth Engine=5 は Phase 3 予告）。

## 15. 追加19領域との接続

- AI Governance / Data Governance / AI Evaluation・Red Team / Trust Center / Consent・Privacy / Observability・SRE / Risk・Insurance・Liability（今回は確認・実装しない）。

## 16. 369独自差別化5本柱との接続

1. **Human Certification Gate**（危険操作の承認境界・今回保護）。2. **Business Event Ledger**（DataAccessLog/writeAudit を将来集約・今回保護）。3〜5. AI社員の免許制度/給与明細/派遣所（将来接続として記録）。

## 17. 初期MVPで作らないもの

- 外部API完全連携・広告完全自動運用・LINE/DM/SNS/PR/SEO自動化・請求/会計/契約の自動確定・返金/相殺/値引きの自動確定・個人情報外部共有自動化・同意なし外部送信・虚偽口コミ・なりすましレビュー・ステマ・成果保証表現・法的適合の断定・クロステナント学習・フィジカルAI実装・医療/法律/税務/労務判断の自動確定。

## 18. Global AI Rules

- **AIができること**: 分析・下書き・提案・要約・参照（tenantId スコープ・NORMAL/INTERNAL のみ・read-only）。
- **AIが無承認でしてはいけないこと**: 外部送信・契約・値引き・請求・送金・採用確定・会計確定・削除・高機密ラベル解禁・externalAiAllowed true 化・実LLM/AIコスト発生。
- **Human Certification Gate**（危険操作は人間承認）・**Consent Gate**（送信/公開は同意確認）・**Security Gate**（tenantId/RBAC/writeAudit/writeDataAccess/Data Classification/PII非注入/**高機密ラベル runtime 統制**）。

## 19. 判定案

- **B: HOLD**。**Customer 詳細閲覧のラベル統制は `assertCanViewConfidential`（canAccessLabel＋DataAccessLog）で閉じている**（doc124 の未確認を前進）が、**Customer 一覧の行レベル統制・Contact 単体経路が未確認**・doc110 標準閲覧式が未接続のため、安全側で **HOLD**。**明確な無統制経路は発見していない（C ではない）**。

## 20. Phase 3 HOLD解除への影響

- 残件②「高機密ラベル runtime 統制の現状監査」を**さらに前進**（Customer 詳細のラベル統制は閉じていると確認）させたが、一覧/Contact の統制未確認が残るため **完全 green にはしていない**。Phase 3 進入は引き続き HOLD・**人間 Phase Gate 承認**事項。

## 21. 次に必要な補強

- Customer 一覧・Contact 単体・LocalBusinessLead 閲覧の機密統制の追加 read-only 監査（一覧行レベルで機密情報を出していないか）。doc110 標準閲覧式の実接続方針の確定（別承認）。

## 22. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `4382f74536845854c263219cf9bcd799b563e116`・clean・`origin/main..HEAD` 空・doc125/roadmap26 未存在・max audit=124）。
- 実測: `customers/[id]/page.tsx:30 assertCanViewConfidential`・`customers/page.tsx`（一覧・assert なし）・`customers/actions.ts`（hasPermission/writeAudit）・`security/policy.ts assertCanViewConfidential`・`packages/shared/src/policy.ts:156 canAccessLabel`・`db.ts:40/62 writeDataAccess/confidential_view`・`DataAccessLog`(schema:339)・`customer-pain-access.ts` apps 未接続・safety exit 0。

## 23. Assumption Log

- 本書は Candidate・docs-only の read-only 監査であり、runtime 解禁・実装ではない。
- Customer 詳細は assertCanViewConfidential で閉じていると実測。一覧/Contact 単体は grep で確証不十分 → 安全側で HOLD。369-vault 未編集。

## 24. Unknowns Log

- Customer 一覧の行レベルで機密情報（PII）を出しているか。Contact 単体閲覧経路の統制。LocalBusinessLead/Contact の高機密ラベル一体化。assertCanViewConfidential の AIロール除外の明示。doc110 標準閲覧式の実接続時期。

## 25. Risk Register

- Customer 一覧で機密情報が統制なく一覧表示されるリスク → 一覧は LabelBadge のみで詳細は assert 経由・要追加確認として明記。
- 監査 green を「runtime 解禁OK」と誤読するリスク → HOLD・runtime 解禁しない・人間 Phase Gate 承認を明記。
- Contact 単体経路の統制漏れリスク → 未確認として明記・追加監査を残件に。
- 未push commit の揮発リスク → doc125 push-only（別承認）で解消。

## 26. Definition of Done

- [x] Customer/Contact/LocalBusinessLead 閲覧経路を read-only 監査（Customer 詳細は assertCanViewConfidential で閉・一覧/Contact は未確認）。
- [x] canAccessLabel/writeDataAccess/confidential_view/DataAccessLog/tenantId/RBAC/isHumanUser/doc110 の配線状況を記録。
- [x] 判定 B: HOLD・Phase 3 進入は人間 Phase Gate 承認事項・現在地10項目・50カテゴリ Matrix・Global AI Rules を記録。
- [x] 実装・schema変更・migration・RBAC変更・runtime 解禁・外部送信・実LLM・AIコスト・本番確認なし（docs-only）・safety exit 0・369-vault非編集。

## 27. 次回推奨プロンプト案

1. **doc125 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 20項目報告）。
2. **Customer 一覧・Contact 単体閲覧統制の追加 read-only 監査 docs-only**（一覧行レベルの機密表示の有無）。
3. **外部送信 Human Certification Gate 運用の現状監査 docs-only**（Phase 3 残件③・read-only）。

## 28. 判定

**判定: B — HOLD**。**Customer 詳細閲覧のラベル統制は `assertCanViewConfidential`（canAccessLabel＋DataAccessLog）で閉じている**（doc124 の未確認を前進）が、Customer 一覧の行レベル統制・Contact 単体経路が未確認・doc110 標準閲覧式が未接続のため **HOLD**。**Phase 3 進入は HOLD・人間 Phase Gate 承認**事項。**docs-only**・**Candidate**・**実装なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**canAccessLabel 実装なし**・**writeDataAccess 実装なし**・**runtime 解禁なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
