# 32. CI Stage 3 E2E failure triage Candidate（docs-only）

> 出典＝GitHub 正本 docs。これは **docs-only の失敗切り分け記録**であり、E2E/UI/seed の修正・実装ではありません。判定は **CI_STAGE3_E2E_RED / PLAYWRIGHT_FAIL / HOLD**。**369-vault非編集**・コード差分ゼロ・実装なし・push なし。

## 1. 目的

CI run 28860862696（commit 1e8bcd1）の **stage3_e2e failure** を read-only で1件ずつ切り分け、Phase 3 Gate 判断と次の修正ミッションに必要な材料を docs-only で正本化する。修正はしない。

## 2. 現在地の正

- GitHub 正本モノレポ `dreexy-git/369`。現在地は git refs を正とする（`git rev-parse HEAD` / `origin/main`）。
- 事業 Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**（残＝**e2e** 緑化＋最終 **人間 Phase Gate 承認**）。Ledger **R4 Commercial Core** + **R0 Governance Docs**（R12 Trust 接続）。

## 3. CI run の概要

- run 28860862696（headSha 1e8bcd1）= completed / failure。
- job **stage1 success**（safety/test/typecheck/lint）／job **stage3_e2e failure**。
- 封印維持: env `EXTERNAL_SEND_ENABLED=false`（LogEmailProvider）・`LLM_PROVIDER=fake`（**FakeLLM**）・`externalAiAllowed` 既定false・**runtime 解禁なし**・secrets 不要・本番DB非接続。

## 4. stage1 の結果

**stage1 success**。10 step すべて緑（checkout→pnpm→node→install→prisma generate→Company Brain safety→Unit tests→Typecheck→Lint）。回帰ゲートの静的側は緑。

## 5. stage3_e2e 基盤ステップの結果

基盤ステップは**全成功**: Initialize containers（Postgres）→checkout→install→Write CI .env→Generate Prisma→**migrate success**（`db:migrate:deploy`）→**seed success**（`db:seed` DEMO）→**build success**（`pnpm build`）→Playwright install chromium。**環境/CI 設定は正常**（ENV_RELATED ではない）。

## 6. Playwright失敗サマリ

- 「Run E2E」ステップのみ失敗＝**57 passed / 15 failed**（計72）。分類 **PLAYWRIGHT_FAIL**。
- 失敗領域: operations / operations_exec / planning_hokko_golden_path / executive_dashboard / finance_bridge / dunning / invoice_payment / golden_path_actions。
- **Customer一覧 / LocalBusinessLead / Contact / SuppressionList などの機密・同意・CRM閲覧統制系は失敗ゼロ**（Phase 3 の安全中核は影響なし）。

## 7. 15失敗の一覧

| # | spec:line | テスト | エラー種別 |
|---|---|---|---|
| 1 | dunning.spec.ts:15 | SENT 請求書詳細に #dunning セクション（OWNER） | expected text 未検出 |
| 2 | dunning.spec.ts:50 | 承認ページに dunning_send 種別ラベル | expected text 未検出 |
| 3 | executive_dashboard.spec.ts:15 | 社長コックピットに Golden Path 経営KPI | expected text 未検出 |
| 4 | executive_dashboard.spec.ts:37 | 案件詳細→経営ダッシュボード戻り導線 | expected text 未検出 |
| 5 | finance_bridge.spec.ts:15 | Finance Bridge ダッシュボード表示 | expected text 未検出 |
| 6 | golden_path_actions.spec.ts:15 | 今すぐ見るべき案件の是正アクション | expected text 未検出 |
| 7 | invoice_payment.spec.ts:25 | 資金繰りに予定vs実績表示 | expected text 未検出 |
| 8 | operations_exec.spec.ts:15 | 棚卸ページ表示 | **strict-mode**（/棚卸/ が2要素） |
| 9 | operations_exec.spec.ts:39 | イベント詳細に人員・リスク・物流 | **strict-mode**（人員配置 が2要素） |
| 10 | operations.spec.ts:22 | イベント案件を作成できる | **strict-mode**（E2Eテスト案件 が2要素） |
| 11 | operations.spec.ts:44 | スタッフはイベント原価・粗利を閲覧不可 | expected text 未検出 |
| 12 | planning_hokko_golden_path.spec.ts:16 | 入口から案件詳細へ遷移 | expected text 未検出 |
| 13 | planning_hokko_golden_path.spec.ts:24 | Golden Path カード表示 | expected text 未検出 |
| 14 | planning_hokko_golden_path.spec.ts:35 | 社長 Finance Bridge 導線・粗利率 | expected text 未検出 |
| 15 | planning_hokko_golden_path.spec.ts:45 | スタッフは原価・粗利を見られない | expected text 未検出 |

## 8. strict-mode セレクタ違反の分類（A: TEST_SELECTOR_DRIFT）

