# 43. CI Stage 3 E2E F1e tests-only fix Candidate（tests-only）

> 出典＝GitHub 正本 docs＋doc141/roadmap42 の C6 artifact 分析。これは残 **6 failed**（真因 tests-only・C=0/D=0）を **e2e spec のみ**で最小修正する **tests-only** 記録です。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**・push なし（commit-only）。

## 1. 目的

doc141/roadmap42 の artifact 分析で確定した残6件（C=SEED_DATA_DRIFT=0・D=TRUE_APP_BUG=0・真因 tests-only）を、**e2e spec のみ**で最小修正する。A=TEST_SELECTOR_DRIFT/setup 4件（operations:44・planning_hokko:24/35/45）と B=TEXT_EXPECTATION_DRIFT 2件（golden_path_actions:15・planning_hokko:16）を、実案件リンク選択・作成ステップの想定売上入力＋waitForURL race 解消・期待文言のページ実在文言への更新で緑化する。**F3 seed / schema 変更は不要**。

## 2. 現在地の正

- GitHub 正本モノレポ `dreexy-git/369`。feature branch=`claude/ci-stage3-e2e-f1d-selectors-hikwbg`・作業前 HEAD=origin/feature=`84d2a787ae125fb7426153e8513889d8c172a858`。origin/main=`ffd586b8cd87ec407aad6ecd3e0ea4394aee1978`（不変）。
- 事業 Phase 2-A 正式完了／**Phase 3** 進入 **HOLD**。直近 CI run 28927924922（run_number 141）= **stage1 success** / **stage3_e2e failure** / **Run E2E 66 passed / 6 failed**。EXTERNAL_SEND_ENABLED 既定 false・externalAiAllowed 既定 false・**FakeLLM** 決定論のまま不変。

## 3. app read-only 確認（app は変更しない）

- 案件詳細 `apps/web/app/(app)/operations/events/[id]/page.tsx`: `Golden Path — 現在地と次の一手`（CardTitle・line 96）・`粗利率` Stat（line 170・`canViewFinance` 真）・`原価・粗利は財務閲覧権限が必要です（機密情報）。`（line 173・`canViewFinance` 偽）が実在。財務欄は `canViewFinance ? finance : redaction` の三項で **権限どおりに出し分け**（社長=finance、スタッフ=redaction・機密値は表示されない）。
- 一覧 `operations/events/page.tsx`: 先頭に「イベント案件を作成」→ `/operations/events/new` リンク（line 30・PageHeader action・DOM 先頭）、以降に実案件リンク `/operations/events/{id}`（line 50）。よって `a[href^="/operations/events/"]').first()` は /new を掴む。作成フォームに `input[name="name"]`（required）と `input[name="revenue"]`（想定売上）が実在。
- `/dashboard/ceo`: `🤖 AIが社長に確認したい事項 / 推奨アクション`（CardTitle・line 83）・`🚨 今すぐ見るべき案件（優先度順）`（line 231）が実在。`対処:` は当該ページに不在（/planning-hokko 側の描画）。
- `/planning-hokko`: `🚨 今すぐ見るべき案件（優先度順）`（CardTitle・line 42）・`次の一手`（line 88）・`案件詳細・次の一手 →` link（line 95）が実在。`Golden Path — 現在地と次の一手` は入口ページに不在（案件詳細側の CardTitle）。
- 結論: **app は健全・redaction メッセージも実在**。したがって app 変更は不要で、tests 側のみ修正する。**D の証跡なし**。

## 4. 修正内容（tests-only・6件）

