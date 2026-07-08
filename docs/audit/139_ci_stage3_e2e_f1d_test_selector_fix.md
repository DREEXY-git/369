# 139. CI Stage 3 E2E F1d test selector fix — docs/roadmap/40 の記録（tests-only・369-vault非編集）

## 1. 非エンジニア向け要約

- **F2** の CI 実行ログ分析（doc138）で、失敗10件のうち **4件は「同じ言葉が画面に2つある」というテストの書き方の問題（A=TEST_SELECTOR_DRIFT）**だと確定していました（データ不足ではなく、画面にはちゃんと出ている＝**strict-mode**）。
- 今回（**F1d**）は、その **4件だけ**を **テストファイル（e2e spec）のみ**で最小修正しました。アプリ本体・データ（seed）・DB 設計（schema）・CI 設定は**一切触っていません**。
- 直した内容は「あいまいな指定を、見出し（heading）や本文リンクの正確な名前に絞る」だけです。例:
  - 督促セクションの「督促」→ 見出し「入金確認・督促」に限定。
  - 「承認待ち」→ 見出し「承認待ち」に限定。
  - 「社長コックピット」→ 見出し「社長コックピット」に限定。
  - 「プランニングホッコー」リンク→ 本文リンク「プランニングホッコー →」に限定（直後の「社長コックピット →」も同じ形なので、同じ戻り導線として一緒に限定）。
- これで CI の失敗は **62 passed / 10 failed → 66 passed / 6 failed** に減る見込みです（実際の緑は push 後の CI で確認）。残り6件（C=**SEED_DATA_DRIFT** の疑い）は今回対象外で、別途 **F3**（データ整合・別承認）で対応します。
- **app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**。判定 **F1d tests-only 修正完了／CI_STAGE3_E2E_RED 継続／Phase 3 HOLD**。push なし（commit-only）。

## 2. 今回作成・変更したファイル

