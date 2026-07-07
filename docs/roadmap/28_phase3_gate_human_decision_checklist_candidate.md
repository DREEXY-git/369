# 28. Phase 3 Gate 人間判断チェックリスト Candidate（docs-only）

> 出典＝GitHub 正本 docs。これは **docs-only の人間判断チェックリスト**であり、実装・runtime 解禁・Phase 3 実装ではありません。判定は **B: HOLD**（判断材料は整備済み）。**369-vault非編集**・コード差分ゼロ。

## 1. 目的

doc126 / roadmap27 が main 反映済みであることを前提に、**Phase 3** AI Growth Engine へ進んでよいかを人間が決めるための **Phase 3 Gate 人間判断チェックリスト** を docs-only で整理する。決定するのは人間であり、本書は選択肢・推奨・GO/HOLD条件を提示するのみ。

## 2. 現在地の正

- GitHub 正本モノレポ `dreexy-git/369`。現在地は git refs を正とする（`git rev-parse HEAD` / `origin/main` / `git log origin/main..HEAD`）。
- 事業ロードマップ Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**。Complete Ledger **R4 Commercial Core** + **R0 Governance Docs**（R12 Trust / Compliance / Security 接続）。

## 3. doc126から引き継ぐ確定事項

- **Customer** 詳細は `assertCanViewConfidential`（`canAccessLabel`＋`writeDataAccess`／`DataAccessLog` の `confidential_view`）で閉。
- **Customer一覧** は `LabelBadge` 表示のみで行レベル gate なし・生PII列なし。
- **LocalBusinessLead**（既定 **CUSTOMER_CONFIDENTIAL**）詳細は phone/email/address を requireUser+tenantId で表示・ラベル runtime gate 未接続。**Contact** は label 欄なし・単体経路未確認。
- 外部送信は `decideApprovalAction` が **SuppressionList** を強制（`isSuppressed` 該当は送信せず・EXCLUDED・usage未計上）・二重実行防止 `executeApprovedAction`・実送信は **EXTERNAL_SEND_ENABLED**==='true' のみ・既定 **LogEmailProvider**・AIは `assertAiToolAllowed` で直接送信不可。
- AI参照は NORMAL/INTERNAL のみ・**FakeLLM** 決定論・**externalAiAllowed** 既定 false 固定。安全ゲート exit 0。

## 4. Phase 3 Gate の残件

| # | 残件 | 現状 | 種別 |
|---|---|---|---|
| ① | Phase 2 完了の正式記録 | CONDITIONAL COMPLETE | 人間 Phase Gate 承認 |
| ② | 高機密ラベル runtime 統制 | 詳細=閉／一覧・lead・Contact=未接続/未確認 | 設計判断＋（必要なら実装） |
| ③ | 外部送信 Human Certification Gate | 閉（確認済み） | 維持確認 |
| ④ | Consent / SuppressionList 運用 | Suppression 強制／positive Consent 用途別 | 方針承認 |
| ⑤ | AI境界再確認 | 閉（NORMAL/INTERNAL・FakeLLM・externalAiAllowed固定） | 維持確認 |
| ⑥ | 回帰ゲート green | 未実測（script 存在） | 実測（別承認） |

## 5. Customer一覧の判断

- 論点: **Customer一覧** の行レベル機密統制を据え置くか、格上げ（行ごとに `assertCanViewConfidential`）するか。
- 選択肢A（据え置き）: 一覧は「存在＋非機密メタのみ」を許容し生PII列を足さない不変条件を明文化。機密本体は詳細 gate に委譲。
- 選択肢B（格上げ）: 一覧行にも `canAccessLabel` 判定を適用し権限のない行を伏せる（実装＝コード変更を伴い別承認）。
- 推奨: **A（据え置き）を暫定既定**とし、高機密運用開始時に B へ格上げ。決定は **人間 Phase Gate 承認**。**runtime 解禁なし**。

