# 40. CI Stage 3 E2E F1d test selector fix Candidate（tests-only）

> 出典＝GitHub 正本 docs。これは **F2 log-based** 分析で **log 確定**した **strict-mode** 4件（A=**TEST_SELECTOR_DRIFT**）を、**e2e spec のみ**で最小修正する **tests-only** 記録です。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**・push なし（commit-only）。

## 1. 目的

**F2 log-based** artifact-blocked analysis（doc138／roadmap39）で **job log 確定**した **strict-mode** 4件（A=**TEST_SELECTOR_DRIFT**）を、**e2e spec のみ**で最小修正する。対象は **dunning:15 / dunning:50 / executive_dashboard:15 / executive_dashboard:37**。要素は画面に**描画済み**（**SEED_DATA_DRIFT** ではない）ため、セレクタを **heading / 本文リンク exact** に限定するだけで緑化する見込み。C暫定6件（**SEED_DATA_DRIFT**）は本書の対象外（F3 別承認）。

## 2. 現在地の正

- GitHub 正本モノレポ `dreexy-git/369`。作業開始時 HEAD=origin/main=`ffd586b8cd87ec407aad6ecd3e0ea4394aee1978`（doc138/roadmap39 の commit）。本 F1d は専用作業ブランチ `claude/ci-stage3-e2e-f1d-selectors-hikwbg`（origin/main と同一 commit 起点）で **commit-only**（push なし）。
- 事業 Phase 2-A 正式完了／**Phase 3** 進入 **HOLD**。直近 CI run 28885319767（run_number 137）= **stage1 success**／**stage3_e2e failure**／**Run E2E 62 passed / 10 failed**（**CI_STAGE3_E2E_RED** 継続）。EXTERNAL_SEND_ENABLED 既定 false・externalAiAllowed 既定 false・**FakeLLM** 決定論のまま不変。

## 3. Phase 3にまだ進めない理由

- **CI_STAGE3_E2E_RED** 継続（**62 passed / 10 failed**）。Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」が未達。
- A=4件は本 F1d で **tests-only** 緑化見込みだが、C暫定6件（**SEED_DATA_DRIFT**）が残る。C暫定6件は seed/データ前提不足の可能性が高く、**F3 seed 整合**（schema 影響の事前停止条件付き・別承認）が必要。
- したがって F1d 完了後も CI は **66/6** 前後になるだけで、**Phase 3 GO ではない**（HOLD 継続）。

## 4. Phase 3に進むために必要なこと

1. F1d で A=4件を **tests-only** で緑化する（本書）。
2. push 後 CI で **62/10 → 66/6** 前後を確認する。
3. C暫定6件について artifact screenshot / trace または代替確認で **C/D** を確定する。
4. C 確定分を **F3 seed/データ整合**で修正する（schema 影響が出るなら停止して人間承認）。
5. **stage3_e2e** を green にする。
6. 最終 **Phase 3 Phase Gate** を人間が承認する。

## 5. F2 log-based 分析の重要訂正

- doc136/roadmap37 の「残10件は全て C=**SEED_DATA_DRIFT** に収束」は**誤り**だった（失敗1〜3の詳細ログが当時の tail 範囲外で element-not-found と推定していたため）。
- F2 フルログにより **4件は strict-mode（A=TEST_SELECTOR_DRIFT）＝要素は描画済み**と判明。C は 10→6 に縮小。**D=TRUE_APP_BUG=0**（証跡なし）。**INSUFFICIENT_EVIDENCE** は C暫定6件（うち redaction 2件）に併記。

## 6. F1d対象4件の一覧

| # | spec:line（実落） | 旧セレクタ | strict-mode 2要素 | 分類 |
|---|---|---|---|---|
| 1 | dunning.spec.ts:15（:23） | `locator('#dunning').getByText(/督促/)` | h3「入金確認・督促（お支払い状況の確認）」＋p「未回収 ¥1,320,000…督促メール…」 | **A=TEST_SELECTOR_DRIFT** |
| 2 | dunning.spec.ts:50（:53） | `getByText('承認待ち')` | sidebar link「承認待ち」＋h1「承認待ち」 | **A=TEST_SELECTOR_DRIFT** |
| 3 | executive_dashboard.spec.ts:15（:19） | `getByText('社長コックピット', { exact: false })` | sidebar link「社長コックピット」＋h1「社長コックピット」 | **A=TEST_SELECTOR_DRIFT** |
| 4 | executive_dashboard.spec.ts:37（:43） | `getByRole('link', { name: /プランニングホッコー/ })` | sidebar link「プランニングホッコー」＋本文 link「プランニングホッコー →」 | **A=TEST_SELECTOR_DRIFT** |

## 7. dunning:15 修正内容