3件（#8/#9/#10）。**strict-mode** 違反＝ロケータが2要素に一致：
- #8 `getByRole('heading',{name:/棚卸/})` → h1「棚卸（実地在庫照合）」＋ h3「棚卸を開始」。
- #9 `getByText('人員配置')` → span「人員配置」＋ h3「人員配置（0）」。
- #10 `getByText('E2Eテスト案件')` → link ＋ h1。
- **原因＝テスト側のセレクタが曖昧**（アプリの表示は正常）。**修正＝テスト側のみ**（`.first()` / role・exact 指定）。低リスク。

## 9. 期待テキスト未検出の分類（B/C/D）

12件（#1〜#7・#11〜#15）。`expected text` の toBeVisible が timeout/element not found：
- 例: 「現在地と次の一手（Golden Path）」「Golden Path — 現在地と次の一手」「粗利率」「原価・粗利は財務閲覧権限が必要です」「Finance Bridge ダッシュボード」等。
- **想定原因（要1本ずつ精査）**: (B) UI 文言ドリフト（見出し文言が変わった）／(C) seed 前提データのズレ（ダッシュボードが期待する案件・SENT請求書等が seed に無い/値違い）／(D) 真のアプリ不具合の可能性（低〜中）。
- これらは **CI で e2e が初めて自動実行された結果、長年 CI 未組込だった e2e の drift が可視化された**もの。修正には spec ごとの root-cause 確認（UI 実表示 vs seed vs 権限）が必要。

## 10. seed / UI / test / app bug の切り分け

| 分類 | 件数 | 対象 | 修正主体 | リスク |
|---|---|---|---|---|
| A: TEST_SELECTOR_DRIFT（**strict-mode**） | 3 | #8/#9/#10 | テスト spec のみ | 低 |
| B: TEXT_EXPECTATION_DRIFT | 未確定（要精査） | #1-7,#11-15 の一部 | テスト or UI 文言 | 中 |
| C: SEED_DATA_DRIFT | 未確定（要精査） | ダッシュボード/請求系 | seed 整合（別承認） | 中 |
| D: TRUE_APP_BUG | 未確定（低〜中） | 権限/表示ロジック | app 修正（別承認） | 中 |
| E: ENV_RELATED | 0 | — | — | — |

**確定はA（3件・テスト側）のみ**。B/C/D は次の read-only 深掘り（spec ごとに UI 実表示・seed・権限を突合）で確定する。

## 11. Phase 3 Gateへの影響

- Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」は**未達**（**stage3_e2e failure**）。→ **Phase 3** 進入は **HOLD** 継続。
- ただし失敗15件は operations/planning/finance/dunning の**表示系**で、**Customer一覧 / LocalBusinessLead / Contact / SuppressionList などの機密・同意・CRM閲覧統制系は緑**。Phase 3 の安全中核ゲート（HCG/Consent/Security）には影響しない。

## 12. 修正優先度

1. **P1（即・低リスク）**: A の3件（strict-mode セレクタ修正・テスト spec のみ）。
2. **P2（要精査）**: B の UI 文言ドリフト（テキスト整合が明確なもの）。
3. **P3（要seed精査・別承認）**: C の seed 前提データ整合。
4. **P4（要app精査・別承認）**: D の真の不具合可能性（権限/表示ロジック）。
- いずれも次の read-only 深掘り→修正ミッション（別承認）。本書では**修正しない**。

## 13. ロードマップ上の現在地（10項目・明示見出し）

### 13-1. 現在のPhase
事業 Phase 2 CONDITIONAL COMPLETE／PDF 2.5／戦略 18.5-26 未突入／Ledger **R4 Commercial Core** + **R0 Governance Docs**。

### 13-2. 現在のPhaseで完了したこと
CI に **e2e** が組み込まれ実行（基盤全緑）。stage1 緑。失敗15件を read-only で分類（A確定3・B/C/D要精査12）。

### 13-3. 現在のPhaseで未完了のこと
**e2e** 15件の修正と **stage3_e2e** 緑化、最終 **人間 Phase Gate 承認**。

### 13-4. 次に進むPhase
事業 **Phase 3** AI Growth Engine。

### 13-5. 次のPhaseへ進むために必ず完了すべきこと
15件の root-cause 確定→修正→**CI** で **stage3_e2e** 緑、＋最終 Phase Gate 承認。

### 13-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）
**HOLD**（**CI_STAGE3_E2E_RED**）。

### 13-7. GO / HOLD の理由
基盤・stage1 は緑で封印維持だが、**e2e** が緑でなく **回帰ゲート** 未達のため。

### 13-8. 人間承認が必要な判断
(a) 15件の修正実装（テスト/UI/seed）を承認するか、(b) 表示系 e2e を後続課題（参考扱い）とし他5ゲート緑で Phase 3 判断するか。

### 13-9. 次Phaseに進む前にやってはいけないこと
**Phase 3** 実装／**runtime 解禁なし**／`externalAiAllowed` true 解禁／`EXTERNAL_SEND_ENABLED` true 解禁／**外部送信なし**／実LLM／AIコスト／本番確認／本番deploy／**schema変更なし**／**migrationなし**／**RBAC変更なし**／**369-vault非編集**。

