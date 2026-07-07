# 27. Phase 3前残件の設計判断メモ Candidate（docs-only）

> 出典＝GitHub 正本 docs。これは **docs-only の設計判断メモ**であり、実装・runtime 解禁・Phase 3 実装ではありません。判定は **B: HOLD**（Phase 3 Gate の判断材料は前進）。**369-vault非編集**・コード差分ゼロ。

## 1. 目的

Phase 3 AI Growth Engine へ進む前に残っている「設計判断」を、実装せず docs-only で正本化する。対象論点は次の7つ。

1. **Customer一覧** に行レベル機密統制を入れるべきか。
2. **LocalBusinessLead** 詳細の phone / email / address 表示をどう扱うべきか。
3. **Contact** / **LocalBusinessContact** 単体閲覧経路をどう扱うべきか。
4. outreach の送信方針を **opt-out** / **SuppressionList** 強制として正式記録してよいか。
5. **positive Consent**（**ConsentRecord**）を外部送信の必須条件にするか、用途別に分けるか。
6. **Phase 3** HOLD解除に必要な残件を明確にする。
7. Phase 3 へ進む前にやってはいけないことを明記する。

## 2. 現在地の正

- GitHub 正本モノレポ `dreexy-git/369`。現在地は git refs を正とする（`git rev-parse HEAD` / `origin/main` / `git log origin/main..HEAD`）。
- 事業ロードマップ **Phase 2 CONDITIONAL COMPLETE**／**Phase 3** 進入 **HOLD**。Complete Ledger **R4 Commercial Core** + **R0 Governance Docs**（本メモは R12 Trust / Compliance / Security 接続）。
- 本メモは doc125 / `docs/roadmap/26`（CRM Customer / Contact 閲覧統制の追加監査・判定 B: HOLD）と、その後の外部送信・Consent・AI境界の read-only 追加監査結果を受けた設計判断の整理。

## 3. doc125までに確認済みのこと

- **Customer 詳細**（`customers/[id]/page.tsx`）は `assertCanViewConfidential(user,{label: customer.label})`（ABAC・`security/policy.ts`）を実行し、`canAccessLabel`（ラベル統制）＋`DataAccessLog`（`confidential_view`）＋`writeDataAccess` が配線済み＝**詳細閲覧の高機密ラベル runtime 統制は閉じている**。
- **Customer一覧**（`customers/page.tsx`）は `tenantId` スコープ＋`LabelBadge` 表示のみで、行ごとの `assertCanViewConfidential` は無い（email / phone / address の生PII列は一覧に非表示）。
- **LocalBusinessLead** は既定 **CUSTOMER_CONFIDENTIAL**（schema）。lead 詳細は phone / email / address を `requireUser` + `tenantId`（+ leadmap 権限）で表示し、ラベルの runtime gate は未接続。
- **Contact** モデルは label 欄なし。**Contact** / **LocalBusinessContact** 単体閲覧経路の機密統制は未確認。

## 4. 今回整理する未完了論点

- 閲覧レイヤ（一覧 / lead 詳細 / Contact 単体）の行レベル機密統制を「入れる／据え置く」の設計方針。
- outreach の **opt-out** 方針の正式化と、**positive Consent** を送信必須条件とするか否か。
- Phase 3 HOLD解除に必要な残件と、進入前の禁止事項の明文化。

## 5. Customer一覧の行レベル機密統制方針

- 現状: **Customer一覧** は `tenantId` スコープ＋`LabelBadge` 表示のみ。生PII列（email / phone / address）は出していないが、**CUSTOMER_CONFIDENTIAL** 顧客の「存在＋業績指標（ランク/満足度/離反リスク/案件数）」は権限のみで閲覧可能。
- 設計判断案（人間承認事項）: (a) 一覧にも行レベル `assertCanViewConfidential` を適用し、権限のない行を伏せる／(b) 一覧は「存在＋非機密メタのみ」を許容し、機密本体は詳細 gate に委ねる据え置き。
- 推奨（暫定）: **(b) 据え置きを既定**とし、一覧に生PIIを足さない不変条件を明文化。ただし高機密運用開始時は (a) を Phase 3 Gate 条件に格上げ。いずれも本メモでは決定せず **人間 Phase Gate 承認** に委ねる。**runtime 解禁なし**。

