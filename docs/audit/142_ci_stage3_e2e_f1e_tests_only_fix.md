# 142. CI Stage 3 E2E F1e tests-only fix — docs/roadmap/43 の記録（tests-only・369-vault非編集）

## 1. 非エンジニア向け要約

- CI で残っていた6件の失敗を、**テストファイル（e2e spec）だけ**を直して解消する準備をしました。アプリ本体・データ（seed）・DB 設計（schema）・CI 設定は**一切変えていません**。
- 前回（doc141/roadmap42）で「6件はテストの書き方の問題（C=データ不足0件・D=アプリ不具合0件）」と確定していました。今回はその6件のテストを最小修正しました。
- 直した内容は次のとおりです。4件は「テストが案件詳細ページではなく『新規作成フォーム』を開いていた」問題で、一覧の『＋新規作成』リンクを除外して実際の案件リンクを開くように直しました（operations:44 は作成手順で金額を入力し、詳細ページに着くまで待つように直しました）。2件は「テストが期待した文字がそのページに無かった」問題で、そのページに実在する見出し（『推奨アクション』『今すぐ見るべき案件』）に期待を合わせました。
- 大事な確認: アプリの案件詳細ページには、財務権限のある社長には金額（原価・粗利・粗利率）を、権限のないスタッフには『原価・粗利は財務閲覧権限が必要です（機密情報）。』というメッセージを、**権限どおりに出し分ける実装が既にあります**（アプリのコードで確認済み）。だからスタッフに金額は漏れません。テストを直すだけで、この保護が正しく効いていることを CI で確認できます。
- したがって **データ整備（F3 seed）や DB 設計変更（schema）は不要**です。今回は commit のみで、push は別承認です。push 後の CI で 66 passed/6 failed が 72 passed/0 failed になる見込みです。
- ただし Phase 3 はまだ HOLD です。push 後の CI で緑になり、最後に人間が Phase Gate を承認するまで進みません。
- **app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**。判定 **F1e tests-only 修正 commit 完了 / CI_STAGE3_E2E_RED 継続（push 後 CI で緑化確認）/ Phase 3 HOLD**。

## 2. 今回作成・変更したファイル

