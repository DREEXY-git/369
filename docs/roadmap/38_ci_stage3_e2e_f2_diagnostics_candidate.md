# 38. CI Stage 3 E2E F2 diagnostics Candidate（config-only）

> 出典＝GitHub 正本 docs。これは **F2** 診断基盤の追加（Playwright config ＋ CI artifact path の最小変更）です。app 本体・e2e spec 期待値・seed・schema・ci.yml の env/service は変更しません。**app変更なし・tests期待値変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・package.json変更なし・lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**・push なし（commit-only）。

## 1. 目的

残 C10件（**SEED_DATA_DRIFT** 疑い）について、CI 失敗時に **html report / trace / screenshot** を **artifact** として取得できる診断基盤を追加し、次回以降に C=**SEED_DATA_DRIFT** か D=**TRUE_APP_BUG** かを最終確定できる状態を作る。**seed整合・schema変更・app表示修正・Phase 3 実装には進まない（F3 は別承認）**。

## 2. 現在地の正

- GitHub 正本モノレポ `dreexy-git/369`。現在地は git refs を正とする。事業 Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**。直近 CI run 28882890123（HEAD 5d5e0bc・run_number 136）= **stage1 success**／**stage3_e2e failure**／**Run E2E 62 passed / 10 failed**。EXTERNAL_SEND_ENABLED 既定 false・externalAiAllowed 既定 false・**FakeLLM** 決定論のまま不変。

## 3. F1〜F1cで解消したこと

- **F1**（A=**TEST_SELECTOR_DRIFT** 3件＋B=**TEXT_EXPECTATION_DRIFT** 1件）／**F1b**（リスク strict-mode 1件）／**F1c**（**FinanceEvent** / **入金実績** strict-mode 2件）で、**strict-mode（計7件）と文言ドリフト（1件）は全消化**。57/15 → 59/13 → 60/12 → **62/10** と単調改善・退行ゼロ。operations_exec spec は全緑。

## 4. 残C10件一覧

| # | spec:line | テスト | 分類 |
|---|---|---|---|
| 1 | dunning.spec.ts:15 | SENT 請求書の詳細に #dunning セクションが表示される（OWNER） | C=**SEED_DATA_DRIFT** |
| 2 | dunning.spec.ts:50 | 承認ページに dunning_send の種別ラベルが表示される | C=**SEED_DATA_DRIFT** |
| 3 | executive_dashboard.spec.ts:15 | 社長コックピットに Golden Path 経営KPI と「今すぐ見るべき案件」 | C=**SEED_DATA_DRIFT** |
| 4 | executive_dashboard.spec.ts:37 | 案件詳細から経営ダッシュボードへ戻る導線がある | C=**SEED_DATA_DRIFT** |
| 5 | golden_path_actions.spec.ts:15 | 社長は「今すぐ見るべき案件」に是正アクション（対処）が表示される | C=**SEED_DATA_DRIFT** |
| 6 | operations.spec.ts:44 | スタッフはイベント原価・粗利の機密情報を閲覧できない | C=**SEED_DATA_DRIFT** |
| 7 | planning_hokko_golden_path.spec.ts:16 | プランニングホッコー入口から案件詳細へ遷移できる | C=**SEED_DATA_DRIFT** |
| 8 | planning_hokko_golden_path.spec.ts:24 | 案件詳細に Golden Path（現在地と次の一手）カードが表示される | C=**SEED_DATA_DRIFT** |
| 9 | planning_hokko_golden_path.spec.ts:35 | 社長は案件詳細で Finance Bridge 導線・資金繰りリンクを利用できる | C=**SEED_DATA_DRIFT** |
| 10 | planning_hokko_golden_path.spec.ts:45 | スタッフ（財務権限なし）は案件詳細で原価・粗利を見られない | C=**SEED_DATA_DRIFT** |

## 5. F2で追加した診断設定

- **原因**: 現状 `reporter: 'list'`（html 未生成）＋ `trace: 'on-first-retry'` だが `retries: 0`（trace が永久に取得されない）＝ artifact 用の証跡が生成されず、CI で `No files were found with the provided path: apps/web/playwright-report` となっていた。
- **playwright.config.ts**:
  - `reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]`（html report を生成・list は可読性維持・`open:'never'` で CI ブロックなし）。
  - `use.trace: 'retain-on-failure'`（retries:0 でも失敗時に trace を保持）。
  - `use.screenshot: 'only-on-failure'`（失敗時のみ screenshot）。
  - trace/screenshot は既定 `test-results/` に出力（**gitignore 済み**）。