- golden_path_actions:15（B）: line 20 `getByText('対処:').first()` → `getByRole('heading', { name: /推奨アクション/ })`（/dashboard/ceo 実在の CardTitle 見出し）。line 18 `今すぐ見るべき案件` は不変（通過）。
- planning_hokko:16（B）: line 19 `getByText('Golden Path — 現在地と次の一手')` → `getByRole('heading', { name: /今すぐ見るべき案件/ })`（/planning-hokko 実在の見出し）。後続の `案件詳細・次の一手` link クリック→detail 遷移は不変。
- planning_hokko:24（A）: line 29 `a[href^="/operations/events/"]').first()` → `a[href^="/operations/events/"]:not([href$="/new"])').first()`（/new 除外で実案件へ）。line 32 assertion を `getByRole('heading', { name: /Golden Path — 現在地と次の一手/ })` に安定化（detail の CardTitle 実在）。
- planning_hokko:35（A）: line 38 セレクタを同様に `:not([href$="/new"])` へ。line 42 `getByText('粗利率')` は不変（社長は finance 権限で detail に実在）。
- planning_hokko:45（A・redaction）: line 48 セレクタを同様に `:not([href$="/new"])` へ。line 51 `getByText('原価・粗利は財務閲覧権限が必要です')` は不変（スタッフは detail で redaction メッセージ実在）。
- operations:44（A/setup・redaction）: 作成ステップに `input[name="revenue"]` を入力（500000）、`Promise.all([ page.waitForURL(/\/operations\/events\/(?!new(?:[/?#]|$))[^/?#]+/), 「案件を作成」click ])` で **実 detail URL を race-safe に捕捉**（/new を誤通過しない）。以降スタッフで同 URL を開き line 57 `getByText('原価・粗利は財務閲覧権限が必要です')` は不変。

## 5. 変更しなかったこと

- **app本体・seed・schema・migration・RBAC・labels・company-brain-reference・leadmap/customers/approvals・ci.yml・playwright.config.ts・package.json・pnpm-lock.yaml** は一切変更していない（**tests-only**）。
- redaction/finance の assertion 文言（`原価・粗利は財務閲覧権限が必要です`・`粗利率`・`Golden Path — 現在地と次の一手`）は app に実在するため**そのまま維持**（tests 側の navigation/expected を実在に合わせただけ）。
- artifact zip・展開物・screenshot・trace・test-results・playwright-report は **git add せず**。**runtime 解禁なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**Phase 3 実装なし**・**F3 seed なし**・**369-vault非編集**・push なし（commit-only）。

## 6. 検証結果

- `pnpm --filter @hokko/web typecheck`: exit 0。
- `pnpm lint`: exit 0。
- `node scripts/check-company-brain-safety.mjs`: exit 0。
- `git diff --check`: OK。secret scan: NONE。
- 旧パターン grep=0（planning の `.first()` 無 :not、golden `対処:`、planning:16 入口 `Golden Path — 現在地と次の一手`）。新パターン grep=存在（`:not([href$="/new"])`×3・operations の revenue 入力＋race-safe waitForURL・`推奨アクション`/`今すぐ見るべき案件`/`Golden Path — 現在地と次の一手` heading）。redaction/finance assertion は維持。
- 差分は許可ファイルのみ（spec 3本＋docs/tasks）。**369-vault 差分なし**。app/seed/schema/migration/RBAC/ci.yml/playwright.config.ts/package/lock 差分なし。artifact 混入なし。
- **e2e 実緑は本サンドボックスでは実走不能（Postgres/Actions/ブラウザ）→ push 後の CI（stage3_e2e）で 66/6 → 72/0 を確認**する。

## 7. redaction detail 到達後の再検証方針

- operations:44・planning_hokko:45 は、修正により **スタッフが実 detail に到達**する。app（line 173）は `canViewFinance` 偽で `原価・粗利は財務閲覧権限が必要です（機密情報）。` を表示し、finance stats（原価/粗利の実値）は非表示。よって **redaction メッセージは描画され・機密値は露出しない**見込み。push 後 CI で両テストが緑（メッセージ描画）を確認する。万一 CI で当該メッセージが出ない/スタッフに原価・粗利の実値が見える場合は、**D=TRUE_APP_BUG（重大）として停止し人間承認**を求める（app は本ミッションで変更しない）。

## 8. Phase 3 Gate への影響

- **CI_STAGE3_E2E_RED** は push→CI 緑化まで継続。本 commit は commit-only のため、緑化確認は F1e push（別承認）後の CI。Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」は緑化確認まで未達＝**Phase 3** 進入 **HOLD** 継続。緑化見込みは 66/6 → 72/0。

## 9. ロードマップ上の現在地（10項目・明示見出し）

