# 134. CI Stage 3 E2E F1 result and F1b — docs/roadmap/35 の記録（tests-only・369-vault非編集）

## 1. 非エンジニア向け要約

- 前回テスト側で直した4本（**F1**）を GitHub に反映し、**CI** の画面通しテスト（**e2e**）を実際に走らせた結果を記録した回です。結果は **59 passed** / **13 failed**（**F1** 前は **57 passed** / **15 failed**）＝**2本ぶん改善・悪化ゼロ**。
- 直した4本のうち **棚卸** と **案件名** は緑に、**人員配置** は直った直後に「同じ言葉が画面に4か所ある（**strict-mode**）」で次の行『リスク』が新たに赤に、**Golden Path** は言葉は直ったがカードが描画されず C（データ前提不足＝**SEED_DATA_DRIFT**）へ移りました。
- そこで今回、その **『リスク』の1行だけ**をテスト側で見出しに絞る最小修正（**F1b**）をしました。アプリ本体・データ・設定は**一切変えていません**（**tests-only**）。物流タスクの行は赤ではないので触っていません。
- 残り11本（**SEED_DATA_DRIFT** 優勢）は今回対象外で、次段（F2 診断→F3 データ整合）へ。**真のアプリ不具合（TRUE_APP_BUG）は0件**のまま。機密・同意・CRM閲覧統制系は緑のまま。
- 検証: 型チェック（typecheck）と書式チェック（lint）は**合格**。実際の画面通しテストは本物のデータベースが要るので、**GitHub に反映（push）して CI が動いたときに確認**します（push は別のご承認）。
- **app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・本番確認なし・369-vault非編集**。判定 **F1b 適用完了／CI_STAGE3_E2E_RED 継続／Phase 3 HOLD**。

## 2. 今回作成したdocs

- `docs/roadmap/35_ci_stage3_e2e_f1_result_and_f1b_candidate.md`（18見出し・§10 サブ10個）。
- `docs/audit/134_…`（本書・15見出し）。
- 更新: `tasks/CURRENT_STATE.md`・`tasks/PROGRESS.md`・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`。
- 修正（tests-only）: `apps/web/tests/e2e/operations_exec.spec.ts`（リスク行1件）。

## 3. F1 push後 CI結果

- CI run 28873089407（HEAD 62ad994）: **stage1 success**／**stage3_e2e failure**。
- **Run E2E** = **59 passed** / **13 failed**（**CI_STAGE3_E2E_RED** / **PLAYWRIGHT_FAIL** 継続）。
- **F1** 前 = **57 passed** / **15 failed**。差分 = **+2 passed / −2 failed**（正味 −2 failed・退行ゼロ）。
- **F1** 対象4件: (1) operations_exec:15 棚卸=緑化 (2) operations:22 E2Eテスト案件=緑化 (3) operations_exec:39 人員配置=部分成功（line45通過・line46 リスク **strict-mode** 露見） (4) planning_hokko:16 Golden Path=文言反映もカード未描画で **SEED_DATA_DRIFT**（C）へ転移。

## 4. F1b 修正内容

- 対象: `operations_exec.spec.ts` line46 `getByText('リスク', { exact: false })`（イベント詳細に「リスク」を含む4要素＝**strict-mode** violation）。
- 修正: `getByRole('heading', { name: /リスク/ }).first()` に限定（見出しへ厳密化）。分類 A=**TEST_SELECTOR_DRIFT**。app 表示は正常（4要素＝コンテンツ存在）でテスト側のみ修正。
- 物流タスク行（line47）は赤化していないため**触らない**。

## 5. 検証結果

- `pnpm --filter @hokko/web typecheck`（tsc --noEmit）= **exit 0**。
- `pnpm lint`（eslint）= **exit 0**。
- 旧曖昧セレクタ `getByText('リスク', { exact: false })` 除去 OK（grep = 0）。
- e2e 実走は DB/サーバー不在で未実施＝push 後 **CI** の **stage3_e2e** で確認。安全ゲート exit 0。AI境界は **FakeLLM** 決定論のまま不変。

## 6. 今回やらなかったこと

- **app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし**・labels変更なし・company-brain-reference変更なし・leadmap/customers/approvals・**ci.yml変更なし**・package.json/lockfile 変更なし。
- 物流タスク行・C11件（**SEED_DATA_DRIFT** 優勢）の修正なし（F2/F3 へ）・**runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。

## 7. Phase 3 移行条件への影響

- **CI_STAGE3_E2E_RED** は C11件残存で継続。**F1**＋**F1b** で A系4＋B系1の原因は修正済み（CI 再実行で緑化見込み）。Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」は未達＝**Phase 3** 進入 **HOLD** 継続。
- 失敗は表示系で **Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系は緑（安全中核ゲート影響なし）。

## 8. Complete Function Coverage Matrix

- 直接: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 9. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| **F1** push 後 CI 実測 | run 28873089407・**Run E2E** | **59 passed** / **13 failed** |
| **F1** 前後差分 | 57 passed / 15 failed → 59/13 | +2 passed / −2 failed |
| F1b **strict-mode** 修正 | operations_exec:46 diff | heading/`.first()` 化 |
| 旧曖昧セレクタ除去 | grep = 0 | OK |
| typecheck | `pnpm --filter @hokko/web typecheck` | exit 0 |
| lint | `pnpm lint` | exit 0 |
| app/seed/ci.yml 無変更 | git status（禁止領域空） | tests-only |

## 10. Assumption Log

- リスク行は app 表示正常でテスト側修正のみで緑化見込み。
- e2e 実緑は CI（DB あり）で確認。ローカルは DB 不在で未実行＝ENV 依存。

## 11. Unknowns Log

- CI 再実行で **F1b** 該当行が確実に緑になるか（イベント詳細描画に依存）。
- C11件の内訳（planning_hokko:16 含む・F2 診断で確定）。

## 12. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | F1b 後もリスク行が別要因で赤 | 低 | CI 再実行で確認 |
| R2 | C11件未修正で **e2e** 全緑ならず | 中 | F2/F3 で対応（HOLD維持） |

## 13. Definition of Done

- **F1b**（リスク **strict-mode** 1件）を **tests-only** で適用／**F1** 結果（**59 passed** / **13 failed**）を roadmap35＋doc134 記録／typecheck・lint 緑／旧曖昧セレクタ除去／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／commit-only（push なし）。

## 14. 次回推奨プロンプト案

> 「F1b push-only（別承認）で main へ反映→ **CI** の **stage3_e2e** を read-only 確認し operations_exec:39 のリスク行緑化を検証（13→12 見込み）。残 C11件は F2 診断（playwright html reporter+trace・ci.yml/config 変更＝別承認）で screenshot 取得し C/D 最終確定。schema/seed/runtime/外部送信は禁止。」

## 15. 判定

判定: **F1b 適用完了（tests-only・typecheck/lint 緑）＋F1 結果記録（59 passed / 13 failed）／CI_STAGE3_E2E_RED は C11件残存で継続／Phase 3 進入 HOLD**。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は F1b push-only → CI 再実行で該当行緑を確認。