### 13-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか
`tasks/CURRENT_STATE.md`（bullet 1件）・`tasks/PROGRESS.md`（節1件）・`docs/roadmap/32`（本書）・`docs/audit/131`（記録）・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（行1件）。**369-vault非編集**。

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

Governance Docs／CI／回帰ゲート（C46）・Security（C39）・Permission/Approval/Audit（C03）に接続。失敗領域は operations/finance の表示系。

## 16. 追加19領域との接続

回帰ゲート/CI 品質基盤・E2E smoke（Stage 3）に接続。Trust/Consent/Security の中核 e2e は今回緑。

## 17. 369独自差別化5本柱との接続

「安全第一」「人間承認ゲート」「正本は GitHub docs」に接続。封印（**外部送信なし**・**実LLMなし**）維持のまま品質可視化を前進。

## 18. Global AI Rules

AIは下書き・提案・要約・分析・参照まで。危険操作は Human Certification Gate。**外部送信なし**・**実LLMなし**・**AIコストなし**・**runtime 解禁なし**・同意なし外部送信なし。生成は **FakeLLM** 決定論・AI 参照は NORMAL/INTERNAL のみ。

## 19. 判定案

判定: **CI_STAGE3_E2E_RED / PLAYWRIGHT_FAIL**。基盤・stage1 緑・封印維持だが **e2e** 15件 red のため **HOLD**。確定修正対象は A（strict-mode 3件・テスト側）。B/C/D は read-only 深掘りで確定。

## 20. Phase 3 HOLD解除への影響

- **e2e** 緑化が Phase 3 GO の残条件。修正は表示系15件に限定され、機密・同意・CRM閲覧統制の e2e は既に緑。
- 解除経路: 15件 root-cause 確定→修正（別承認）→**CI** で **stage3_e2e** 緑→最終 Phase Gate 承認。

## 21. 次に必要な補強

- 15件の spec ごと root-cause read-only 深掘り（UI 実表示 vs seed vs 権限）。
- A の3件から段階修正（テスト spec のみ・低リスク）。
- C/D 該当があれば seed/app の事前停止条件を別承認化。

## 22. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| run failure | actions run 28860862696 | failure |
| **stage1 success** | job 85598812855 | success |
| 基盤全成功 | job 85599073841 steps（**migrate success**/**seed success**/**build success**） | success |
| **stage3_e2e failure** | job 85599073841「Run E2E」 | failure |
| サマリ | ログ「**57 passed** / **15 failed**」 | 72本中15赤 |
| strict-mode 3件 | 棚卸/人員配置/E2Eテスト案件 | TEST_SELECTOR_DRIFT |
| 封印維持 | env `EXTERNAL_SEND_ENABLED=false`/`FakeLLM` | 送信・課金なし |

## 23. Assumption Log

- 失敗15件は **CI** 未組込だった **e2e** の drift（今回初実行で可視化）。CI 実装の不具合ではない（ENV_RELATED=0）。
- A（3件）はテスト側確定。B/C/D は未確定（spec 精査で確定）。

## 24. Unknowns Log

- 12件（B/C/D）それぞれの root-cause（UI 文言 / seed / 権限 / 真の不具合）。
- seed が各ダッシュボードの前提エンティティ（案件・SENT請求書等）を十分作るか。
- Node20 非推奨警告の対応要否（動作影響なし）。

## 25. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | **e2e** red のまま Phase 3 進入 | 中 | HOLD維持で回避 |
| R2 | 12件に真のアプリ不具合（D）混在 | 中 | read-only 深掘りで確定 |
| R3 | seed 整合修正が schema/seed 変更に波及 | 中 | 事前停止条件で別承認化 |

## 26. Definition of Done

- 15失敗を read-only で分類（A確定3・B/C/D要精査12・E=0）／修正優先度整理／判定 **CI_STAGE3_E2E_RED / PLAYWRIGHT_FAIL / HOLD**／**369-vault非編集**／**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**／**外部送信なし**・**実LLMなし**・**AIコストなし**／実装なし・commit-only（push なし）。

## 27. 次回推奨プロンプト案

> 「`/workspace/369` で e2e 15失敗を spec ごとに read-only 深掘り（UI 実表示・seed・権限を突合）し、A(テスト側)/B(UI文言)/C(seed)/D(app) を確定した修正計画を doc132/roadmap33 に docs-only 記録。まず A の3件（strict-mode）の最小テスト修正案を提示（実装は承認後の別ミッション）。schema/RBAC/runtime/外部送信は禁止。」

## 28. 判定

判定: **CI_STAGE3_E2E_RED / PLAYWRIGHT_FAIL**（**stage1 success** / **migrate success** / **seed success** / **build success** / **Run E2E** = **57 passed** / **15 failed**）。**Phase 3** 進入は **HOLD**。**実装なし**・**runtime 解禁なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は e2e 15件の root-cause 深掘り→修正計画（別承認）。
