# 29. Phase 3 Gate 移行判断の確定 Candidate（docs-only）

> 出典＝GitHub 正本 docs。これは **docs-only の人間決定記録**であり、実装・runtime 解禁・Phase 3 実装ではありません。**369-vault非編集**・コード差分ゼロ。承認されたのは「方針決定の記録」だけで、実装・解禁・本番反映・外部送信・push は一切承認されていません。

## 1. 目的

roadmap28 / doc127（Phase 3 Gate 人間判断チェックリスト）の6論点について人間が下した決定と、回帰ゲートの実測結果（safety/test/typecheck/lint/build=GREEN・e2e=ENV_BLOCKED）を §0 人間決定として正式記録し、Phase 3 移行の GO/HOLD を確定する。

## 2. 現在地の正

- GitHub 正本モノレポ `dreexy-git/369`。現在地は git refs を正とする（`git rev-parse HEAD` / `origin/main` / `git log origin/main..HEAD`）。
- 事業ロードマップ Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入は本書で条件を1点に絞り込み。Complete Ledger **R4 Commercial Core** + **R0 Governance Docs**（R12 Trust / Compliance / Security 接続）。

## 3. 承認された人間決定（§0 10項目）

このプロンプト送付をもって、以下10項目は人間承認済みの安全側決定値として扱う（承認範囲は docs-only の方針決定記録のみ）。

```
VIEW_LIST_ROW_LEVEL_POLICY: DEFER_KEEP_NO_RAW_PII_NOW
LEAD_PII_VIEW_POLICY: KEEP_CURRENT_ADD_DATAACCESSLOG_LATER
CONTACT_VIEW_POLICY: PARENT_CUSTOMER_LABEL_SUBORDINATE
OUTREACH_SEND_POLICY: OPT_OUT_SUPPRESSION_ENFORCED_APPROVED
POSITIVE_CONSENT_POLICY: PURPOSE_SEPARATED_NOT_MANDATORY_FOR_OUTREACH
REGRESSION_GATE_POLICY: REQUIRED_GREEN_BEFORE_PHASE3
E2E_VERIFICATION_POLICY: VERIFY_VIA_CI_RESULT
HIGH_CONFIDENTIAL_RUNTIME_POLICY: NO_RUNTIME_ENABLEMENT_NOW
PHASE3_ENTRY_POLICY: HOLD_UNTIL_E2E_CI_GREEN_AND_PHASE_GATE
IMPLEMENTATION_POLICY: DOCS_ONLY_NOW
```

## 4. 回帰ゲート実測結果

2026-07-07、`pnpm install --frozen-lockfile`（lockfile 不変）で依存を導入し main（`6f4e16e`）で実走。分類は **PARTIAL_GREEN**（コード起因の失敗＝RED はゼロ）。

| ゲート | コマンド | 結果 |
|---|---|---|
| safety | `node scripts/check-company-brain-safety.mjs` | GREEN（EXIT 0） |
| test | `pnpm test`（vitest） | GREEN（26ファイル・265 tests passed） |
| typecheck | `pnpm typecheck`（tsc --noEmit） | GREEN（db/web/worker） |
| lint | `pnpm lint`（eslint） | GREEN（EXIT 0） |
| build | `pnpm build`（next build） | GREEN（EXIT 0） |
| e2e | `pnpm test:e2e`（playwright） | ENV_BLOCKED（seed済DB・稼働Web前提／`DATABASE_URL` 未設定・`.env` 不在） |

## 5. e2e の扱い（CI実績で確認）

- e2e はサンドボックスに DB/起動サーバーが無いため実走不能（**ENV_BLOCKED**・コード欠陥ではない）。
- 決定（**E2E_VERIFICATION_POLICY: VERIFY_VIA_CI_RESULT**）: e2e の green は **CI**（`.github/workflows/ci.yml` 等の GitHub Actions 実績）で確認することを Phase 3 移行条件とする。ローカル DB 構築・seed・migration は本書では行わない（**migrationなし**）。

## 6. 6論点の確定内容