- 変更（tests-only）: `apps/web/tests/e2e/golden_path_actions.spec.ts`・`apps/web/tests/e2e/operations.spec.ts`・`apps/web/tests/e2e/planning_hokko_golden_path.spec.ts`。
- 新規（docs）: `docs/roadmap/43_ci_stage3_e2e_f1e_tests_only_fix_candidate.md`・`docs/audit/142_ci_stage3_e2e_f1e_tests_only_fix.md`（本書）。
- 更新（tasks/dashboard）: `tasks/CURRENT_STATE.md`・`tasks/PROGRESS.md`・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`。
- **369-vault は非編集**。artifact zip・展開物・screenshot・trace は git add せず。

## 3. 修正6件

| # | spec:line | 種別 | 修正 |
|---|---|---|---|
| 1 | golden_path_actions:15 | B | `getByText('対処:')` → `getByRole('heading', { name: /推奨アクション/ })`（/dashboard/ceo 実在見出し） |
| 2 | operations:44 | A/setup | 作成ステップに `input[name="revenue"]` 入力＋`Promise.all([waitForURL(/…events/(?!new…)/), click])` で実 detail URL を race-safe 捕捉 |
| 3 | planning_hokko:16 | B | `getByText('Golden Path — 現在地と次の一手')` → `getByRole('heading', { name: /今すぐ見るべき案件/ })`（/planning-hokko 実在見出し） |
| 4 | planning_hokko:24 | A | セレクタ `a[href^="/operations/events/"]:not([href$="/new"])` で実案件へ＋assertion を heading 化 |
| 5 | planning_hokko:35 | A | セレクタ `:not([href$="/new"])` で実案件へ（`粗利率` assertion 維持） |
| 6 | planning_hokko:45 | A | セレクタ `:not([href$="/new"])` で実案件へ（redaction assertion 維持） |

## 4. app 実在確認（app は変更せず）

- `operations/events/[id]/page.tsx`: `Golden Path — 現在地と次の一手`（line 96）・`粗利率`（line 170）・`原価・粗利は財務閲覧権限が必要です（機密情報）。`（line 173）が実在。財務欄は `canViewFinance ? 金額 : redaction`（line 165-174）で権限どおり出し分け。
- `operations/events/page.tsx`: 先頭に /new 作成リンク（line 30）、以降に実案件リンク（line 50）。作成フォームに `name="revenue"`（line 58）。
- `/dashboard/ceo`: `推奨アクション`（line 83）・`今すぐ見るべき案件（優先度順）`（line 231）。`/planning-hokko`: `今すぐ見るべき案件（優先度順）`（line 42）・`案件詳細・次の一手 →`（line 95）。

## 5. 検証結果

- `pnpm --filter @hokko/web typecheck`: exit 0。`pnpm lint`: exit 0。`node scripts/check-company-brain-safety.mjs`: exit 0。`git diff --check`: OK。secret scan: NONE。
- 旧パターン grep=0（`getByText('対処:')`・入口 `getByText('Golden Path — 現在地と次の一手')`・`.first()` 無 :not）。新パターン grep=存在（`:not([href$="/new"])`×3・operations の revenue 入力＋race-safe waitForURL・heading×3）。redaction/finance assertion 維持。
- 差分は許可ファイルのみ（spec 3本＋docs/tasks）。**369-vault 差分なし**。app/seed/schema/migration/RBAC/ci.yml/playwright.config.ts/package/lock 差分なし。artifact 混入なし。
- e2e 実緑は本サンドボックスでは実走不能→ push 後の CI（stage3_e2e）で **66/6 → 72/0** を確認。

## 6. redaction detail 到達後の再検証

- 修正で operations:44・planning_hokko:45 は **スタッフが実 detail に到達**する。app（line 173）は `canViewFinance` 偽で redaction メッセージを表示し、原価・粗利の実値は非表示。→ push 後 CI で両テストが緑（メッセージ描画・機密非露出）を確認。万一メッセージ未描画/機密露出なら **D=TRUE_APP_BUG（重大）として停止・人間承認**（app は本ミッションで変更しない）。

## 7. Phase 3 移行条件への影響

- **CI_STAGE3_E2E_RED** は push→CI 緑化まで継続。本 commit は commit-only のため緑化は F1e push（別承認）後。Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」は緑化確認まで未達＝**Phase 3** 進入 **HOLD** 継続。緑化見込み 66/6 → 72/0。**Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系は緑（安全中核ゲート影響なし）。

## 8. 今回やらなかったこと

- **app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし**・labels/company-brain-reference/leadmap/customers/approvals・**ci.yml変更なし**・**playwright.config.ts変更なし**・**package.json/lockfile変更なし**。
- artifact zip・展開物・screenshot・trace の git add なし。artifact blob URL の curl なし。network policy 回避なし。F3 seed に進まない。**runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・本番deployなし・**Phase 3 実装なし**・**369-vault非編集**・push なし（commit-only）。

## 9. Complete Function Coverage Matrix

- 直接: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 10. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| detail に期待文言実在 | `events/[id]/page.tsx` line 96/170/173 | app 実在・app 不変 |
| 権限出し分け健全 | line 165-174 三項 canViewFinance | 機密非露出 |
| 一覧先頭 /new・実案件あり | `events/page.tsx` line 30/50 | :not(/new) で実案件へ |
| 旧パターン除去 | grep=0 | 曖昧/不在解消 |
| 新パターン導入 | grep=存在 | 実在整合 |
| tests-only | git status＝spec 3本＋docs/tasks | app/seed/schema/ci 不変 |
| 検証 green | typecheck/lint/safety exit 0・diff --check OK・secret NONE | 通過 |

## 11. Assumption Log

- 期待文言は app 実在・権限で出し分けのため、tests が実 detail に到達すれば緑化する。
- 一覧先頭 anchor は /new。`:not([href$="/new"])` で実案件へ。
- operations:44 は revenue 入力＋race-safe waitForURL で実 detail を捕捉（passing 済みの作成テストが name+revenue で detail 到達を実証）。

## 12. Unknowns Log

- push→CI の実緑（72/0 見込み）は CI 実行まで未確定。
- redaction 2件の detail 到達後の描画は push 後 CI で確認（app 上は実在・権限出し分け）。出ない/機密露出なら D 停止・人間承認。

## 13. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | detail 到達後に redaction 未描画/機密露出（残 D 可能性） | 中 | push 後 CI で確認・D なら停止・人間承認 |
| R2 | 一覧 DOM 順序差で :not(/new) が別リンクを掴む | 低 | 実案件リンクは表内先頭・CI で確認 |
| R3 | operations:44 の race-wait が不安定 | 低 | Promise.all＋regex で緩和・CI で確認 |
| R4 | stage3_e2e red 継続で Phase 3 HOLD 長期化 | 低 | F1e push で緑化見込み |

## 14. Definition of Done

- 残6件（C=0/D=0・真因 tests-only）を **e2e spec のみ**で最小修正／roadmap43＋doc142 に記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／`git diff --check`・secret scan・safety・typecheck・lint green／旧パターン grep=0・新パターン grep=存在／**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／artifact 非 git add／commit-only（push なし）。

## 15. 次回推奨プロンプト案

> 「F1e push-only ミッション（別承認）: F1e tests-only 修正 commit を feature branch へ push（main へは push しない・force なし）。push→CI（stage3_e2e）で Run E2E 66 passed/6 failed → 72 passed/0 failed を確認。redaction 2件（operations:44・planning_hokko:45）が detail 到達後に『原価・粗利は財務閲覧権限が必要です』を描画し、スタッフに原価・粗利の実値が露出しないことを CI で確認。緑なら stage3_e2e green 記録→最終 Phase Gate 承認へ。redaction 未描画/機密露出なら D=TRUE_APP_BUG として停止・人間承認。app/seed/schema/ci.yml/playwright.config.ts 変更なし・369-vault非編集・F3 seed 不要。」

## 16. 判定

判定: **F1e tests-only 修正 commit 完了（残6件を e2e spec のみで最小修正・A=4 selector/setup＋B=2 text／app 変更なし・redaction/finance 文言は app 実在のため維持・C=0/D=0 で F3 seed/schema 不要）／typecheck・lint・safety green／CI_STAGE3_E2E_RED は push→CI 緑化まで継続（66/6 → 72/0 見込み）／Phase 3 進入は HOLD**。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は **F1e push-only**（別承認）→ CI で 72/0＋redaction 2件緑を確認 → stage3_e2e green → 最終 Phase Gate 承認。