## 6. LocalBusinessLead / LocalBusinessContact のPII閲覧方針

- 現状: **LocalBusinessLead**（既定 **CUSTOMER_CONFIDENTIAL**）の phone / email / address は `requireUser` + `tenantId`（+ leadmap 権限）で保護。ラベルの runtime gate（`canAccessLabel` / `writeDataAccess` の `confidential_view`）は未接続。
- 設計判断案: leadmap は「営業開拓の公開系ビジネス情報」中心で PII は連絡先に限定される別体系。Customer と同じ `assertCanViewConfidential` 一体化を Phase 3 前に必須とするか、leadmap 権限系のまま据え置くかを決める。
- 推奨（暫定）: **テナント分離＋leadmap 権限＋外部送信ゲートで当面担保**し、`DataAccessLog` 一体化は高機密運用開始時に格上げ。決定は **人間 Phase Gate 承認**。**RBAC変更なし**。

## 7. Contact単体閲覧経路の方針

- 現状: **Contact** モデルは label 欄なし。単体閲覧経路の機密統制は未確認。
- 設計判断案: Contact に機密ラベルを持たせるか、親 Customer の `assertCanViewConfidential` に従属させるか。
- 推奨（暫定）: **親 Customer のラベル従属**を既定方針とし、Contact 単体ページを新設する場合は詳細と同じ gate を必須化。本メモでは **schema変更なし**・決定は **人間 Phase Gate 承認**。

## 8. outreach opt-out / Suppression 強制方針

- 現状（確認済み）: outreach 送信は承認ゲート `decideApprovalAction` 経由でのみ実行。承認時に **SuppressionList** を照会し、`isSuppressed` 該当なら `suppressed` として **送信せず**ログのみ・lead stage を EXCLUDED・usage 未計上。outreach UI も suppressed 時は承認ボタン `disabled`（多重防御）。実送信は **EXTERNAL_SEND_ENABLED** === 'true' の場合のみで、既定は **LogEmailProvider**（ネットワーク送信なし）。危険操作の二重実行防止・原子的クレームは `executeApprovedAction`。
- 設計判断案: この **opt-out**（**SuppressionList** 強制）を outreach の正式送信方針として記録してよいか。
- 推奨: **記録してよい**。B2B コールド営業の標準として opt-out（配信停止の即時反映＋人間承認＋PII マスク＋送信フラグ既定OFF）を正式方針とする。**外部送信なし**（本メモでは送信しない）。

## 9. positive ConsentRecord を必須条件にするかの判断

- 現状: **ConsentRecord**（メール営業チャネル同意）と purpose 別 consent（`getConsentStatus`）は存在。outreach 送信ゲートは **SuppressionList**（opt-out）を強制するが、**positive Consent** の granted を送信必須条件にはしていない。
- 設計判断案: (a) outreach は opt-out 継続・**positive Consent** は用途別（顧客事例公開・位置情報等）に限定／(b) 特定チャネル（SMS 等）では positive Consent 必須へ格上げ。
- 推奨（暫定）: **(a) 用途別分離を既定**とし、規制の厳しいチャネルは (b) を Phase 別に格上げ。決定は **人間 Phase Gate 承認**。

## 10. 外部送信 Human Certification Gate の扱い

- **Human Certification Gate**: draft → PENDING_APPROVAL → 人間 `decideApprovalAction` → **SuppressionList** 判定 → **EXTERNAL_SEND_ENABLED** かつ非該当時のみ送信（既定 log-only）。AI は `assertAiToolAllowed` により external_send を直接実行できない。
- **Consent Gate**: **SuppressionList** は送信ゲートで強制。**positive Consent** は用途別（§9）。
- **Security Gate**: 機密ラベル封印維持（詳細=閉／一覧・lead=未接続）。安全ゲート `scripts/check-company-brain-safety.mjs` exit 0。
- 本メモで送信ゲートは変更しない。**runtime 解禁なし**。

## 11. AI境界と実LLM / AIコスト封印