1. **Customer一覧**: 据え置き（行レベル gate は入れず、生PII列を足さない不変条件を維持。高機密運用開始時に格上げ）。
2. **LocalBusinessLead** / **LocalBusinessContact**: 当面現状維持（テナント分離＋leadmap 権限＋外部送信ゲート）、後日 **DataAccessLog** 一体化を格上げ候補として保持。
3. **Contact** 単体: 親 Customer のラベル従属を既定方針（単体ページ新設時は `assertCanViewConfidential` 必須）。
4. outreach: **opt-out**（**SuppressionList** 強制）を正式方針として承認（人間承認＋PIIマスク＋**EXTERNAL_SEND_ENABLED** 既定OFF＋**LogEmailProvider**＋`assertAiToolAllowed`）。
5. **positive Consent**（**ConsentRecord**）: 用途別分離を既定（outreach は opt-out 継続・規制厳格チャネルは段階格上げ）。
6. 回帰ゲート green: **Phase 3** 前の必須条件（**REGRESSION_GATE_POLICY: REQUIRED_GREEN_BEFORE_PHASE3**）。

## 7. Phase 3 移行 GO/HOLD 判定

- **方針決定**: GO（§0 10項目・6論点を人間承認・docs 記録として確定）。
- **Phase 3 進入**: **HOLD 継続**（**PHASE3_ENTRY_POLICY: HOLD_UNTIL_E2E_CI_GREEN_AND_PHASE_GATE**）。残る条件は e2e の CI green 確認と最終 Phase Gate 承認の2点に絞り込み。**高機密ラベル runtime 解禁なし**。

## 8. GO条件（残り）

- ① e2e を **CI** 実績で green 確認（safety/test/typecheck/lint/build は本書で GREEN 実測済み）。
- ② 最終 **人間 Phase Gate 承認**（Phase 3 実装着手の個別承認）。

## 9. HOLD継続の唯一の残点

- 品質面の残点は **e2e の CI green 確認のみ**（他5ゲートは実測 GREEN）。方針面の残点は最終 Phase Gate 承認のみ。

## 10. 事前停止条件（格上げ時）