- 実落 line 23。テスト名: SENT 請求書の詳細に #dunning セクションが表示される（OWNER）。
- 旧: `await expect(dunning.getByText(/督促/)).toBeVisible();`
- 新: `await expect(dunning.getByRole('heading', { name: /入金確認・督促/ })).toBeVisible();`
- 根拠: `#dunning` 内に「督促」を含む要素が **2つ**（CardTitle=h3「入金確認・督促（お支払い状況の確認）」＋本文 p「未回収 ¥1,320,000…督促メール…」）。app 側 `apps/web/app/(app)/invoices/[id]/page.tsx:177` の `CardTitle`（= `components/ui.tsx` の `<h3>`）に限定することで一意化。**app 描画は正常・要素は存在**（SEED不足ではない）。schema/安全ゲート影響なし。

## 8. dunning:50 修正内容

- 実落 line 53。テスト名: 承認ページに dunning_send の種別ラベルが表示される。
- 旧: `await expect(page.getByText('承認待ち')).toBeVisible();`
- 新: `await expect(page.getByRole('heading', { name: '承認待ち' })).toBeVisible();`
- 根拠: `/approvals` に「承認待ち」が **2要素**（sidebar link＋PageHeader h1）。app 側 `apps/web/app/(app)/approvals/page.tsx:31` の `PageHeader title="承認待ち"`（= `components/page-header.tsx:30` の `<h1>`）に限定。ページは描画済み（2要素一致＝到達）。schema/安全ゲート影響なし。

## 9. executive_dashboard:15 修正内容

- 実落 line 19。テスト名: 社長コックピットに Golden Path 経営KPI と「今すぐ見るべき案件」が表示される。
- 旧: `await expect(page.getByText('社長コックピット', { exact: false })).toBeVisible();`
- 新: `await expect(page.getByRole('heading', { name: '社長コックピット' })).toBeVisible();`
- 根拠: `/dashboard/ceo` に「社長コックピット」が **2要素**（sidebar link＋PageHeader h1）。app 側 `apps/web/app/(app)/dashboard/ceo/page.tsx:67` の `PageHeader title="社長コックピット"`（= `<h1>`）に限定。後続の Golden Path KPI 文言（`:19` で停止し未到達だったもの）は本修正で `:19` 通過後に評価される。schema/安全ゲート影響なし。

## 10. executive_dashboard:37 修正内容

- 実落 line 43-44。テスト名: 案件詳細から経営ダッシュボードへ戻る導線がある。
- 旧: `await expect(page.getByRole('link', { name: /プランニングホッコー/ })).toBeVisible();`
- 新: `await expect(page.getByRole('link', { name: 'プランニングホッコー →' })).toBeVisible();`
- 根拠: 案件詳細 `apps/web/app/(app)/operations/events/[id]/page.tsx:155` の本文 link「プランニングホッコー →」と、sidebar link「プランニングホッコー」の **2要素**が正規表現に一致していた（strict-mode）。本文リンクは末尾に「 →」を持つため、**exact name「プランニングホッコー →」**で一意化。
- **同一テスト内の連続導線に対する最小予防修正**: 直後 line 44 `getByRole('link', { name: /社長コックピット/ })` も **同型 strict-mode**（sidebar link「社長コックピット」＋本文 link「社長コックピット →」＝`operations/events/[id]/page.tsx:156`）である。line 43 を通した瞬間に line 44 で同型 strict-mode が露見するため、**同じ戻り導線の最小追加**として `getByRole('link', { name: '社長コックピット →' })` に限定した（exact name）。CI ログで赤化していない行の広範囲修正ではなく、**同一テスト内の連続導線で次に露見する同型 strict-mode を予防した最小追加**である。app の該当リンク文言（`プランニングホッコー →`・`社長コックピット →`）は read-only で実在確認済み。schema/安全ゲート影響なし。

## 11. 変更しなかったこと

- **app本体・seed・schema・migration・RBAC・labels・company-brain-reference・leadmap/customers/approvals・ci.yml・playwright.config.ts・package.json・pnpm-lock.yaml** は一切変更していない（**tests-only**）。
- C暫定6件（golden_path_actions:15・operations:44・planning_hokko:16/24/35/45）は**未修正**（F3 seed 整合・別承認・schema 影響事前停止条件）。
- artifact バイナリ取得の再試行・network policy 回避なし。**runtime 解禁なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・本番deployなし・**Phase 3 実装なし**・**369-vault非編集**・push なし（commit-only）。

## 12. 検証結果

