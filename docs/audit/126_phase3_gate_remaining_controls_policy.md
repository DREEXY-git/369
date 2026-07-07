# 126. Phase 3前残件の設計判断メモ — docs/roadmap/27 の記録（docs-only・369-vault非編集）

## 1. 非エンジニア向け要約

- 今回は、**Phase 3**（AI Growth Engine）へ進む前に残っている「設計の決めごと」を、コードを**一切変えず**に文章として正本化した回です。実装ではありません。
- 前回までの read-only 監査で分かった良い点: **Customer** 詳細画面は権限のない人に顧客機密が見えない仕組み（`assertCanViewConfidential`）が効いており、**営業メールの外部送信は「人間承認 → 配信停止リスト（**SuppressionList**）チェック → 送信フラグ（**EXTERNAL_SEND_ENABLED**）がONのときだけ送信」**という安全ゲートで守られています。既定では実際のネット送信はしません（**LogEmailProvider**）。AIは外部送信を単独で実行できません。
- まだ決めきれていない点: **Customer一覧** の行ごとの機密制御、**LocalBusinessLead** 詳細の連絡先（電話・メール・住所）の扱い、**Contact** / **LocalBusinessContact** 単体ページの扱い、営業送信を **opt-out**（配信停止方式）で正式運用してよいか、**positive Consent**（同意記録＝**ConsentRecord**）を必須にするか。
- これは記録であり、**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし。**369-vault非編集**。判定は **B: HOLD**（Phase 3 の判断材料は前進）。

## 2. 今回作成したdocs

- `docs/roadmap/27_phase3_gate_remaining_controls_policy_candidate.md`（28見出し・1から連番・§12 現在地10項目・§13 50カテゴリ Matrix・§18 Global AI Rules）— **Phase 3前残件** の設計判断メモ本体。
- `docs/audit/126_phase3_gate_remaining_controls_policy.md`（本書・14見出し）— 監査記録。

## 3. 現在地の実測結果

- 事業 **Phase 2** CONDITIONAL COMPLETE（doc123）／**Phase 3** 進入 **HOLD**。Complete Ledger **R4 Commercial Core** + **R0 Governance Docs**（R12 Trust 接続）。現在地は git refs を正とする。
- 実測（read-only）: **Customer一覧**（`customers/page.tsx`）は `LabelBadge` 表示のみで行レベル `assertCanViewConfidential` なし・生PII列なし／**Customer** 詳細は `assertCanViewConfidential`＋`canAccessLabel`＋`writeDataAccess`（`DataAccessLog` の `confidential_view`）配線済み／**LocalBusinessLead**（既定 **CUSTOMER_CONFIDENTIAL**）詳細は phone/email/address を requireUser+tenantId で表示・ラベル runtime gate 未接続／**Contact** は label 欄なし／外部送信は `decideApprovalAction` が **SuppressionList** を強制・`executeApprovedAction` で二重実行防止・**EXTERNAL_SEND_ENABLED** 既定OFF・**LogEmailProvider**／AIは `assertAiToolAllowed` で external_send 直接実行不可／AI参照は **NORMAL / INTERNAL** のみ・**FakeLLM** 決定論・**externalAiAllowed** 既定 false 固定。安全ゲート `scripts/check-company-brain-safety.mjs` exit 0。

## 4. 設計判断メモの要約

- **Customer一覧**: 生PIIを足さない不変条件を維持しつつ、行レベル `assertCanViewConfidential` の適用は高機密運用開始時に格上げ（据え置きを暫定既定）。
- **LocalBusinessLead** / **LocalBusinessContact**: テナント分離＋leadmap 権限＋外部送信ゲートで当面担保し、`DataAccessLog` 一体化は格上げ候補。
- **Contact**: 親 Customer のラベル従属を既定方針。
- outreach 送信: **opt-out**（**SuppressionList** 強制）を正式方針として記録可（人間承認）。**positive Consent**（**ConsentRecord**）は用途別分離を暫定既定。
- いずれも **人間 Phase Gate 承認** 事項。**runtime 解禁なし**。

## 5. Phase 3 移行条件への影響

- 送信安全ゲート（**Human Certification Gate**＋**Consent Gate**（Suppression 強制）＋**Security Gate**）が閉じていることを確認済みのため、Phase 3 HOLD解除の残件は「閲覧レイヤ行レベル統制の方針決定」「**opt-out** / **positive Consent** の正式化」「回帰ゲート green」「**人間 Phase Gate 承認**」に絞られた。**Phase 3** 進入は引き続き **HOLD**。

## 6. 今回やらなかったこと

- 実装・**schema変更なし**・**migrationなし**・**RBAC変更なし**・labels変更なし・company-brain-reference変更なし・leadmap/customers 変更なし・Contact 変更なし・Consent/Suppression 実装修正なし。
- **runtime 解禁なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・本番deploy なし・**369-vault非編集**・push なし（commit-only）。

## 7. Complete Function Coverage Matrix

- 直接対象: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接対象: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 8. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| 詳細は機密統制クローズ | `customers/[id]/page.tsx` `assertCanViewConfidential` / `canAccessLabel` / `writeDataAccess` / `confidential_view` | 閉 |
| 一覧は行レベルgateなし | `customers/page.tsx` `LabelBadge` のみ | 未接続 |
| lead詳細PII表示 | `LocalBusinessLead` 詳細 requireUser+tenantId | 未接続 |
| 送信時Suppression強制 | `decideApprovalAction` + **SuppressionList** + `executeApprovedAction` | 閉 |
| 実送信フラグ既定OFF | **EXTERNAL_SEND_ENABLED** / **LogEmailProvider** | 閉 |
| AI境界 | **FakeLLM** / **externalAiAllowed** 既定false | 閉 |
| 安全ゲート | `scripts/check-company-brain-safety.mjs` | exit 0 |

## 9. Assumption Log

- outreach は **opt-out**（**SuppressionList**）強制＝一般実務上許容。**positive Consent**（**ConsentRecord**）は用途別。
- 環境変数未設定＝実送信OFF（既定）。

## 10. Unknowns Log

- 閲覧レイヤ統制を入れる設計意図（据え置き設計か未実装か）。
- **positive Consent** 必須化の対象チャネル。
- 回帰ゲートの現時点 green/red。
- Appendix A 各節の正本内容（未展開）。

## 11. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | 一覧/lead で機密顧客・PIIが権限のみで閲覧可能 | 中 | HOLD・要設計判断 |
| R2 | **opt-out** 方針が未明文化 | 低 | 本メモで記録 |
| R3 | 回帰ゲート未実行のまま Phase 3 判断 | 低 | 実行は別途 |

## 12. Definition of Done

- **Phase 3前残件** の7論点を docs-only で整理／roadmap27＋doc126 作成／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**369-vault非編集**／**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**／**外部送信なし**・**実LLMなし**・**AIコストなし**／安全ゲート exit 0／commit-only（push なし）。

## 13. 次回推奨プロンプト案

> 「`/workspace/369` で doc126 の設計判断（閲覧レイヤ統制の据え置き/格上げ・**opt-out** 正式化・**positive Consent** 分離）の **人間 Phase Gate 承認** 可否を確認し、承認後に Phase 3 移行条件チェックリストを docs-only で整備。回帰ゲート green は別途。**schema変更なし**・push は別承認。」

## 14. 判定

判定: **B: HOLD**（Phase 3 Gate の判断材料は前進）。**高機密ラベル解禁なし**・**Phase 3** 実装なし・**runtime 解禁なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は **人間 Phase Gate 承認** 判断、または回帰ゲート green 確認。