### 9-1. 現在のPhase
事業 Phase 2-A 正式完了／**Phase 3** 進入 **HOLD**。CI 品質戦線は **F1e tests-only 修正（本書・commit-only）**。

### 9-2. 現在のPhaseで完了したこと
残6件（C=0/D=0・真因 tests-only）を e2e spec のみで最小修正。typecheck/lint/safety green。app read-only 確認で redaction/finance 実在・権限出し分け健全を確認。

### 9-3. 現在のPhaseで未完了のこと
F1e push→CI で 66/6 → 72/0 実緑確認。redaction 2件の detail 到達後の描画確認。**stage3_e2e** 緑化。最終 Phase Gate 承認。

### 9-4. 次に進むPhase
事業 **Phase 3** AI Growth Engine。

### 9-5. 次のPhaseへ進むために必ず完了すべきこと
F1e push→CI 72/0 確認（redaction 2件緑含む）→ **stage3_e2e** 緑 ＋ 最終 Phase Gate 承認。**F3 seed/schema は不要**。

### 9-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）
**HOLD**（**CI_STAGE3_E2E_RED** 継続・緑化は push 後 CI で確認）。

### 9-7. GO / HOLD の理由
本 commit は commit-only で CI 未緑化。回帰ゲート（e2e 含む）緑が未確認のため HOLD。緑化は tests-only で到達見込み。

### 9-8. 人間承認が必要な判断
F1e push（別承認）、最終 Phase Gate 承認。CI でスタッフに機密値露出 or redaction 未描画が判明した場合の D 対応（app 変更は別承認）。

### 9-9. 次Phaseに進む前にやってはいけないこと
**Phase 3** 実装／**runtime 解禁なし**／`externalAiAllowed` true 解禁／`EXTERNAL_SEND_ENABLED` true 解禁／**外部送信なし**／実LLM／AIコスト／本番確認／本番deploy／**schema変更なし**／**migrationなし**／**RBAC変更なし**／**seed変更なし（F3 不要）**／app変更／ci.yml/playwright.config.ts/package/lock 変更／**369-vault非編集**／artifact の git add／artifact blob URL curl／network policy 回避／force push／amend／rebase／reset。

### 9-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか
`tasks/CURRENT_STATE.md`（最新 bullet 1件＋次にやること更新）・`tasks/PROGRESS.md`（節1件）・`docs/roadmap/43`（本書）・`docs/audit/142`（記録）・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（行1件）。**369-vault非編集**。

## 10. Complete Function Coverage Matrix（50カテゴリ）

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

## 11. 20大カテゴリとの接続

- 本 F1e は「品質保証・回帰ゲート（CI/E2E）」大カテゴリのセレクタ/期待文言健全化。Operations/Planning Golden Path/Executive の表示系 e2e を、app に実在する導線・文言・権限出し分けに合わせて安定化した（app 不変）。

## 12. 追加19領域との接続

- 「テスト基盤・CI/CD 成熟度・観測性」に接続。artifact 目視（F2/C6）で確定した真因（selector/text drift）を tests-only で解消する find→classify→fix ループの最終段を実施。

## 13. 369独自差別化5本柱との接続

- 「安全封印」維持（EXTERNAL_SEND_ENABLED=false・**FakeLLM**・externalAiAllowed 既定 false・Suppression 強制）。「Golden Path」導線（プランニングホッコー↔案件詳細↔Finance Bridge）の e2e を app 実装に忠実に整合。redaction による機密保護（スタッフ非表示）を CI で検証する布石。

## 14. Global AI Rules

- 維持。AI参照は NORMAL/INTERNAL のみ。**FakeLLM** 決定論・**externalAiAllowed** 既定 false・**EXTERNAL_SEND_ENABLED** 既定 false・Suppression 送信ゲート強制。**外部送信なし・実LLMなし・AIコストなし・runtime 解禁なし**。