- `git diff --check`: OK（whitespace error なし）。
- secret scan: 検出なし。
- `node scripts/check-company-brain-safety.mjs`: exit 0。
- `pnpm --filter @hokko/web typecheck`: exit 0。
- `pnpm lint`: exit 0。
- 旧曖昧セレクタ grep=0（`dunning.getByText(/督促/)`・`getByText('承認待ち')`・`getByText('社長コックピット', { exact: false })`・`getByRole('link', { name: /プランニングホッコー/ })`）。
- 新セレクタ grep=存在（`getByRole('heading', { name: /入金確認・督促/ })`・`getByRole('heading', { name: '承認待ち' })`・`getByRole('heading', { name: '社長コックピット' })`・`getByRole('link', { name: 'プランニングホッコー →' })`）。
- 差分は許可ファイルのみ（spec 2本＋docs/tasks）。**369-vault 差分なし**。app/seed/schema/migration/RBAC/ci.yml/playwright.config.ts/package.json/pnpm-lock.yaml 差分なし。
- **e2e 実緑は本サンドボックスでは実走不能（Postgres/Actions/ブラウザDL なし）→ push 後の CI（stage3_e2e）で 62/10 → 66/6 前後を確認**する。

## 13. Phase 3 Gateへの影響

- **CI_STAGE3_E2E_RED** は C暫定6件が残るため、F1d push・CI 緑化（66/6 見込み）後も継続。Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」未達＝**Phase 3** 進入 **HOLD** 継続。距離は 10 failed → 6 failed に縮小する見込み。

## 14. ロードマップ上の現在地（10項目・明示見出し）

### 14-1. 現在のPhase
事業 Phase 2-A 正式完了／**Phase 3** 進入 **HOLD**。CI 品質戦線は F2（log-based 分類）→ **F1d（本書・A=4件 tests-only 修正）**。

### 14-2. 現在のPhaseで完了したこと
F2 log-based で確定した **strict-mode** 4件（A=**TEST_SELECTOR_DRIFT**）の **e2e spec のみ**の最小修正（heading / 本文リンク exact 限定）。typecheck/lint/safety green。

### 14-3. 現在のPhaseで未完了のこと
F1d の **push→CI で 62/10 → 66/6** 実緑確認。C暫定6件（**SEED_DATA_DRIFT**）の artifact screenshot 確定→**F3 seed 整合**。**stage3_e2e** 緑化。最終 Phase Gate 承認。

### 14-4. 次に進むPhase
事業 **Phase 3** AI Growth Engine。

### 14-5. 次のPhaseへ進むために必ず完了すべきこと
F1d push→CI 66/6 確認 → C=6件 screenshot 確定 → **F3 seed**（schema 影響事前停止条件・別承認）→ **stage3_e2e** 緑 ＋ 最終 Phase Gate 承認。

### 14-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）
**HOLD**（**CI_STAGE3_E2E_RED** 継続）。

### 14-7. GO / HOLD の理由
**62 passed / 10 failed** が残り **e2e** 全緑ではない。F1d で A=4 は tests-only 緑化見込み（66/6）だが、C=6 は要 seed（screenshot 確定後）。**回帰ゲート**未達＝HOLD。

### 14-8. 人間承認が必要な判断
F1d push（別承認）、artifact 人手取得 or network 許可の判断、**F3 seed 整合**承認（schema 影響事前停止条件）、最終 Phase Gate 承認。

### 14-9. 次Phaseに進む前にやってはいけないこと
**Phase 3** 実装／**runtime 解禁なし**／`externalAiAllowed` true 解禁／`EXTERNAL_SEND_ENABLED` true 解禁／**外部送信なし**／実LLM／AIコスト／本番確認／本番deploy／**schema変更なし**／**migrationなし**／**RBAC変更なし**／seed変更（F3 まで）／ci.yml/playwright.config.ts/package.json/lockfile 変更／**369-vault非編集**／network policy 回避／F1d対象外の e2e 修正。

### 14-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか
`tasks/CURRENT_STATE.md`（最新 bullet 1件）・`tasks/PROGRESS.md`（節1件）・`docs/roadmap/40`（本書）・`docs/audit/139`（記録）・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（行1件）。**369-vault非編集**。

## 15. Complete Function Coverage Matrix（50カテゴリ）

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

直接対象＝**C03**（会計・請求/督促）・**C06**（経営ダッシュボード）・**C08**（承認センター）・**C37**（Planning Golden Path）・**C38**（Operations/案件）・**C39**（Finance Bridge）・**C46**（品質保証・回帰ゲート/CI・E2E）。

## 16. 20大カテゴリとの接続

- 本 F1d は「品質保証・回帰ゲート（CI/E2E）」大カテゴリの**セレクタ健全化**に属する。Dunning・Executive Dashboard の表示系 e2e の strict-mode 曖昧を **tests-only** で解消し、回帰ゲート緑化への距離を縮める。

## 17. 追加19領域との接続

- 「テスト基盤・CI/CD 成熟度・観測性」に接続。log-based 分類（F2）で確定した A を tests-only で解消する運用（find→classify→fix の分離）を実証。

## 18. 369独自差別化5本柱との接続