## 6. LocalBusinessLead / LocalBusinessContact の判断

- 論点: **LocalBusinessLead** / **LocalBusinessContact** のPII閲覧を現状維持（テナント分離＋leadmap 権限＋外部送信ゲート）するか、**DataAccessLog** 一体化（`writeDataAccess` の `confidential_view` を閲覧経路に配線）するか。
- 推奨: **当面現状維持**、高機密運用開始時に **DataAccessLog** 一体化へ格上げ。**RBAC変更なし**。決定は **人間 Phase Gate 承認**。

## 7. Contact単体閲覧経路の判断

- 論点: **Contact** 単体閲覧経路を親 **Customer** のラベル従属にするか。
- 推奨: **親 Customer ラベル従属を既定方針**。単体ページ新設時は詳細と同じ `assertCanViewConfidential` を必須化。**schema変更なし**（本書では持たせない）。

## 8. outreach opt-out 方針の判断

- 論点: outreach の **opt-out**（**SuppressionList** 強制）方針を正式承認するか。
- 事実: 送信ゲート `decideApprovalAction` が承認時に **SuppressionList** を照会し該当を送信ブロック・**EXTERNAL_SEND_ENABLED** 既定OFF・**LogEmailProvider**・`executeApprovedAction` 二重実行防止・**Human Certification Gate** で人間承認必須。
- 推奨: **正式承認**（B2Bコールド営業の標準）。**外部送信なし**（本書では送信しない）。

## 9. positive Consent / ConsentRecord の判断

- 論点: **positive Consent**（**ConsentRecord**）を用途別分離（outreach=opt-out継続／顧客事例公開・位置情報等=用途別 consent）でよいか、特定チャネルで必須化するか。
- 推奨: **用途別分離を既定**とし、規制の厳しいチャネル（SMS 等）は段階的に positive Consent 必須へ格上げ。決定は **人間 Phase Gate 承認**。

## 10. 回帰ゲート green の判断

- 論点: 回帰ゲート（test / lint / typecheck / build / e2e）の green を **Phase 3** 前の必須条件にするか。
- 推奨: **必須条件化**。green 実測を Gate⑥として確定してから Phase 3 進入。**実LLMなし**・**AIコストなし** の維持も同時確認。

## 11. GO条件

- ①Phase 2 完了の正式記録 ＋ ②閲覧レイヤ統制の方針決定（据え置き/格上げの明文化）＋ ③⑤維持確認 ＋ ④**opt-out**・**positive Consent** 方針承認 ＋ ⑥回帰ゲート green ＋ **人間 Phase Gate 承認**。これら全充足で **Phase 3** 進入 GO。

## 12. HOLD条件

