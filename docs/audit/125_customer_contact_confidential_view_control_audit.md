# 125. CRM Customer / Contact 閲覧統制の追加監査 — docs/roadmap/26 の記録（docs-only・369-vault非編集）

## 1. 非エンジニア向け要約

- 今回は、doc124 で「未確認」として残っていた「**CRM Customer（顧客）や Contact（連絡先）を人間が画面で見るとき、権限のない人に顧客機密が見えない仕組み（高機密ラベル runtime 統制）が効いているか**」を、コードを**読むだけ**で追加点検した回です。
- **良い発見**: 顧客の**詳細画面**は `assertCanViewConfidential`（権限＋機密ラベル判定＋閲覧ログ）を実際に通しており、**詳細閲覧のラベル統制は閉じている**ことを確認しました（doc124 の見落としを訂正）。ただし、**顧客一覧の行レベル統制**と **Contact 単体の閲覧経路**は確認しきれず、安全側で **HOLD** のままとします。Phase 3 進入は引き続き人間の Phase Gate 承認事項です。
- これは監査（Candidate）の記録であり、実装ではありません。**schema変更なし**・**migrationなし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**。**369-vault は一切触っていません**。

## 2. 今回作成したdocs

- `docs/roadmap/26_customer_contact_confidential_view_control_audit_candidate.md`（28見出し・1から連番・§12-1〜12-10 現在地10項目・§13 50カテゴリ Matrix・§18 Global AI Rules）— **CRM Customer** / **Contact** 閲覧統制の追加監査本体。
- `docs/audit/125_customer_contact_confidential_view_control_audit.md`（本書・14見出し）— 監査記録。

## 3. 現在地の実測結果

- 事業 Phase 2 CONDITIONAL COMPLETE（doc123）／Phase 3 進入 **HOLD**。Complete Ledger **R4 Commercial Core + R0 Governance Docs**（本監査は R12 Trust/Compliance/Security 接続）。HEAD = origin/main = origin/current-feature = `4382f74536845854c263219cf9bcd799b563e116`（実測）。
- 実測: `customers/[id]/page.tsx:30 assertCanViewConfidential`・`security/policy.ts`・`packages/shared/src/policy.ts:156 canAccessLabel`・`db.ts:40/62 writeDataAccess`/`confidential_view`・`DataAccessLog`(schema:339)・`Customer.label` 既定 CUSTOMER_CONFIDENTIAL・`customer-pain-access.ts`(doc110 `canViewCustomerPainDetail`)は apps 未接続・safety exit 0。

## 4. 監査結果の要約

- **Customer 詳細**: `requireUser`＋tenantId＋`assertCanViewConfidential(user,{label: customer.label})` で **canAccessLabel（ラベル統制）＋DataAccessLog（confidential_view 相当）が配線済み**（meetings/finance/invoices も同型）。→ **詳細閲覧の高機密ラベル runtime 統制は閉じている**。
- **Customer 一覧**: `requireUser`＋tenantId スコープはあるが**行ごとの assertCanViewConfidential は無い**（LabelBadge 表示のみ）→ 要確認。
- **Contact / LocalBusinessContact / LocalBusinessLead**: Contact 単体閲覧経路の統制は未確認。LocalBusinessLead は `/leadmap`（`leadmap` 権限系・別体系）。
- **doc110 標準閲覧式**（`customer-pain-access.ts`・`canViewCustomerPainDetail`・`isHumanUser`）は **apps 未接続**（Customer Pain 本実装未着手＝仕様どおり）。

## 5. Phase 3 移行条件への影響

- 残件②「高機密ラベル runtime 統制の現状監査」を**さらに前進**（Customer 詳細のラベル統制は閉じていると確認）させたが、Customer 一覧の行レベル統制・Contact 単体経路が未確認のため **完全 green にはしていない**。**Phase 3 進入は引き続き HOLD・人間 Phase Gate 承認**事項。**外部送信 Human Certification Gate**（残件③）・**Consent Gate**（残件④）は別監査。
- 3ゲートの扱い: **Security Gate**（tenantId/RBAC/writeAudit/writeDataAccess/Data Classification/PII非注入/高機密ラベル runtime 統制）は Customer 詳細で assertCanViewConfidential 経由に維持・**Human Certification Gate**（危険操作は人間承認）・**Consent Gate**（送信/公開は同意確認）はいずれも今回発動なし（詳細 roadmap26 §18）。

