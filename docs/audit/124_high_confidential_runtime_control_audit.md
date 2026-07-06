# 124. 高機密ラベル runtime 統制の現状監査 — docs/roadmap/25 の記録（docs-only・369-vault非編集）

## 1. 非エンジニア向け要約

- 今回は、「**顧客の機密情報（CUSTOMER_CONFIDENTIAL）が、AI や権限のない人に漏れない仕組み（高機密ラベル runtime 統制）が実際にどこまで効いているか**」を、コードを**読むだけ**で点検した回です。
- 結論：**AI に会社の頭脳（Company Brain）経由で顧客機密が渡らない封印は、実コードで閉じている**（NORMAL/INTERNAL のみ＋二重ガード）ことを確認しました。ただし、**CRM の顧客画面（人間が見る側）でラベル統制が配線されているかは、今回の点検では確認できませんでした**。安全側で **HOLD** とし、Phase 3 へ進むのは引き続き人間の Phase Gate 承認事項です。
- これは監査（Candidate）の記録であり、実装ではありません。**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**。**369-vault は一切触っていません**。

## 2. 今回作成したdocs

- `docs/roadmap/25_high_confidential_runtime_control_audit_candidate.md`（28見出し・1から連番・§12-1〜12-10 現在地10項目・§13 50カテゴリ Matrix・§18 Global AI Rules）— **高機密ラベル runtime 統制**の現状監査本体。
- `docs/audit/124_high_confidential_runtime_control_audit.md`（本書・14見出し）— 監査記録。**roadmap25** と対。

## 3. 現在地の実測結果

- 事業 Phase 2 CONDITIONAL COMPLETE（doc123）／Phase 3 進入 **HOLD**。Complete Ledger **R4 Commercial Core + R0 Governance Docs**（本監査は R12 Trust/Compliance/Security 接続）。HEAD = origin/main = origin/current-feature = `b4aa49890e59d29711097aae55ef01f5239c2dae`（実測）。
- 実測: `canAccessLabel`(labels.ts:45)・`AI_READABLE_LABELS=['NORMAL','INTERNAL']`(company-brain-reference.ts:33)・`writeDataAccess`(db.ts:62)・`DataAccessLog`(schema:331・ABAC security/policy.ts)・`Customer.label` 既定 **CUSTOMER_CONFIDENTIAL**(schema:506)・`customer-pain-access.ts`（doc110 標準閲覧式）は apps 未接続・safety exit 0。

## 4. 監査結果の要約

- **AI参照経路（Company Brain）**: `CUSTOMER_CONFIDENTIAL` を DB where（NORMAL/INTERNAL のみ）＋`canAccessLabel` で**二重ガード**。外部LLM は `externalAiAllowed=true`＋`maskText`。→ **AI 注入封印は閉じている**。
- **writeDataAccess / DataAccessLog / ABAC**: 実装済み（`confidential_view`/`ai_reference`/`export`）。
- **未確認/ズレ**: CRM `Customer`/`Contact`/`LocalBusinessContact`/`LocalBusinessLead` の**人間 UI 閲覧経路で `tenantId` スコープ＋`canAccessLabel(CUSTOMER_CONFIDENTIAL)`＋`writeDataAccess(confidential_view)` が配線されているか未確認**。doc110 標準閲覧式は **apps 未接続**。高機密ラベル runtime 解禁は doc112 停止条件のまま未解禁。
- **3ゲート**: **Human Certification Gate**（外部作用は人間承認）・**Consent Gate**（送信/公開は同意確認）・**Security Gate**（tenantId/RBAC/writeAudit/writeDataAccess/Data Classification/PII非注入/高機密ラベル runtime 統制）を確認対象とした（詳細 roadmap25 §18）。

## 5. Phase 3 移行条件への影響

- 残件②「**高機密ラベル runtime 統制**の現状監査」を部分前進（AI参照封印は確認）させたが、**完全 green にはしていない**（人間閲覧側の統制配線が未確認）。**Phase 3 進入は引き続き HOLD・人間 Phase Gate 承認**事項。**外部送信 Human Certification Gate** 運用確認（残件③）・**Consent・SuppressionList** 運用確認（残件④）は別監査。

