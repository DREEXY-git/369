# 35. CI Stage 3 E2E F1 result and F1b Candidate（tests-only）

> 出典＝GitHub 正本 docs。これは **F1** push 後の **CI** 実測結果の記録と、**F1b**（**e2e** spec 1本の **tests-only** 最小修正）です。app 本体・seed・schema・ci.yml は変更しません。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**・push なし（commit-only）。

## 1. 目的

doc133/roadmap34 で適用した **F1**（tests-only 4件）を main へ反映後、**CI** の **stage3_e2e** 実測結果を記録し、そこで露見した **operations_exec:39 の「リスク」strict-mode** 1件を **F1b** として **tests-only** で最小修正する。C11系（**SEED_DATA_DRIFT** 優勢）は継続、**TRUE_APP_BUG** は 0 のまま。

## 2. 現在地の正

- GitHub 正本モノレポ `dreexy-git/369`。現在地は git refs を正とする。事業 Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**（残＝**stage3_e2e** 緑化＋最終人間 Phase Gate 承認）。Ledger R4 Commercial Core + R0 Governance Docs。EXTERNAL_SEND_ENABLED 既定 false・externalAiAllowed 既定 false・**FakeLLM** 決定論のまま不変。

## 3. F1 push後 CI結果

- CI run 28873089407（HEAD 62ad994）: run=failure。**stage1 success**／**stage3_e2e failure**。
- **Run E2E** = **59 passed** / **13 failed**（**CI_STAGE3_E2E_RED** / **PLAYWRIGHT_FAIL** 継続）。
- **F1** 前（run 28860862696）= **57 passed** / **15 failed**。
- 差分 = **+2 passed / −2 failed**（正味 −2 failed・退行ゼロ）。基盤（migrate/seed/build/browser）は緑のまま。

## 4. F1対象4件の結果

1. operations_exec:15 棚卸 = **緑化**（失敗一覧から消滅）。
2. operations:22 E2Eテスト案件 = **緑化**（失敗一覧から消滅）。
3. operations_exec:39 人員配置 = **部分成功**。line45 の人員配置 heading 化は通過。同テスト line46 の `getByText('リスク',{exact:false})` が新たに **strict-mode**（4要素一致）で赤。
4. planning_hokko:16 Golden Path = 期待文言の修正は反映。今度はカード要素が未描画で `getByText('Golden Path — 現在地と次の一手')` 要素不在＝**C（SEED_DATA_DRIFT）** へ転移。

## 5. F1b の対象

- 対象テスト: `operations_exec.spec.ts` の「イベント詳細に人員・リスク・物流が表示される」（line39〜）。
- 対象箇所: line46 `getByText('リスク', { exact: false })`。イベント詳細画面に「リスク」を含む要素が4つあり **strict-mode** violation。
- 分類: A=**TEST_SELECTOR_DRIFT**（テストセレクタの曖昧さ）。app 表示は正常（4要素＝コンテンツ存在）。
- 物流タスク行（line47 `getByText('物流タスク')`）は CI で赤化していないため**触らない**。

## 6. F1b 修正内容

- line46 を `getByRole('heading', { name: /リスク/ }).first()` に限定（見出しへ厳密化）。
- app 表示は変えず、テスト側の期待セレクタのみ修正（**tests-only**）。人員配置（line45）と同じ手法で整合。

## 7. 変更しなかったこと

- app 本体・seed・schema・migration・RBAC・labels・company-brain-reference・leadmap・customers・approvals・ci.yml・package.json・pnpm-lock.yaml・369-vault は不変。
- 物流タスク行・C11件（**SEED_DATA_DRIFT** 優勢・planning_hokko:16 含む）は未修正（F2 診断→F3 データ整合へ）。
- **runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番なし・push なし。

## 8. 検証結果

- `pnpm --filter @hokko/web typecheck`（tsc --noEmit）= **exit 0**。
- `pnpm lint`（eslint）= **exit 0**。
- 旧曖昧セレクタ `getByText('リスク', { exact: false })` 除去 OK（grep = 0）。
- e2e 実走は ローカル DB/サーバー不在のため未実施＝**push 後の CI（stage3_e2e）で確認**。安全ゲート `node scripts/check-company-brain-safety.mjs` exit 0。AI境界は **FakeLLM** 決定論のまま不変（実LLMなし）。

## 9. Phase 3 Gateへの影響

- **CI_STAGE3_E2E_RED** は継続（C11件が未修正）。**F1** で A3＋B1、**F1b** で A1 の原因を修正済み（CI 再実行で該当行緑化見込み）。
- Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」は C11件の解消（F2/F3）まで未達＝**Phase 3** 進入 **HOLD** 継続。
- 失敗は表示系で **Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系は緑（安全中核ゲート影響なし）。