- 将来 Customer一覧の行レベル gate（§6-1格上げ）や LocalBusinessLead の **DataAccessLog** 一体化（§6-2）を実装する場合は、**schema変更**/**RBAC変更** の要否を事前停止条件として別承認に切り出す。本書では **schema変更なし**・**RBAC変更なし**。

## 11. 今回やらなかったこと

- 実装・**schema変更なし**・**migrationなし**・**RBAC変更なし**・labels変更なし・company-brain-reference変更なし・leadmap/customers/approvals 変更なし・runtime 解禁なし・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・本番deploy なし・**369-vault非編集**・push なし（commit-only）。

## 12. Complete Function Coverage Matrix（50カテゴリ）

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

## 13. ロードマップ上の現在地（10項目・明示見出し）

### 13-1. 現在のPhase
事業 Phase 2 CONDITIONAL COMPLETE／PDF 2.5／戦略 18.5-26 未突入／Ledger **R4 Commercial Core** + **R0 Governance Docs**（R12 Trust 接続）。

### 13-2. 現在のPhaseで完了したこと
6論点の人間決定（§0 10項目）確定、回帰ゲート safety/test(265)/typecheck/lint/build を GREEN 実測。

### 13-3. 現在のPhaseで未完了のこと
e2e の **CI** green 確認、最終 **人間 Phase Gate 承認**。

### 13-4. 次に進むPhase
事業 **Phase 3** AI Growth Engine。

### 13-5. 次のPhaseへ進むために必ず完了すべきこと
e2e の CI green 確認 ＋ 最終 Phase Gate 承認。

### 13-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）
方針決定＝GO／Phase 3 進入＝**HOLD**（残条件2点）。

### 13-7. GO / HOLD の理由
STOP級危険なし・5ゲート GREEN。残るは e2e CI 確認と Phase Gate 承認のみのため、Phase 3 進入は安全側で **HOLD**。

### 13-8. 人間承認が必要な判断
e2e の CI green 確認の受領、最終 **Phase 3** Phase Gate 承認。

### 13-9. 次Phaseに進む前にやってはいけないこと
**Phase 3** 実装／**runtime 解禁なし**／**externalAiAllowed** true 解禁／**EXTERNAL_SEND_ENABLED** true 解禁／**外部送信なし**／実LLM／AIコスト／本番確認／本番deploy／**schema変更なし**／**migrationなし**／**RBAC変更なし**／**369-vault非編集**。

### 13-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか
`tasks/CURRENT_STATE.md`（bullet 1件）・`tasks/PROGRESS.md`（節1件）・`docs/roadmap/29`（本書）・`docs/audit/128`（記録）・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（行1件）に反映。**369-vault非編集**。

## 14. 20大カテゴリとの接続

Trust/Compliance・Consent/Privacy・Security/Zero Trust・CRM/Customer 360・Data Governance・Permission/Approval/Audit・Governance Docs に接続。

## 15. 追加19領域との接続

外部送信 **Human Certification Gate**・**Consent Gate**・**Security Gate**・監査ログ（**DataAccessLog**）・回帰ゲート/CI に接続。

## 16. 369独自差別化5本柱との接続

「安全第一」「AIは下書き・提案・参照まで」「人間承認ゲート」「同意・抑止を尊重した外部送信」「正本は GitHub docs」に接続。

## 17. 初期MVPで作らないもの

**Phase 3** 実装本体・高機密ラベル runtime 解禁・**externalAiAllowed** true UI・**EXTERNAL_SEND_ENABLED** true 常時運用・実LLM 接続・公開系（PR/SEO/SNS/口コミ）・Marketplace（C45 Future隔離）。

## 18. Global AI Rules

AIは下書き・提案・要約・分析・参照まで。危険操作は **Human Certification Gate**。**外部送信なし**・**実LLMなし**・**AIコストなし**・高機密ラベル **runtime 解禁なし**・同意なし外部送信なし・虚偽口コミ/ステマ/なりすましレビュー禁止。AI 参照は NORMAL/INTERNAL のみ・**CUSTOMER_CONFIDENTIAL** 非注入。生成は **FakeLLM** 決定論。

## 19. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| 5ゲート GREEN | 実走ログ（safety/test265/typecheck/lint/build） | GREEN |
| e2e 環境不足 | `playwright.config.ts`（DB/稼働Web前提）・`DATABASE_URL` 未設定 | ENV_BLOCKED |
| lockfile 不変 | `md5sum pnpm-lock.yaml`（4eac5c8b… 前後一致） | 不変 |
| 送信時Suppression強制 | `decideApprovalAction` + **SuppressionList** | 閉 |
| 詳細機密統制 | `assertCanViewConfidential` | 閉 |
| 安全ゲート | `scripts/check-company-brain-safety.mjs` | exit 0 |

## 20. Assumption Log

- e2e ENV_BLOCKED はコード欠陥ではなく DB/サーバー不在。CI 実績で代替確認する（**E2E_VERIFICATION_POLICY**）。
- `--frozen-lockfile` により依存導入で lockfile は不変・git 差分なし（node_modules は gitignore）。

## 21. Unknowns Log

- CI 最新 run の e2e green/red 実績。
- 将来格上げ時の schema/RBAC 変更の具体規模。

## 22. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | e2e CI 未確認のまま Phase 3 進入 | 中 | HOLD継続で回避 |
| R2 | 格上げ実装で schema/RBAC 変更が発生 | 中 | 事前停止条件で別承認化 |
| R3 | 方針の据え置きが高機密運用開始まで残る | 低 | 運用開始時に格上げ条件化 |

## 23. Definition of Done

- §0 10項目・6論点を人間決定として記録／回帰ゲート実測結果（PARTIAL_GREEN）を記録／判定確定／**369-vault非編集**／**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**／**外部送信なし**・**実LLMなし**・**AIコストなし**／commit-only（push なし）。

## 24. 次回推奨プロンプト案

> 「GitHub MCP で `dreexy-git/369` main 最新 CI run の e2e 結果を read-only 取得し green/red を確認。green なら doc129 で『Phase 3 移行 GO（最終 Phase Gate 承認待ち）』を docs-only 記録。red なら失敗内容を分類。実装・push・schema変更は別承認。」

## 25. 判定

判定: **方針決定＝GO（docs記録・§0 10項目/6論点を人間承認）／Phase 3 進入＝HOLD（残条件＝e2e CI green 確認＋最終 Phase Gate 承認の2点）**。**高機密ラベル解禁なし**・**Phase 3** 実装なし・**runtime 解禁なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。