- **.github/workflows/ci.yml**:
  - `Upload Playwright report and traces on failure` の `path` に `apps/web/playwright-report` と `apps/web/test-results` の両方を含める（trace zip / screenshot / html を artifact 化）。
  - **env / service / step 構成は不変**（EXTERNAL_SEND_ENABLED=false / LLM_PROVIDER=fake / MAIL_PROVIDER=log / ephemeral Postgres 維持）。

## 6. 変更ファイル

- `apps/web/playwright.config.ts`（reporter/trace/screenshot 追加）。
- `.github/workflows/ci.yml`（artifact upload path 拡張のみ）。
- `docs/roadmap/38_…`（本書）・`docs/audit/137_…`（記録）。
- `tasks/CURRENT_STATE.md`・`tasks/PROGRESS.md`・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（記録）。

## 7. 変更しなかったこと

- app 本体・**e2e spec の期待値**・seed・schema・migration・RBAC・labels・company-brain-reference・leadmap・customers・approvals・**package.json**・**pnpm-lock.yaml**・369-vault は不変。
- ci.yml の env / service / 実行ステップ（migrate/seed/build/playwright test）は不変。
- **runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番なし・push なし。**F3 データ整合には進まない**。

## 8. 検証結果

- `git diff --check` = OK。secret scan = NONE。`node scripts/check-company-brain-safety.mjs` = exit 0。
- `pnpm --filter @hokko/web typecheck`（tsc --noEmit）= exit 0。`pnpm lint`（eslint）= exit 0。
- Playwright config 構文（tsc 型検査に含む）・CI yaml 構文（インデント/リテラル）確認。
- package.json / pnpm-lock.yaml 差分なし・369-vault 差分なし・app/tests/seed/schema/migration 差分なし。
- 実 e2e は push 後の CI（stage3_e2e）で走り、失敗時に artifact が生成される（本ミッションは commit-only・push なし）。

## 9. Phase 3 Gateへの影響

- **CI_STAGE3_E2E_RED** は C10件残存で継続（本 F2 はテスト結果を変えない・診断基盤のみ）。Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」は未達＝**Phase 3** 進入 **HOLD** 継続。
- 失敗は表示系で **Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系は緑（安全中核ゲート影響なし）。

## 10. ロードマップ上の現在地（10項目・明示見出し）

### 10-1. 現在のPhase
事業 Phase 2 CONDITIONAL COMPLETE／PDF 2.5／戦略 18.5-26 未突入／Ledger R4 Commercial Core + R0 Governance Docs。

### 10-2. 現在のPhaseで完了したこと
**F2** 診断基盤（html reporter + trace retain-on-failure + screenshot only-on-failure + artifact path 拡張）を config-only で追加・typecheck/lint 緑。

### 10-3. 現在のPhaseで未完了のこと
F2 push→CI で残 C10件の trace/screenshot 取得→ C/D 最終確定、（C確定なら）F3 データ整合、**stage3_e2e** 緑化、最終 Phase Gate 承認。

### 10-4. 次に進むPhase
事業 **Phase 3** AI Growth Engine。

### 10-5. 次のPhaseへ進むために必ず完了すべきこと
F2 push→artifact 取得→C/D 確定→F3 データ整合→**stage3_e2e** 緑＋最終 Phase Gate 承認。

### 10-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）
**HOLD**（**CI_STAGE3_E2E_RED** 継続）。

### 10-7. GO / HOLD の理由
C10件が残り **e2e** 全緑ではないため **回帰ゲート** 未達。F2 は診断基盤のみで結果は不変。

### 10-8. 人間承認が必要な判断
F2 の push 承認（CI で artifact 取得）、（C確定後の）F3 seed/データ整合承認（schema 影響事前停止条件）、最終 Phase Gate 承認。

### 10-9. 次Phaseに進む前にやってはいけないこと
**Phase 3** 実装／**runtime 解禁なし**／`externalAiAllowed` true 解禁／`EXTERNAL_SEND_ENABLED` true 解禁／**外部送信なし**／実LLM／AIコスト／本番確認／本番deploy／**schema変更なし**／**migrationなし**／**RBAC変更なし**／seed変更（F3 まで）／**369-vault非編集**。

### 10-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか
`tasks/CURRENT_STATE.md`（bullet 1件）・`tasks/PROGRESS.md`（節1件）・`docs/roadmap/38`（本書）・`docs/audit/137`（記録）・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（行1件）。**369-vault非編集**。