## 10. ロードマップ上の現在地（10項目・明示見出し）

### 10-1. 現在のPhase
事業 Phase 2 CONDITIONAL COMPLETE／PDF 2.5／戦略 18.5-26 未突入／Ledger R4 Commercial Core + R0 Governance Docs。

### 10-2. 現在のPhaseで完了したこと
**F1** push 後 **CI** 実測（**59 passed** / **13 failed**）を記録・**F1b**（リスク **strict-mode** 1件）の tests-only 最小修正を適用・typecheck/lint 緑。

### 10-3. 現在のPhaseで未完了のこと
CI 再実行での **F1b** 該当行緑確認、C11件の F2 診断→F3 整合、**stage3_e2e** 緑化、最終 Phase Gate 承認。

### 10-4. 次に進むPhase
事業 **Phase 3** AI Growth Engine。

### 10-5. 次のPhaseへ進むために必ず完了すべきこと
F1b push→CI 該当行緑→F2→F3 で **stage3_e2e** 緑＋最終 Phase Gate 承認。

### 10-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）
**HOLD**（**CI_STAGE3_E2E_RED** 継続）。

### 10-7. GO / HOLD の理由
**F1**＋**F1b** で A系4＋B系1は修正済みだが C11件が残り **e2e** 全緑ではないため **回帰ゲート** 未達。

### 10-8. 人間承認が必要な判断
F1b の push 承認（CI 再実行）、F2（ci/config 変更）承認、F3（seed 変更・schema 影響事前停止条件）承認。

### 10-9. 次Phaseに進む前にやってはいけないこと
**Phase 3** 実装／**runtime 解禁なし**／`externalAiAllowed` true 解禁／`EXTERNAL_SEND_ENABLED` true 解禁／**外部送信なし**／実LLM／AIコスト／本番確認／本番deploy／**schema変更なし**／**migrationなし**／**RBAC変更なし**／**ci.yml変更なし**／**369-vault非編集**。

### 10-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか
`tasks/CURRENT_STATE.md`（bullet 1件）・`tasks/PROGRESS.md`（節1件）・`docs/roadmap/35`（本書）・`docs/audit/134`（記録）・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（行1件）。**369-vault非編集**。

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

## 12. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| **F1** push 後 CI 実測 | run 28873089407・**Run E2E** | **59 passed** / **13 failed**（**stage1 success**／**stage3_e2e failure**） |
| **F1** 前後差分 | 57 passed / 15 failed → 59/13 | +2 passed / −2 failed |
| F1b **strict-mode** 修正 | operations_exec:46 diff | `getByRole('heading',{name:/リスク/}).first()` 化 |
| 旧曖昧セレクタ除去 | grep `getByText('リスク', { exact: false })` = 0 | OK |
| typecheck | `pnpm --filter @hokko/web typecheck` | exit 0 |
| lint | `pnpm lint` | exit 0 |
| 封印維持 | app/seed/ci.yml 無変更・safety exit 0 | 送信・課金なし |

## 13. Assumption Log

- リスク行は app 表示正常（4要素＝コンテンツ存在）でテスト側のみ修正で緑化見込み。
- e2e 実緑は CI（DB あり）で確認。ローカルは DB 不在で未実行＝ENV 依存。

## 14. Unknowns Log

- CI 再実行で **F1b** 該当行が確実に緑になるか（イベント詳細描画に依存）。
- C11件の内訳（planning_hokko:16 含む・F2 診断で確定）。

## 15. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | F1b 後もリスク行が別要因で赤 | 低 | CI 再実行で確認 |
| R2 | C11件未修正で **e2e** 全緑ならず | 中 | F2/F3 で対応（HOLD維持） |

## 16. Definition of Done

- **F1b**（リスク **strict-mode** 1件）を **tests-only** で適用／**F1** 結果（**59 passed** / **13 failed**）を roadmap35＋doc134 に記録／typecheck・lint 緑／旧曖昧セレクタ除去／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／commit-only（push なし）。

## 17. 次回推奨プロンプト案

> 「F1b push-only（別承認）で main へ反映→ **CI** の **stage3_e2e** を read-only 確認し、operations_exec:39 のリスク行が緑化したかを検証（13→12 見込み）。残 C11件は F2 診断ミッション（playwright html reporter+trace を ci.yml/config に追加＝別承認）で screenshot を取得し C/D 最終確定。schema/seed/runtime/外部送信は禁止。」

## 18. 判定

判定: **F1b 適用完了（tests-only・typecheck/lint 緑）＋F1 結果記録（59 passed / 13 failed）／CI_STAGE3_E2E_RED は C11件残存のため継続／Phase 3 進入は HOLD**。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は F1b push-only → CI 再実行で該当行緑を確認。