- ②の方針未決定／⑥未実測／人間承認未取得のいずれかが残る限り **HOLD** 継続。格上げ(§5B/§6一体化)を選ぶ場合は「実装＝**schema変更**/**RBAC変更** の要否」を事前停止条件として別承認に切り出す。

## 13. ロードマップ上の現在地（10項目・明示見出し）

### 13-1. 現在のPhase
事業 Phase 2 CONDITIONAL COMPLETE／PDF 2.5／戦略 18.5-26 未突入／Ledger **R4 Commercial Core** + **R0 Governance Docs**（R12 Trust 接続）。

### 13-2. 現在のPhaseで完了したこと
Customer 詳細機密統制（`assertCanViewConfidential`）・外部送信 **Human Certification Gate**（**SuppressionList** 強制・**EXTERNAL_SEND_ENABLED** 既定OFF・**LogEmailProvider**・`executeApprovedAction`・`decideApprovalAction`）・AI境界（**FakeLLM**・**externalAiAllowed** 固定）の確認、doc126/roadmap27 の設計判断正本化。

### 13-3. 現在のPhaseで未完了のこと
**Customer一覧** 行レベル統制、**LocalBusinessLead**/**LocalBusinessContact** の **DataAccessLog** 一体化、**Contact** 単体経路、**opt-out**/**positive Consent** の正式承認、回帰ゲート green 実測。

### 13-4. 次に進むPhase
事業 **Phase 3** AI Growth Engine。

### 13-5. 次のPhaseへ進むために必ず完了すべきこと
Gate①〜⑥の決定/実測＋**人間 Phase Gate 承認**。

### 13-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）
**HOLD**（判断材料は整備済み）。

### 13-7. GO / HOLD の理由
STOP級危険（同意なし外部送信・AI単独外部送信・生PIIの無統制表示・実LLM/AIコスト・本番影響）は検出されず送信安全ゲートは閉。閲覧レイヤ統制の方針未決定と回帰ゲート未実測が残るため **HOLD**。

### 13-8. 人間承認が必要な判断
§5〜§10 の6論点と **Phase 3** Phase Gate 承認。

### 13-9. 次Phaseに進む前にやってはいけないこと
**Phase 3** 実装／**runtime 解禁なし**／**externalAiAllowed** true 解禁／**EXTERNAL_SEND_ENABLED** true 解禁／**外部送信なし**／実LLM／AIコスト／本番確認／本番deploy／**schema変更なし**／**migrationなし**／**RBAC変更なし**／**369-vault非編集**。

### 13-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか
`tasks/CURRENT_STATE.md`（bullet 1件）・`tasks/PROGRESS.md`（節1件）・`docs/roadmap/28`（本書）・`docs/audit/127`（記録）・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（行1件）に反映。**369-vault非編集**。

## 14. Complete Function Coverage Matrix（50カテゴリ）

| # | 区分 | # | 区分 | # | 区分 | # | 区分 | # | 区分 |
|---|---|---|---|---|---|---|---|---|---|
| **C03** | 直接 | **C06** | 直接 | **C08** | 直接 | **C37** | 直接 | **C38** | 直接 |
| **C39** | 直接 | **C46** | 直接 | C01 | 間接 | C04 | 間接 | C05 | 間接 |
| C07 | 間接 | C09 | 間接 | C10 | 間接 | C11 | 間接 | C12 | 間接 |
| C15 | 間接 | C18 | 間接 | C20 | 間接 | C26 | 間接 | C28 | 間接 |
| C30 | 間接 | C33 | 間接 | C34 | 間接 | C40 | 間接 | C48 | 間接 |
| C02 | 後続 | C13 | 後続 | C14 | 後続 | C16 | 後続 | C17 | 後続 |
| C19 | 後続 | C21 | 後続 | C22 | 後続 | C23 | 後続 | C24 | 後続 |
| C25 | 後続 | C27 | 後続 | C29 | 後続 | C31 | 後続 | C32 | 後続 |
| C35 | 後続 | C36 | 後続 | C41 | 後続 | C42 | 後続 | C43 | 後続 |
| C44 | 後続 | C47 | 後続 | C49 | 後続 | C50 | 後続 | C45 | 禁止/Future隔離 |

直接対象＝**C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。

## 15. 20大カテゴリとの接続

Trust/Compliance・Consent/Privacy・Security/Zero Trust・CRM/Customer 360・Data Governance・Permission/Approval/Audit・Governance Docs に接続。閲覧統制と外部送信ゲートは Trust/Security の中核。

## 16. 追加19領域との接続

外部送信 **Human Certification Gate**・**Consent Gate**・**Security Gate**・監査ログ（**DataAccessLog** / **confidential_view**）・Suppression 運用・AI境界（**FakeLLM**）に接続。

## 17. 369独自差別化5本柱との接続

「安全第一」「AIは下書き・提案・参照まで」「人間承認ゲート」「同意・抑止を尊重した外部送信」「正本は GitHub docs」に接続。

## 18. 初期MVPで作らないもの

**Phase 3** 実装本体・高機密ラベル runtime 解禁・**externalAiAllowed** true UI・**EXTERNAL_SEND_ENABLED** true 常時運用・実LLM 接続・公開系（PR/SEO/SNS/口コミ）・Marketplace（C45 Future隔離）。

## 19. Global AI Rules

AIは下書き・提案・要約・分析・参照まで。危険操作は **Human Certification Gate**。**外部送信なし**・**実LLMなし**・**AIコストなし**・高機密ラベル **runtime 解禁なし**・同意なし外部送信なし・虚偽口コミ/ステマ/なりすましレビュー禁止。AI 参照は NORMAL/INTERNAL のみ・**CUSTOMER_CONFIDENTIAL** 非注入。

## 20. 判定案

判定: **B: HOLD継続**（Phase 3 Gate の判断材料は整備済み）。人間が §5〜§10 を決定し、回帰ゲート green を実測すれば GO 条件が揃う。

## 21. Phase 3 HOLD解除への影響

送信安全ゲート（**SuppressionList** 強制・**decideApprovalAction**・**executeApprovedAction**・**LogEmailProvider**・AI直接送信不可）が閉じている確証により、HOLD解除の残件は「閲覧レイヤ統制の方針決定」「**opt-out**/**positive Consent** 承認」「回帰ゲート green」「**人間 Phase Gate 承認**」に集約。