## 11. Complete Function Coverage Matrix（50カテゴリ）

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

## 12. 20大カテゴリとの接続

- 本 F2 は「品質保証・回帰ゲート（CI/E2E）」大カテゴリの**観測性（Observability）強化**に属する。Operations・Finance Bridge・Planning Golden Path・Dunning・Executive Dashboard の表示系 e2e 失敗を、証跡（trace/screenshot/html）付きで診断可能にする。機能追加はなく検証基盤の健全化。

## 13. 追加19領域との接続

- 追加19領域のうち「テスト基盤・CI/CD 成熟度・観測性」に直接接続。失敗の再現可能な証跡取得は、C/D 判定の一次情報を人間が確認できる形にする。外部発信・課金・AI 経済圏へは非接続（runtime 非解禁）。

## 14. 369独自差別化5本柱との接続

- 5本柱（安全封印・Company Brain・Golden Path・承認境界・広告費ゼロ成長）のうち「安全封印」を維持（EXTERNAL_SEND_ENABLED=false・**FakeLLM**・externalAiAllowed 既定 false・Suppression 強制）しつつ「Golden Path」導線 e2e の診断性を高める。

## 15. Global AI Rules

- 維持。AI参照は NORMAL/INTERNAL のみ。**FakeLLM** 決定論・**externalAiAllowed** 既定 false・**EXTERNAL_SEND_ENABLED** 既定 false・Suppression 送信ゲート強制。**外部送信なし・実LLMなし・AIコストなし・runtime 解禁なし**。

## 16. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| 現状 artifact 空の原因 | run 28882890123 ログ「No files were found with the provided path: apps/web/playwright-report」 | reporter=list＋retries:0 で証跡未生成 |
| html reporter 追加 | playwright.config.ts diff | `[['list'],['html',...]]` |
| trace/screenshot 追加 | playwright.config.ts diff | `retain-on-failure` / `only-on-failure` |
| artifact path 拡張 | ci.yml diff | `playwright-report` + `test-results` |
| 封印維持 | ci.yml env 不変・safety exit 0 | 送信・課金なし |
| package/lock 不変 | git status（禁止領域空） | 新規依存なし（html は組込） |

## 17. Assumption Log

- `@playwright/test ^1.49.1` の html reporter は組込のため **package.json 変更不要**。
- `test-results/` は既定 outputDir で trace/screenshot が出力され、`.gitignore` 済みのため誤コミットしない。
- `retain-on-failure` は retries:0 でも失敗テストの trace を保持する（`on-first-retry` は retries:0 で無効）。

## 18. Unknowns Log

- push 後の CI で実際に trace/screenshot/html が artifact 化されるか（本ミッションは commit-only・実走は次回 push）。
- 各 C10件が screenshot 上で「要素そのものが描画されていない（C）」か「描画されているが redaction 崩れ等（D）」かの最終判定（artifact 取得後）。

## 19. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | trace zip で artifact サイズ増（保存 7日） | 低 | retention-days:7・失敗時のみ |
| R2 | html reporter が CI をブロック（open） | 低 | `open:'never'` で回避 |
| R3 | C10件が D（真の不具合）を含む可能性 | 中 | F2 artifact で確定（現状 D=0 仮説） |

## 20. Definition of Done

- **F2** 診断基盤（html reporter + trace retain-on-failure + screenshot only-on-failure + ci.yml artifact path 拡張）を **config-only** で追加／typecheck・lint・safety 緑／roadmap38＋doc137 記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**app変更なし・tests期待値変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／commit-only（push なし）。

## 21. 次回推奨プロンプト案

> 「F2 push-only（別承認）で main へ反映→ CI の stage3_e2e を read-only 確認し、失敗時の **playwright-report artifact**（html + trace + screenshot）が生成されたかを検証。artifact を根拠に残 C10件を C（**SEED_DATA_DRIFT**）か D（**TRUE_APP_BUG**）に最終確定。schema/seed/runtime/外部送信は禁止（F3 データ整合は別承認）。」

## 22. 判定

判定: **F2 診断基盤 追加完了（config-only・typecheck/lint/safety 緑）／CI_STAGE3_E2E_RED は C10件残存で継続（結果不変・診断基盤のみ）／Phase 3 進入は HOLD**。**app変更なし・tests期待値変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は F2 push-only → CI で artifact 取得 → C/D 最終確定。