## 6. 今回やらなかったこと

- 高機密ラベル runtime 解禁・canAccessLabel/writeDataAccess の実装・RBAC/labels/schema/migration/company-brain-reference/leadmap 変更・Server Action/UI変更・externalAiAllowed true 解禁・実LLM・AIコスト・外部送信・本番確認・本番deploy・369-vault編集・doc123以前の削除・push。

## 7. Complete Function Coverage Matrix

- **直接対象**: C03 Permission/Approval/Audit、C06 Data Governance、C08 CRM/Customer360、C37 Trust Center、C38 Consent/Privacy、C39 Security/Zero Trust、C46 Governance Docs。
- **間接対象**: C01, C04, C05, C07, C09, C10, C11, C12, C15, C18, C20, C26, C28, C30, C33, C34, C40, C48。
- **後続**: C02, C13, C14, C16, C17, C19, C21, C22, C23, C24, C25, C27, C29, C31, C32, C35, C36, C41, C42, C43, C44, C47, C49, C50。
- **禁止 / Future隔離**: C45 Physical AI/IoT/Robotics。**不明**: なし。（全50行は roadmap25 §13）

## 8. Evidence Map

- Scout 実測（状態A・HEAD=`b4aa498`・clean・未push空・doc124/roadmap25 未存在・max audit=123）。
- 実コード実測は roadmap25 §5/§22 に行番号つきで記録。封印維持: safety exit 0（実測）・369-vault 非編集（実測）。

## 9. Assumption Log

- 本書は Candidate・docs-only の read-only 監査であり、runtime 解禁・実装ではない。
- AI参照封印は閉じていると実測。人間 UI 閲覧側は grep で確認できず → 安全側で HOLD。369-vault 未編集。

## 10. Unknowns Log

- CRM Customer/Contact 詳細画面での canAccessLabel/writeDataAccess の実配線。doc110 標準閲覧式の実接続時期。LocalBusinessLead/Contact PII の閲覧統制の実装状況。

## 11. Risk Register

- 人間 UI で顧客機密が統制なく閲覧されるリスク → 未確認として明記・追加監査を残件に。
- 監査 green を「runtime 解禁OK」と誤読するリスク → HOLD・人間 Phase Gate 承認を明記。
- AI に顧客機密が注入されるリスク → NORMAL/INTERNAL 限定＋canAccessLabel 二重ガードで閉じていると実測。
- 未push commit の揮発リスク → doc124 push-only（別承認）で解消。

## 12. Definition of Done

- [x] `docs/roadmap/25` と本書に、高機密ラベル runtime 統制の監査結果（AI参照封印は閉／人間閲覧側は未確認）・判定 B: HOLD・Phase 3 影響・50カテゴリ Matrix・Global AI Rules を記録。
- [x] CURRENT_STATE / PROGRESS にポインタ追記・docs/10_obsidian 入口に1行追記（GitHub docs側のみ）。
- [x] 実装・schema変更・migration・RBAC変更・runtime 解禁・外部送信・実LLM・AIコスト・本番確認なし（docs-only）・safety exit 0・369-vault非編集・見出し1から連番。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 13. 次回推奨プロンプト案

1. **doc124 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 20項目報告）。
2. **CRM Customer/Contact 閲覧統制の追加 read-only 監査 docs-only**（canAccessLabel/writeDataAccess 配線の実測）。
3. **外部送信 Human Certification Gate 運用の現状監査 docs-only**（残件③・read-only）。

## 14. 判定

**判定: B — HOLD**。AI参照経路の高機密ラベル封印は閉じているが、人間 UI 閲覧側の CUSTOMER_CONFIDENTIAL 統制配線が未確認・doc110 標準閲覧式が未接続のため **HOLD**。**Phase 3 進入は HOLD・人間 Phase Gate 承認**事項。**schema変更なし**・**migrationなし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