- 変更（tests-only）: `apps/web/tests/e2e/dunning.spec.ts`・`apps/web/tests/e2e/executive_dashboard.spec.ts`。
- 新規（docs）: `docs/roadmap/40_ci_stage3_e2e_f1d_test_selector_fix_candidate.md`・`docs/audit/139_ci_stage3_e2e_f1d_test_selector_fix.md`（本書）。
- 更新（tasks/dashboard）: `tasks/CURRENT_STATE.md`・`tasks/PROGRESS.md`・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`。
- **369-vault は非編集**。

## 3. F1d対象4件

| # | spec:line（実落） | strict-mode 2要素 | 分類 |
|---|---|---|---|
| 1 | dunning.spec.ts:15（:23） | h3「入金確認・督促（お支払い状況の確認）」＋p「未回収 ¥1,320,000…督促メール…」 | **A=TEST_SELECTOR_DRIFT** |
| 2 | dunning.spec.ts:50（:53） | sidebar link「承認待ち」＋h1「承認待ち」 | **A=TEST_SELECTOR_DRIFT** |
| 3 | executive_dashboard.spec.ts:15（:19） | sidebar link「社長コックピット」＋h1「社長コックピット」 | **A=TEST_SELECTOR_DRIFT** |
| 4 | executive_dashboard.spec.ts:37（:43-44） | sidebar link「プランニングホッコー」＋本文 link「プランニングホッコー →」（同型: 社長コックピット） | **A=TEST_SELECTOR_DRIFT** |

## 4. 修正内容

- dunning:15（:23）: `dunning.getByText(/督促/)` → `dunning.getByRole('heading', { name: /入金確認・督促/ })`。CardTitle=`<h3>`（`invoices/[id]/page.tsx:177`）に限定。
- dunning:50（:53）: `getByText('承認待ち')` → `getByRole('heading', { name: '承認待ち' })`。PageHeader=`<h1>`（`approvals/page.tsx:31`）に限定。
- executive_dashboard:15（:19）: `getByText('社長コックピット', { exact: false })` → `getByRole('heading', { name: '社長コックピット' })`。PageHeader=`<h1>`（`dashboard/ceo/page.tsx:67`）に限定。
- executive_dashboard:37（:43）: `getByRole('link', { name: /プランニングホッコー/ })` → `getByRole('link', { name: 'プランニングホッコー →' })`。本文リンク（`operations/events/[id]/page.tsx:155`）に exact 限定。
- executive_dashboard:37（:44・予防）: `getByRole('link', { name: /社長コックピット/ })` → `getByRole('link', { name: '社長コックピット →' })`。**同一テスト内の連続する戻り導線で、line 43 修正後に必ず露見する同型 strict-mode を予防した最小追加**（本文リンク `operations/events/[id]/page.tsx:156`）。CI ログで赤化していない行の広範囲修正ではない。

## 5. 検証結果

- `git diff --check`: OK。
- secret scan: 検出なし。
- `node scripts/check-company-brain-safety.mjs`: exit 0。
- `pnpm --filter @hokko/web typecheck`: exit 0。
- `pnpm lint`: exit 0。
- 旧曖昧セレクタ grep=0（`dunning.getByText(/督促/)`・`getByText('承認待ち')`・`getByText('社長コックピット', { exact: false })`・`getByRole('link', { name: /プランニングホッコー/ })`）。
- 新セレクタ grep=存在（`getByRole('heading', { name: /入金確認・督促/ })`・`getByRole('heading', { name: '承認待ち' })`・`getByRole('heading', { name: '社長コックピット' })`・`getByRole('link', { name: 'プランニングホッコー →' })`）。
- 差分は許可ファイルのみ（spec 2本＋docs/tasks）。**369-vault 差分なし**。app/seed/schema/migration/RBAC/ci.yml/playwright.config.ts/package.json/pnpm-lock.yaml 差分なし。
- e2e 実緑は本サンドボックスでは実走不能（Postgres/Actions/ブラウザDL なし）→ push 後の CI（stage3_e2e）で **62 passed / 10 failed → 66/6** 前後を確認。

## 6. 今回やらなかったこと

- **app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし**・labels/company-brain-reference/leadmap/customers/approvals・**ci.yml変更なし**・**playwright.config.ts変更なし**・**package.json/lockfile変更なし**。
- C暫定6件（golden_path_actions:15・operations:44・planning_hokko:16/24/35/45）は**未修正**（F3 seed・別承認）。
- artifact 再取得・network policy 回避なし。**runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・本番deployなし・**Phase 3 実装なし**・**369-vault非編集**・push なし（commit-only）。

## 7. Phase 3移行条件への影響

- **CI_STAGE3_E2E_RED** は C暫定6件が残るため、F1d push・CI 66/6 見込み後も継続。Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」未達＝**Phase 3** 進入 **HOLD** 継続。失敗数は 10→6 に縮小見込み。**Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系の失敗はゼロ（安全中核ゲート影響なし）。

## 8. Complete Function Coverage Matrix

- 直接: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 9. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| A=4件は strict-mode（要素描画済み） | F2 job log の strict mode violation＋DOM要素引用（doc138 §9-12） | A 確定 |
| heading/本文リンク実在 | `invoices/[id]/page.tsx:177`・`approvals/page.tsx:31`・`dashboard/ceo/page.tsx:67`・`operations/events/[id]/page.tsx:155-156`（ui.tsx:19 h3・page-header.tsx:30 h1） | 一意化可 |
| 旧セレクタ除去 | grep=0（4パターン） | 曖昧解消 |
| 新セレクタ導入 | grep=存在（4パターン） | 一意化 |
| tests-only | git status＝spec 2本＋docs/tasks のみ | app/seed/schema/ci 不変 |
| 封印維持 | env `LLM_PROVIDER: fake`・`EXTERNAL_SEND_ENABLED: false`（CI 既定・不変） | 送信・課金なし |

## 10. Assumption Log

- strict-mode の DOM 引用により A=4件は screenshot なしで tests-only 緑化できる。
- `getByRole('heading', …)` は CardTitle(h3)/PageHeader(h1) を role=heading で拾う。
- 本文リンク「〜 →」は exact name で sidebar link と分離できる。
- line 44（社長コックピット →）は line 43 と同型 strict-mode であり、同時修正が最小。

## 11. Unknowns Log

- push→CI の実緑（66/6 見込み）は CI 実行まで未確定。
- executive_dashboard:15 後続 Golden Path KPI 文言の描画有無（`:19` 通過後の CI で判定・C 転移可能性）。
- C暫定6件の C/D 最終確定（artifact screenshot 依存・本環境は proxy 403）。

## 12. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | executive_dashboard:15 後続 KPI が C で赤のまま | 中 | CI で確認・C なら F3（別承認） |
| R2 | line 44 予防修正が過剰と判断 | 低 | 同型 strict-mode に限定・docs 明記 |
| R3 | C暫定6件に D 混在の可能性 | 中 | screenshot 確定まで D 断定せず |
| R4 | artifact 期限 2026-07-14・本環境から読めない | 中 | 人手 download or network 許可（人間） |

## 13. Definition of Done

- **strict-mode** 4件（A=**TEST_SELECTOR_DRIFT**）を **e2e spec のみ**で最小修正（heading / 本文リンク exact 限定）／roadmap40＋doc139 に記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／`git diff --check`・secret scan・safety・typecheck・lint green／旧曖昧セレクタ grep=0・新セレクタ grep=存在／**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／commit-only（push なし）。

## 14. 次回推奨プロンプト案

> 「F1d push-only ミッション（別承認）: F1d tests-only 修正（strict-mode 4件・dunning:15/50・executive_dashboard:15/37）を push し、CI Stage 3 E2E（stage3_e2e）を実行。Run E2E が 62/10 → 66/6 前後に改善したことを確認。executive_dashboard:15 の後続 Golden Path KPI 文言が C（SEED_DATA_DRIFT）で残る場合は F3 候補として記録。残 C暫定6件（golden_path_actions:15・operations:44・planning_hokko:16/24/35/45）は artifact screenshot 確定後に F3 seed（schema 影響事前停止条件・別承認）。app/seed/schema/ci.yml/playwright.config.ts 変更なし・369-vault非編集。」

## 15. 判定

判定: **F1d tests-only 修正完了（strict-mode 4件＝A=TEST_SELECTOR_DRIFT を heading / 本文リンク exact に限定・dunning:15/50・executive_dashboard:15/37）／typecheck・lint・safety green／CI_STAGE3_E2E_RED は C暫定6件残存で継続（62/10 → 66/6 見込みは push 後 CI で確認）／Phase 3 進入は HOLD**。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は **F1d push-only**（別承認）→ artifact screenshot 確定 → **F3**（C=6件 seed・別承認）。
