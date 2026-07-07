# 127. Phase 3 Gate 人間判断チェックリスト — docs/roadmap/28 の記録（docs-only・369-vault非編集）

## 1. 非エンジニア向け要約

- 今回は、**Phase 3**（AI Growth Engine）へ進んでよいかを社長（人間）が決めるための「チェックリスト」を、コードを**一切変えず**に文章として整理した回です。実装ではありません。
- 分かっている良い点: **Customer** 詳細画面は権限のない人に顧客機密が見えない仕組みが効いており、**営業メールの外部送信は「人間承認 → 配信停止リスト（SuppressionList）チェック → 送信フラグ（EXTERNAL_SEND_ENABLED）がONのときだけ送信」**で守られ、既定では実送信しません（LogEmailProvider）。AIは外部送信を単独で実行できません。
- 社長に決めてほしい6点: ①**Customer一覧** の行ごとの機密制御を据え置くか格上げするか ②**LocalBusinessLead** / **LocalBusinessContact** の連絡先閲覧を現状維持か記録一体化か ③**Contact** 単体を親顧客のラベルに従わせるか ④営業送信を **opt-out**（配信停止方式）で正式運用してよいか ⑤同意記録（**ConsentRecord**）を用途別に分けてよいか ⑥回帰テスト（品質チェック）の合格を **Phase 3** 前の必須条件にするか。
- これは記録であり、**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし。**369-vault非編集**。判定は **B: HOLD**（判断材料は整備済み）。

## 2. 今回作成したdocs

- `docs/roadmap/28_phase3_gate_human_decision_checklist_candidate.md`（29見出し・1から連番・§13 現在地10項目・§14 50カテゴリ Matrix・§19 Global AI Rules）— **Phase 3 Gate 人間判断チェックリスト** 本体。
- `docs/audit/127_phase3_gate_human_decision_checklist.md`（本書・14見出し）— 監査記録。

## 3. 現在地の実測結果

- 事業 Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**。Complete Ledger **R4 Commercial Core** + **R0 Governance Docs**（R12 Trust 接続）。現在地は git refs を正とする。
- 確定事実（doc126）: **Customer一覧** は `LabelBadge` 表示のみで行レベル `assertCanViewConfidential` なし・生PII列なし／**Customer** 詳細は `assertCanViewConfidential`＋`canAccessLabel`＋`writeDataAccess`（`DataAccessLog` の `confidential_view`）配線済み／**LocalBusinessLead**（既定 **CUSTOMER_CONFIDENTIAL**）詳細は phone/email/address を requireUser+tenantId で表示／**Contact** は label 欄なし／外部送信は `decideApprovalAction` が **SuppressionList** を強制・`executeApprovedAction` で二重実行防止・**EXTERNAL_SEND_ENABLED** 既定OFF・**LogEmailProvider**／AIは `assertAiToolAllowed` で直接送信不可／AI参照は NORMAL/INTERNAL のみ・**FakeLLM** 決定論・**externalAiAllowed** 既定 false 固定。安全ゲート exit 0。

## 4. チェックリストの要約

- **Customer一覧**: 据え置き（生PII列を足さない不変条件）を暫定既定・高機密運用開始時に格上げ。
- **LocalBusinessLead** / **LocalBusinessContact**: 当面現状維持（テナント分離＋leadmap 権限＋外部送信ゲート）・後日 **DataAccessLog** 一体化。
- **Contact**: 親 **Customer** ラベル従属を既定方針。
- outreach: **opt-out**（**SuppressionList** 強制）を正式方針として承認可。**positive Consent**（**ConsentRecord**）は用途別分離を既定。
- 回帰ゲート green を **Phase 3** 前必須条件に格上げ推奨。
- いずれも **人間 Phase Gate 承認** 事項。**runtime 解禁なし**。

## 5. Phase 3 移行条件への影響

- 送信安全ゲート（**Human Certification Gate**＋**Consent Gate**＝Suppression 強制＋**Security Gate**）が閉じている確証により、Phase 3 HOLD解除の残件は「閲覧レイヤ統制の方針決定」「**opt-out**/**positive Consent** 承認」「回帰ゲート green」「**人間 Phase Gate 承認**」に集約。**Phase 3** 進入は引き続き **HOLD**。

## 6. 今回やらなかったこと

- 実装・**schema変更なし**・**migrationなし**・**RBAC変更なし**・labels変更なし・company-brain-reference変更なし・leadmap/customers/approvals 変更なし・Contact 変更なし・Consent/Suppression 実装修正なし。
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
| lead詳細PII表示 | **LocalBusinessLead** 詳細 requireUser+tenantId | 未接続 |
| 送信時Suppression強制 | `decideApprovalAction` + **SuppressionList** + `executeApprovedAction` | 閉 |
| 実送信フラグ既定OFF | **EXTERNAL_SEND_ENABLED** / **LogEmailProvider** | 閉 |
| AI境界 | **FakeLLM** / **externalAiAllowed** 既定false | 閉 |
| 安全ゲート | `scripts/check-company-brain-safety.mjs` | exit 0 |

## 9. Assumption Log

- outreach は **opt-out**（**SuppressionList**）強制＝一般実務上許容。**positive Consent**（**ConsentRecord**）は用途別。
- 環境変数未設定＝実送信OFF（既定）。③⑤は前回監査で閉と確認済み。

## 10. Unknowns Log

- 閲覧レイヤ統制を入れる設計意図（据え置き設計か未実装か）。
- **positive Consent** 必須化の対象チャネル。
- 回帰ゲートの現時点 green/red。
- Appendix A 各節の正本内容。

## 11. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | 一覧/lead で機密顧客・PIIが権限のみで閲覧可能 | 中 | HOLD・要方針決定 |
| R2 | 回帰ゲート未実測のまま Phase 3 判断 | 中 | 実測を Gate 化推奨 |
| R3 | 格上げ選択時に **schema変更**/**RBAC変更** が発生 | 中 | 事前停止条件で別承認化 |

## 12. Definition of Done

- **Phase 3 Gate** の8論点を **人間判断チェックリスト** として docs-only で整理／roadmap28＋doc127 作成／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**369-vault非編集**／**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**／**外部送信なし**・**実LLMなし**・**AIコストなし**／安全ゲート exit 0／commit-only（push なし）。

## 13. 次回推奨プロンプト案

> 「人間が §5〜§10 を決定した内容を §0 形式で受領し、doc128（Phase 3 移行 GO/HOLD 確定）として docs-only で記録。格上げ選択があれば **schema変更**/**RBAC変更** の要否を事前停止条件として明記。回帰ゲート green 実測は別途。実装・push は別承認。」

## 14. 判定

判定: **B: HOLD継続**（Phase 3 Gate の判断材料は整備済み）。**高機密ラベル解禁なし**・**Phase 3** 実装なし・**runtime 解禁なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は **人間 Phase Gate 承認** 判断、または回帰ゲート green 確認。