- AI 参照は **NORMAL / INTERNAL** ラベルのみ（`AI_READABLE_LABELS`）。**CUSTOMER_CONFIDENTIAL** / 顧客PII は AI 非注入。
- 外部LLM（**FakeLLM** 以外）は **externalAiAllowed**=true のレコードのみ＋`maskText` 経由。**externalAiAllowed** は既定 false 固定運用（true にする UI を作らない）。
- 生成は **FakeLLM** 決定論＝**実LLMなし**・**AIコストなし**・**外部送信なし**。

## 12. ロードマップ上の現在地（10項目・明示見出し）

### 12-1. 現在のPhase
事業 **Phase 2 CONDITIONAL COMPLETE**／PDF Phase 2.5／戦略 18.5-26 未突入／Ledger **R4 Commercial Core** + **R0 Governance Docs**（R12 Trust 接続）。

### 12-2. 現在のPhaseで完了したこと
Customer 詳細の `assertCanViewConfidential` 機密統制クローズ、外部送信の **Human Certification Gate**＋**SuppressionList** 強制＋**EXTERNAL_SEND_ENABLED** 既定OFF＋**LogEmailProvider**、AI境界（**FakeLLM**・**externalAiAllowed** 固定）を確認。安全ゲート exit 0。

### 12-3. 現在のPhaseで未完了のこと
**Customer一覧** の行レベル機密統制（未接続）、**LocalBusinessLead** 詳細PII表示のラベル一体化（未接続）、**Contact** / **LocalBusinessContact** 単体経路（未確認）、**positive Consent** 必須化の要否、回帰ゲート green 実行。

### 12-4. 次に進むPhase
事業 **Phase 3** AI Growth Engine。

### 12-5. 次のPhaseへ進むために必ず完了すべきこと
①閲覧レイヤ行レベル機密統制の要否決定 ②**opt-out** 方針の正式記録 ③**positive Consent** 分離方針の確定 ④回帰ゲート green ⑤**人間 Phase Gate 承認**。

### 12-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）
**HOLD**（判断材料は前進）。

### 12-7. GO / HOLD の理由
同意なし外部送信・AI単独外部送信・生PIIの無統制表示・**実LLMなし** の破れ・本番影響などの STOP 級危険は検出されず。一方、閲覧レイヤの行レベル統制と回帰ゲート未実行が残るため **HOLD**。

### 12-8. 人間承認が必要な判断
閲覧レイヤ統制の入れる／据え置き、**opt-out** 正式化、**positive Consent** 分離、Phase 3 Phase Gate 承認。

### 12-9. 次Phaseに進む前にやってはいけないこと
**Phase 3** 実装 / **runtime 解禁なし** / **externalAiAllowed** true 解禁 / **EXTERNAL_SEND_ENABLED** true 解禁 / **外部送信なし** / 実LLM / AIコスト / 本番確認 / 本番deploy / **schema変更なし** / **migrationなし** / **RBAC変更なし** / **369-vault非編集**。

### 12-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか
`tasks/CURRENT_STATE.md`（最新状態bullet 1件）・`tasks/PROGRESS.md`（節1件）・`docs/roadmap/27`（本書）・`docs/audit/126`（記録）・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（行1件）に反映。**369-vault非編集**。

## 13. Complete Function Coverage Matrix（50カテゴリ）

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

直接対象＝**C03**（Permission/Approval/Audit）・**C06**（Data Governance）・**C08**（CRM/Customer 360）・**C37**（Trust/Compliance）・**C38**（Consent/Privacy）・**C39**（Security/Zero Trust）・**C46**（Governance Docs）。

## 14. 20大カテゴリとの接続

Trust/Compliance・Consent/Privacy・Security・CRM/Customer 360・Data Governance・Permission/Approval/Audit・Governance Docs の各大カテゴリに接続。閲覧統制と外部送信ゲートは Trust/Security の中核。

## 15. 追加19領域との接続

外部送信 **Human Certification Gate**・**Consent Gate**・**Security Gate**・監査ログ（`DataAccessLog` / `confidential_view`）・Suppression 運用に接続。AI境界（**FakeLLM**・**AI_READABLE_LABELS**）はAI安全領域に接続。

## 16. 369独自差別化5本柱との接続

「安全第一」「AIは下書き・提案・参照まで」「人間承認ゲート」「外部送信は同意・抑止を尊重」「正本は GitHub docs」に接続。**opt-out** 強制と **positive Consent** 用途別分離は差別化の実装的裏付け。

