# 135. CI Stage 3 E2E F1b result and F1c — docs/roadmap/36 の記録（tests-only・369-vault非編集）

## 1. 非エンジニア向け要約

- 前回テスト側で直した1本（**F1b**）を GitHub に反映し、**CI** の画面通しテスト（**e2e**）を実際に走らせた結果を記録した回です。結果は **60 passed** / **12 failed**（**F1b** 前は **59 passed** / **13 failed**・さらに前の **F1** 前は **57 passed** / **15 failed**）＝**着実に1本ずつ改善・悪化ゼロ**。
- **F1b** で「リスク」の行が緑になり、operations_exec（実行管理）のテストは**全部緑**になりました。
- 今回はさらに、残り12本の実エラーを読んだところ、**2本は「同じ言葉が画面に複数ある（strict-mode）」の取り違え**（**FinanceEvent** が3か所・**入金実績** が2か所）と判明したので、その**2本だけ**をテスト側で見出し／完全一致に絞る最小修正（**F1c**）をしました。アプリ本体・データ・設定は**一切変えていません**（**tests-only**）。
- 残り10本は「画面に要素そのものが出ていない（テスト用データの前提不足＝**SEED_DATA_DRIFT**）」で、次段（F2 診断→F3 データ整合）へ。**真のアプリ不具合（TRUE_APP_BUG）は0件**のまま。機密・同意・CRM閲覧統制系は緑のまま。
- 検証: 型チェック（typecheck）と書式チェック（lint）は**合格**。実際の画面通しテストは本物のデータベースが要るので、**GitHub に反映（push）して CI が動いたときに確認**します（push は別のご承認）。
- **app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・本番確認なし・369-vault非編集**。判定 **F1c 適用完了／CI_STAGE3_E2E_RED 継続／Phase 3 HOLD**。

## 2. 今回作成したdocs