## 15. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| detail に Golden Path/粗利率/redaction 実在 | `events/[id]/page.tsx` line 96/170/173（read-only） | 期待文言 app 実在 |
| 権限出し分け健全 | line 165-174 `canViewFinance ? finance : redaction` | 社長=finance/スタッフ=redaction・機密非表示 |
| 一覧先頭が /new リンク | `events/page.tsx` line 30（PageHeader action） | .first() が /new を掴む＝A |
| 実案件リンク存在 | `events/page.tsx` line 50 `/operations/events/${e.id}` | :not(/new) で実案件へ |
| revenue 入力実在 | `events/new/page.tsx` line 58 `name="revenue"` | 作成が detail へ遷移 |
| cockpit/planning 実在文言 | ceo line 83/231・planning line 42/95 | B の期待文言更新可 |
| 旧パターン除去 | grep=0（対処:/入口 Golden Path/`.first()`無:not） | 曖昧/不在解消 |
| 新パターン導入 | grep=存在（:not(/new)×3・race-wait・heading×3） | 実在整合 |
| tests-only | git status＝spec 3本＋docs/tasks のみ | app/seed/schema/ci 不変 |

## 16. Assumption Log

- 案件詳細ページの期待文言（Golden Path/粗利率/redaction）は app に実在し、権限で出し分けられるため、tests が実 detail に到達すれば緑化する。
- 一覧先頭 anchor は /new（新規作成）であり、`:not([href$="/new"])` で実案件リンクへ切り替わる。
- operations:44 は revenue 入力＋race-safe waitForURL で実 detail URL を捕捉できる（passing 済みの「イベント案件を作成できる」テストが name+revenue で detail 到達を実証）。

## 17. Unknowns Log

- push→CI の実緑（72/0 見込み）は CI 実行まで未確定。
- redaction 2件が detail 到達後に実際に描画されるかは push 後 CI で確認（app 上は line 173 実在・権限で出し分け）。出ない/機密露出なら D として停止・人間承認。

## 18. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | detail 到達後に redaction が出ない/機密露出（残 D 可能性） | 中 | push 後 CI で確認・出なければ D 停止・人間承認 |
| R2 | 一覧の DOM 順序差で :not(/new) が別リンクを掴む | 低 | 実案件リンクは表内で先頭・CI で確認 |
| R3 | operations:44 の race-wait が環境で不安定 | 低 | Promise.all＋regex（/new 除外）で緩和・CI で確認 |
| R4 | stage3_e2e red 継続で Phase 3 HOLD 長期化 | 低 | F1e push で緑化見込み |

## 19. Definition of Done

- 残6件（C=0/D=0・真因 tests-only）を **e2e spec のみ**で最小修正／roadmap43＋doc142 に記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／`git diff --check`・secret scan・safety・typecheck・lint green／旧パターン grep=0・新パターン grep=存在／**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／artifact 非 git add／commit-only（push なし）。

## 20. 次回推奨プロンプト案

> 「F1e push-only ミッション（別承認）: F1e tests-only 修正 commit を feature branch `claude/ci-stage3-e2e-f1d-selectors-hikwbg` へ push（main へは push しない・force なし）。push→CI（stage3_e2e）で Run E2E 66 passed/6 failed → 72 passed/0 failed を確認。とくに redaction 2件（operations:44・planning_hokko:45）が detail 到達後に『原価・粗利は財務閲覧権限が必要です』を描画し、スタッフに原価・粗利の実値が露出しないことを CI で確認。緑なら stage3_e2e green 記録→最終 Phase Gate 承認へ。万一 redaction 未描画/機密露出なら D=TRUE_APP_BUG として停止し人間承認。app/seed/schema/ci.yml/playwright.config.ts 変更なし・369-vault非編集・F3 seed 不要。」

## 21. 判定

判定: **F1e tests-only 修正 commit 完了（残6件を e2e spec のみで最小修正・A=4 selector/setup＋B=2 text／app 変更なし・redaction/finance 文言は app 実在のため維持・C=0/D=0 で F3 seed/schema 不要）／typecheck・lint・safety green／CI_STAGE3_E2E_RED は push→CI 緑化まで継続（66/6 → 72/0 見込み）／Phase 3 進入は HOLD**。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は **F1e push-only**（別承認）→ CI で 72/0＋redaction 2件緑を確認 → stage3_e2e green → 最終 Phase Gate 承認。