## 17. 初期MVPで作らないもの

**Phase 3** 実装本体・高機密ラベル runtime 解禁・**externalAiAllowed** true UI・**EXTERNAL_SEND_ENABLED** true 常時運用・実LLM 接続・公開系（PR/SEO/SNS/口コミ）・Marketplace（C45 Future隔離）。

## 18. Global AI Rules

AIは下書き・提案・要約・分析・参照まで。危険操作は **Human Certification Gate**。**外部送信なし**・**実LLMなし**・**AIコストなし**・高機密ラベル **runtime 解禁なし**・同意なし外部送信なし・虚偽口コミ/ステマ/なりすましレビュー禁止。AI 参照は **NORMAL / INTERNAL** のみ・**CUSTOMER_CONFIDENTIAL** 非注入。

## 19. 判定案

判定: **B: HOLD**（Phase 3 Gate の判断材料は前進）。設計判断は整理できたが、閲覧レイヤ統制の方針決定・回帰ゲート green・**人間 Phase Gate 承認** が残る。

## 20. Phase 3 HOLD解除への影響

送信安全ゲート（**SuppressionList** 強制・**decideApprovalAction** 承認・**executeApprovedAction** 二重実行防止・PII マスク・AI直接送信不可・**LogEmailProvider** 既定）が閉じていることを確認済みのため、残るは閲覧レイヤ統制の設計決定と回帰ゲートに絞られた。HOLD解除は ①〜⑤（§12-5）＋人間承認で成立。

## 21. 次に必要な補強

- 閲覧レイヤ行レベル機密統制の方針決定（一覧/lead/Contact）。
- **opt-out** / **positive Consent** 分離方針の正式記録。
- 回帰ゲート（test / lint / typecheck / build / e2e）の green 実測。

## 22. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| 詳細は機密統制クローズ | `customers/[id]/page.tsx` `assertCanViewConfidential` | 閉 |
| 一覧は行レベルgateなし | `customers/page.tsx` `LabelBadge` のみ | 未接続 |
| 送信時Suppression強制 | `decideApprovalAction` `isSuppressed`→`suppressed` | 閉 |
| 実送信はフラグ既定OFF | `EXTERNAL_SEND_ENABLED`==='true' / `LogEmailProvider` | 閉 |
| AI直接送信不可 | `assertAiToolAllowed` | 閉 |
| 実LLMなし | `FakeLLM` 決定論 | 閉 |
| 安全ゲート | `scripts/check-company-brain-safety.mjs` | exit 0 |

## 23. Assumption Log

- outreach は **opt-out**（**SuppressionList**）を強制ゲートとする設計＝一般実務上許容。**positive Consent**（**ConsentRecord**）は用途別。
- 環境変数未設定＝実送信OFF（既定）。

## 24. Unknowns Log

- 閲覧レイヤ統制を入れる設計意図（据え置き設計か未実装か）。
- **positive Consent** 必須化の対象チャネル。
- 回帰ゲートの現時点 green/red。

## 25. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | 一覧/lead で機密顧客・PIIが権限のみで閲覧可能 | 中 | HOLD・要設計判断 |
| R2 | **opt-out** 方針が未明文化 | 低 | 本メモで記録 |
| R3 | 回帰ゲート未実行のまま Phase 3 判断 | 低 | 実行は別途 |

## 26. Definition of Done

- 7論点を docs-only で整理／判定 **B: HOLD**／**369-vault非編集**／**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**／**外部送信なし**・**実LLMなし**・**AIコストなし**／commit-only（push なし）。

## 27. 次回推奨プロンプト案

> 「`/workspace/369`(HEAD=git refs) で、doc126 の設計判断（閲覧レイヤ統制の据え置き/格上げ・**opt-out** 正式化・**positive Consent** 分離）について **人間 Phase Gate 承認** の可否を確認し、承認されれば Phase 3 移行条件チェックリストを docs-only で整備する。回帰ゲート green 実測は別途。**schema変更なし**・push は別承認。」

## 28. 判定

判定: **B: HOLD**。**高機密ラベル解禁なし**・**Phase 3** 実装なし・**runtime 解禁なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は **人間 Phase Gate 承認** 判断、または回帰ゲート green 確認。