- `docs/roadmap/36_ci_stage3_e2e_f1b_result_and_f1c_candidate.md`（20見出し・§12 サブ10個）。
- `docs/audit/135_…`（本書・15見出し）。
- 更新: `tasks/CURRENT_STATE.md`・`tasks/PROGRESS.md`・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`。
- 修正（tests-only）: `apps/web/tests/e2e/finance_bridge.spec.ts`・`apps/web/tests/e2e/invoice_payment.spec.ts`。

## 3. F1b push後 CI結果

- CI run 28876766413（HEAD 4069fb6・run_number 134）: **stage1 success**／**stage3_e2e failure**。基盤ステップ（migrate/seed/build/browser）は全 success、**Run E2E** のみ failure。
- **Run E2E** = **60 passed** / **12 failed**（**CI_STAGE3_E2E_RED** / **PLAYWRIGHT_FAIL** 継続）。
- 差分: **F1b** 前 = **59 passed** / **13 failed**（+1 passed / −1 failed）。**F1** 前 = **57 passed** / **15 failed**。
- **F1b** の効果: operations_exec:39 リスク **strict-mode** 緑化＝**operations_exec spec 全緑**（失敗一覧に operations_exec 系 0件）。

## 4. F1c 修正内容

- 対象1: `finance_bridge.spec.ts:19` `getByText('FinanceEvent',{exact:false})`（**FinanceEvent** を含む3要素＝**strict-mode**）→ `getByRole('heading', { name: '直近の FinanceEvent' })`（見出しへ厳密化）。分類 A=**TEST_SELECTOR_DRIFT**。
- 対象2: `invoice_payment.spec.ts:29` `getByText('入金実績',{exact:false})`（**入金実績** を含む2要素＝**strict-mode**）→ `getByText('入金実績', { exact: true })`（完全一致で単一要素へ）。分類 A=**TEST_SELECTOR_DRIFT**。
- いずれも app 表示正常（複数要素＝コンテンツ存在）でテスト側のみ修正。他 spec は非変更。

## 5. 検証結果

- `pnpm --filter @hokko/web typecheck`（tsc --noEmit）= **exit 0**。
- `pnpm lint`（eslint）= **exit 0**。
- 旧曖昧セレクタ 2件除去 OK（grep = 0）。
- e2e 実走は DB/サーバー不在で未実施＝push 後 **CI** の **stage3_e2e** で確認。安全ゲート exit 0。AI境界は **FakeLLM** 決定論のまま不変。

## 6. 今回やらなかったこと

- **app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし**・labels変更なし・company-brain-reference変更なし・leadmap/customers/approvals・**ci.yml変更なし**・package.json/lockfile 変更なし。
- C=10件（**SEED_DATA_DRIFT**）の修正なし（F2/F3 へ）・**runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。

## 7. Phase 3 移行条件への影響

- **CI_STAGE3_E2E_RED** は C10件残存で継続。**F1**〜**F1c** で A系7＋B系1の原因は修正済み（CI 再実行で緑化見込み・12→10 見込み）。Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」は未達＝**Phase 3** 進入 **HOLD** 継続。
- 失敗は表示系で **Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系は緑（安全中核ゲート影響なし）。

## 8. Complete Function Coverage Matrix

- 直接: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 9. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| **F1b** push 後 CI 実測 | run 28876766413・**Run E2E** | **60 passed** / **12 failed** |
| **F1b** 前後差分 | 59 passed / 13 failed → 60/12 | +1 passed / −1 failed |
| operations_exec spec 全緑 | 失敗一覧 operations_exec 系 0件 | 緑化 |
| F1c **FinanceEvent** 修正 | finance_bridge:19 diff | heading 化 |
| F1c **入金実績** 修正 | invoice_payment:29 diff | `{exact: true}` 化 |
| 旧曖昧セレクタ除去 | grep = 0 | OK |
| typecheck / lint | `pnpm ...` | exit 0 |
| app/seed/ci.yml 無変更 | git status（禁止領域空） | tests-only |

## 10. Assumption Log

- #1・#2 は app 表示正常でテスト側修正のみで緑化見込み。
- e2e 実緑は CI（DB あり）で確認。ローカルは DB 不在で未実行＝ENV 依存。

## 11. Unknowns Log

- CI 再実行で **F1c** 該当2行が確実に緑になるか（ダッシュボード描画に依存）。
- C10件の C/D 断定は F2 の trace/screenshot 待ち（現状 reporter 未設定）。

## 12. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | F1c 後も2件が別要因で赤 | 低 | CI 再実行で確認 |
| R2 | C10件未修正で **e2e** 全緑ならず | 中 | F2/F3 で対応（HOLD維持） |
| R3 | reporter 未設定で C/D 断定不可 | 低 | F2 で trace/screenshot 追加 |

## 13. Definition of Done

- **F1c**（**FinanceEvent** / **入金実績** の **strict-mode** 2件）を **tests-only** で適用／**F1b** 結果（**60 passed** / **12 failed**・operations_exec 全緑）を roadmap36＋doc135 記録／typecheck・lint 緑／旧曖昧セレクタ除去／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／commit-only（push なし）。

## 14. 次回推奨プロンプト案

> 「F1c push-only（別承認）で main へ反映→ **CI** の **stage3_e2e** を read-only 確認し finance_bridge:15・invoice_payment:25 の緑化を検証（12→10 見込み）。残 C10件は F2 診断（playwright html reporter+trace・ci.yml/config 変更＝別承認）で screenshot 取得し C/D 最終確定。schema/seed/runtime/外部送信は禁止。」

## 15. 判定

判定: **F1c 適用完了（tests-only・typecheck/lint 緑）＋F1b 結果記録（60 passed / 12 failed・operations_exec 全緑）／CI_STAGE3_E2E_RED は C10件残存で継続／Phase 3 進入 HOLD**。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は F1c push-only → CI 再実行で該当2行緑を確認。
