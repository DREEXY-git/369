# 133. CI Stage 3 E2E F1 test fix — docs/roadmap/34 の記録（tests-only・369-vault非編集）

## 1. 非エンジニア向け要約

- 今回は、CI の画面通しテスト（**e2e**）で落ちた15本のうち、**すぐ直せる4本（F1）だけをテスト側で最小修正**した回です。アプリ本体・データ・設定は**一切変えていません**（**tests-only**）。
- 直した4本の内訳: (A) 「同じ言葉が画面に2か所ある」でテストが迷っていた3本（棚卸・人員配置・案件名）＝**strict-mode** → テストが見る場所を1か所に絞った。(B) テストが期待する言葉が古かった1本 → 今の画面の言葉「Golden Path — 現在地と次の一手」に合わせた。
- 残り11本（**SEED_DATA_DRIFT** 優勢＝テスト用データの前提不足）は今回は触らず、次段（F2 診断→F3 データ整合）へ。**真のアプリ不具合（TRUE_APP_BUG）は0件**のまま。
- 検証: 型チェック（typecheck）と書式チェック（lint）は**合格**。実際の画面通しテストは本物のデータベースが要るので、**GitHub に反映（push）して CI が動いたときに確認**します（push は別のご承認）。
- **app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・本番確認なし・369-vault非編集**。判定 **F1 適用完了／CI_STAGE3_E2E_RED 継続／Phase 3 HOLD**。

## 2. 今回変更したファイル

- `apps/web/tests/e2e/operations_exec.spec.ts`（棚卸・人員配置の **strict-mode** 修正）
- `apps/web/tests/e2e/operations.spec.ts`（案件名 **strict-mode** 修正＋同テストの粗利率 `.first()`）
- `apps/web/tests/e2e/planning_hokko_golden_path.spec.ts`（**expected text** 更新）
- `docs/roadmap/34_…`（19見出し）・`docs/audit/133_…`（本書・14見出し）
- `tasks/CURRENT_STATE.md`・`tasks/PROGRESS.md`・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（記録）

## 3. 修正内容

- A=**TEST_SELECTOR_DRIFT** 3件（**F1**）: operations_exec:15 棚卸（`getByRole('heading',{name:/棚卸/})`→`'棚卸（実地在庫照合）'`）／operations_exec:39 人員配置（`getByText`→`getByRole('heading',{name:/人員配置/}).first()`）／operations:22 案件名（`getByText('E2Eテスト案件')`→`getByRole('heading',{name:'E2Eテスト案件'})`）。
- B=**TEXT_EXPECTATION_DRIFT** 1件（**F1**）: planning_hokko:16 期待文言を「Golden Path — 現在地と次の一手」へ。
- 付随: operations:22 テスト内の `getByText('粗利率')`→`.first()`（同テスト緑化のための同カテゴリ最小追加・app 変更なし）。
- C=**SEED_DATA_DRIFT** 11件・D=**TRUE_APP_BUG**（0）は本 **F1** の対象外。
- 背景（doc132 の **root-cause**）: CI run の **stage3_e2e** failure・**Run E2E** = **57 passed** / **15 failed**（**PLAYWRIGHT_FAIL**）。AI境界は **FakeLLM** 決定論のまま不変。

## 4. 検証結果

- `pnpm --filter @hokko/web typecheck`（tsc --noEmit）= **exit 0**。
- `pnpm lint`（eslint）= **exit 0**。
- 旧文言「現在地と次の一手（Golden Path）」除去 OK。
- e2e 実走は DB/サーバー不在で未実施＝push 後 **CI** の **stage3_e2e** で確認。安全ゲート exit 0。

## 5. 今回やらなかったこと

- **app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし**・labels変更なし・company-brain-reference変更なし・leadmap/customers/approvals・**ci.yml変更なし**・package.json/lockfile 変更なし。
- C11件の修正なし（F2/F3 へ）・**runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。

## 6. Phase 3 移行条件への影響

- **CI_STAGE3_E2E_RED** は C11件残存で継続。F1 で A3＋B1 の4件の原因は修正済み（CI 再実行で緑化見込み）。Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」は未達＝**Phase 3** 進入 **HOLD** 継続。
- 失敗は表示系で **Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系は緑（安全中核ゲート影響なし）。

## 7. Complete Function Coverage Matrix

- 直接: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 8. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| A3件 **strict-mode** 修正 | spec diff（heading/exact/`.first()`） | 適用 |
| B1件 **expected text** 更新 | planning_hokko:16 diff | 実文言へ |
| 旧文言除去 | grep = 0 | OK |
| typecheck | `pnpm --filter @hokko/web typecheck` | exit 0 |
| lint | `pnpm lint` | exit 0 |
| app/seed/ci.yml 無変更 | git status（禁止領域空） | tests-only |

## 9. Assumption Log

- A3件は app 表示正常でテスト側修正のみで緑化見込み。
- e2e 実緑は CI（DB あり）で確認。ローカルは DB 不在で未実行＝ENV 依存。

## 10. Unknowns Log

- CI 再実行で該当4件が確実に緑になるか（operations:22 は案件作成後描画に依存）。
- C11件の内訳（F2 診断で確定）。

## 11. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | F1 後も一部が別要因で赤 | 低 | CI 再実行で確認 |
| R2 | C11件未修正で **e2e** 全緑ならず | 中 | F2/F3 で対応（HOLD維持） |

## 12. Definition of Done

- **F1**（A3＋B1）を **tests-only** で適用／typecheck・lint 緑／旧文言除去／roadmap34＋doc133 記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／commit-only（push なし）。

## 13. 次回推奨プロンプト案

> 「F1 push-only（別承認）で main へ反映→ **CI** の **stage3_e2e** を read-only 確認し該当4件緑化を検証。残 C11件は F2 診断（playwright html reporter+trace・ci.yml/config 変更＝別承認）で screenshot 取得し C/D 最終確定。schema/seed/runtime/外部送信は禁止。」

## 14. 判定

判定: **F1 適用完了（tests-only・typecheck/lint 緑）／CI_STAGE3_E2E_RED は C11件残存で継続／Phase 3 進入 HOLD**。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は F1 push-only → CI 再実行で該当4件緑を確認。