- 「安全封印」維持（EXTERNAL_SEND_ENABLED=false・**FakeLLM**・externalAiAllowed 既定 false・Suppression 強制）。「Golden Path」導線（プランニングホッコー↔社長コックピット↔案件詳細）の戻り導線 e2e を安定化。

## 19. Global AI Rules

- 維持。AI参照は NORMAL/INTERNAL のみ。**FakeLLM** 決定論・**externalAiAllowed** 既定 false・**EXTERNAL_SEND_ENABLED** 既定 false・Suppression 送信ゲート強制。**外部送信なし・実LLMなし・AIコストなし・runtime 解禁なし**。

## 20. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| A=4件は strict-mode（要素描画済み） | F2 job log の strict mode violation＋実DOM要素引用（doc138 §9-12） | A 確定 |
| #dunning heading 実在 | `invoices/[id]/page.tsx:177` CardTitle=`<h3>`（ui.tsx:19-26） | heading 一意化可 |
| 承認待ち/社長コックピット h1 実在 | `approvals/page.tsx:31`・`dashboard/ceo/page.tsx:67` PageHeader=`<h1>`（page-header.tsx:30） | heading 一意化可 |
| 本文リンク「〜 →」実在 | `operations/events/[id]/page.tsx:155-156`（プランニングホッコー →／社長コックピット →） | exact name 一意化可 |
| 旧セレクタ除去 | grep=0（4パターン） | 曖昧解消 |
| 新セレクタ導入 | grep=存在（4パターン） | 一意化 |
| tests-only | git status＝spec 2本＋docs/tasks のみ | app/seed/schema/ci 不変 |

## 21. Assumption Log

- strict-mode の実DOM要素がログに引用されるため、A=4件は screenshot なしでも tests-only 修正で確定緑化できる。
- `getByRole('heading', …)` は CardTitle(h3)/PageHeader(h1) を role=heading として拾う（HTML 見出しタグのため）。
- 本文リンク「〜 →」は末尾に「 →」を持つため exact name で sidebar link と分離できる。
- executive_dashboard:37 の line 44（社長コックピット →）は line 43 と同型 strict-mode であり、line 43 修正後に必ず露見するため同時修正が最小である。

## 22. Unknowns Log

- push→CI の実緑（66/6 見込み）は CI 実行まで未確定。executive_dashboard:15 の後続 Golden Path KPI 文言の描画有無は `:19` 通過後の CI で判定（C 転移の可能性は残る）。
- C暫定6件の C/D 最終確定は artifact screenshot 依存（本環境は proxy 403 で取得不能）。

## 23. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | F1d 修正後に executive_dashboard:15 の後続 KPI 文言が C で赤のまま | 中 | CI で確認・C なら F3 seed（別承認） |
| R2 | line 44 予防修正が過剰と判断される | 低 | 同一テスト内連続導線の同型 strict-mode に限定・docs 明記 |
| R3 | C暫定6件に D 混在の可能性 | 中 | screenshot 確定まで D 断定せず（F 留保） |
| R4 | artifact 期限 2026-07-14・本環境から読めない | 中 | 人手 download or network 許可（人間） |

## 24. Definition of Done

- F2 log-based で確定した **strict-mode** 4件（A=**TEST_SELECTOR_DRIFT**）を **e2e spec のみ**で最小修正（heading / 本文リンク exact 限定）／roadmap40＋doc139 に記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／`git diff --check`・secret scan・safety・typecheck・lint green／旧曖昧セレクタ grep=0・新セレクタ grep=存在／**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／commit-only（push なし）。

## 25. 次回推奨プロンプト案

> 「F1d push-only ミッション（別承認）: F1d tests-only 修正（strict-mode 4件・dunning:15/50・executive_dashboard:15/37）を push し、CI Stage 3 E2E（stage3_e2e）を実行。Run E2E が 62/10 → 66/6 前後に改善したことを確認。executive_dashboard:15 の後続 Golden Path KPI 文言が C（SEED_DATA_DRIFT）で残る場合は F3 候補として記録。残 C暫定6件（golden_path_actions:15・operations:44・planning_hokko:16/24/35/45）は artifact screenshot 確定後に F3 seed（schema 影響事前停止条件・別承認）。app/seed/schema/ci.yml/playwright.config.ts 変更なし・369-vault非編集。」

## 26. 判定

判定: **F1d tests-only 修正完了（strict-mode 4件＝A=TEST_SELECTOR_DRIFT を heading / 本文リンク exact に限定・dunning:15/50・executive_dashboard:15/37）／typecheck・lint・safety green／CI_STAGE3_E2E_RED は C暫定6件残存で継続（62/10 → 66/6 見込みは push 後 CI で確認）／Phase 3 進入は HOLD**。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は **F1d push-only**（別承認）→ artifact screenshot 確定 → **F3**（C=6件 seed・別承認）。