## 22. 次に必要な補強

- 人間による §5〜§10 の決定（§0 形式での受領を推奨）。
- 回帰ゲート（test/lint/typecheck/build/e2e）の green 実測。
- 格上げ選択時の **schema変更**/**RBAC変更** 要否の事前停止条件化。

## 23. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| 詳細は機密統制クローズ | `customers/[id]/page.tsx` `assertCanViewConfidential` | 閉 |
| 一覧は行レベルgateなし | `customers/page.tsx` `LabelBadge` のみ | 未接続 |
| 送信時Suppression強制 | `decideApprovalAction` + **SuppressionList** | 閉 |
| 実送信フラグ既定OFF | **EXTERNAL_SEND_ENABLED** / **LogEmailProvider** | 閉 |
| AI境界 | **FakeLLM** / **externalAiAllowed** 既定false | 閉 |
| 安全ゲート | `scripts/check-company-brain-safety.mjs` | exit 0 |

## 24. Assumption Log

- ③⑤は前回 read-only 監査で閉と確認済み。本書は再実装確認ではなく判断整理。
- 回帰ゲート script は存在するが未実走（環境依存・別承認）。

## 25. Unknowns Log

- 閲覧レイヤ統制を入れる設計意図（据え置き設計か未実装か）。
- **positive Consent** 必須化の対象チャネル。
- 回帰ゲートの現時点 green/red。
- Appendix A 各節の正本内容。

## 26. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | 一覧/lead で機密顧客・PIIが権限のみで閲覧可能 | 中 | HOLD・要方針決定 |
| R2 | 回帰ゲート未実測のまま Phase 3 判断 | 中 | 実測を Gate 化推奨 |
| R3 | 格上げ選択時に **schema変更**/**RBAC変更** が発生 | 中 | 事前停止条件で別承認化 |

## 27. Definition of Done

- 8論点を docs-only で整理／判定 **B: HOLD**／**369-vault非編集**／**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**／**外部送信なし**・**実LLMなし**・**AIコストなし**／commit-only（push なし）。

## 28. 次回推奨プロンプト案

> 「人間が §5〜§10 を決定した内容を §0 形式で受領し、doc128（Phase 3 移行 GO/HOLD 確定）として docs-only で記録する。格上げ選択があれば **schema変更**/**RBAC変更** の要否を事前停止条件として明記。回帰ゲート green 実測は別途。実装・push は別承認。」

## 29. 判定

判定: **B: HOLD継続**。**高機密ラベル解禁なし**・**Phase 3** 実装なし・**runtime 解禁なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は **人間 Phase Gate 承認** 判断、または回帰ゲート green 確認。