## 6. 今回やらなかったこと

- 実装・修正・schema変更・migration・RBAC/labels/customer-pain-access/company-brain-reference/leadmap/customers/Server Action/UI 変更・canAccessLabel/writeDataAccess 実装・runtime 解禁・externalAiAllowed true 解禁・実LLM・AIコスト・外部送信・本番確認・本番deploy・369-vault編集・push。

## 7. Complete Function Coverage Matrix

- **直接対象**: C03 Permission/Approval/Audit、C06 Data Governance、C08 CRM/Customer360、C37 Trust Center、C38 Consent/Privacy、C39 Security/Zero Trust、C46 Governance Docs。
- **間接対象**: C01, C04, C05, C07, C09, C10, C11, C12, C15, C18, C20, C26, C28, C30, C33, C34, C40, C48。
- **後続**: C02, C13, C14, C16, C17, C19, C21, C22, C23, C24, C25, C27, C29, C31, C32, C35, C36, C41, C42, C43, C44, C47, C49, C50。
- **禁止 / Future隔離**: C45 Physical AI/IoT/Robotics。**不明**: なし。（全50行は roadmap26 §13）

## 8. Evidence Map

- Scout 実測（状態A・HEAD=`4382f74`・clean・未push空・doc125/roadmap26 未存在・max audit=124）。
- 実コード実測は roadmap26 §5〜§11/§22 に行番号つきで記録。封印維持: safety exit 0（実測）・369-vault 非編集（実測）。

## 9. Assumption Log

- 本書は Candidate・docs-only の read-only 監査であり、runtime 解禁・実装ではない。
- Customer 詳細は assertCanViewConfidential で閉じていると実測。一覧/Contact 単体は grep で確証不十分 → 安全側で HOLD。369-vault 未編集。

## 10. Unknowns Log

- Customer 一覧の行レベルで機密情報（PII）を出しているか。Contact 単体閲覧経路の統制。LocalBusinessLead/Contact の高機密ラベル一体化。assertCanViewConfidential の AIロール除外（isHumanUser）の明示。doc110 標準閲覧式の実接続時期。

## 11. Risk Register

- Customer 一覧で機密情報が統制なく一覧表示されるリスク → 一覧は LabelBadge のみ・詳細は assert 経由・要追加確認と明記。
- 監査 green を「runtime 解禁OK」と誤読するリスク → HOLD・人間 Phase Gate 承認を明記。
- Contact 単体経路の統制漏れリスク → 未確認として明記・追加監査を残件に。
- 未push commit の揮発リスク → doc125 push-only（別承認）で解消。

## 12. Definition of Done

- [x] `docs/roadmap/26` と本書に、Customer/Contact 閲覧統制の監査結果（Customer 詳細は assertCanViewConfidential で閉・一覧/Contact 未確認・doc110 未接続）・判定 B: HOLD・Phase 3 影響・50カテゴリ Matrix・Global AI Rules を記録。
- [x] CURRENT_STATE / PROGRESS にポインタ追記・docs/10_obsidian 入口に1行追記（GitHub docs側のみ）。
- [x] 実装・schema変更・migration・RBAC変更・runtime 解禁・外部送信・実LLM・AIコスト・本番確認なし（docs-only）・safety exit 0・369-vault非編集・見出し1から連番。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 13. 次回推奨プロンプト案

1. **doc125 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 20項目報告）。
2. **Customer 一覧・Contact 単体閲覧統制の追加 read-only 監査 docs-only**（一覧行レベルの機密表示の有無）。
3. **外部送信 Human Certification Gate 運用の現状監査 docs-only**（Phase 3 残件③・read-only）。

## 14. 判定

**判定: B — HOLD**。Customer 詳細閲覧のラベル統制（`assertCanViewConfidential`＝canAccessLabel＋DataAccessLog）は閉じている（doc124 の未確認を前進）が、Customer 一覧の行レベル統制・Contact 単体経路が未確認・doc110 標準閲覧式（`canViewCustomerPainDetail`・`customer-pain-access`）が未接続のため **HOLD**。**Phase 3 進入は HOLD・人間 Phase Gate 承認**事項。**schema変更なし**・**migrationなし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
