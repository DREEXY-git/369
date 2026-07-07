# 36. CI Stage 3 E2E F1b result and F1c Candidate（tests-only）

> 出典＝GitHub 正本 docs。これは **F1b** push 後の **CI** 実測結果の記録と、**F1c**（**e2e** spec 2本の **tests-only** 最小修正）です。app 本体・seed・schema・ci.yml は変更しません。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**・push なし（commit-only）。

## 1. 目的

doc134/roadmap35 で適用・push した **F1b** の **CI** 実測結果（run 28876766413）を記録し、残 **12 failed** のうち **tests-only** で解消できる **strict-mode** 2件（**FinanceEvent** / **入金実績**）を **F1c** として最小修正する。C=**SEED_DATA_DRIFT** 群は継続、**TRUE_APP_BUG** は 0 のまま。

## 2. 現在地の正

- GitHub 正本モノレポ `dreexy-git/369`。現在地は git refs を正とする。事業 Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**（残＝**stage3_e2e** 緑化＋最終人間 Phase Gate 承認）。Ledger R4 Commercial Core + R0 Governance Docs。EXTERNAL_SEND_ENABLED 既定 false・externalAiAllowed 既定 false・**FakeLLM** 決定論のまま不変。

## 3. F1b push後 CI結果

- CI run 28876766413（HEAD 4069fb6・run_number 134）: run=failure。**stage1 success**／**stage3_e2e failure**。
- 基盤ステップ（Initialize containers／checkout／install／Write CI .env／Generate Prisma／Apply migrations／Seed demo data／Build web／Install Playwright chromium）は全 success、**Run E2E** のみ failure。
- **Run E2E** = **60 passed** / **12 failed**（**CI_STAGE3_E2E_RED** / **PLAYWRIGHT_FAIL** 継続）。
- 直前（**F1b** 前 run 28873089407）= **59 passed** / **13 failed**。さらに前（**F1** 前 run 28860862696）= **57 passed** / **15 failed**。**F1b** 差分 = **+1 passed / −1 failed**（退行ゼロ）。

## 4. F1bで完了したこと

- operations_exec:39 の line46 `getByText('リスク',{exact:false})`（4要素一致=**strict-mode**）→ `getByRole('heading',{name:/リスク/}).first()` が **CI で緑化**を実証。
- これにより operations_exec.spec.ts は **:15 棚卸・:22 案件名・:39 人員配置/リスク すべて緑**＝**operations_exec spec 全緑**。失敗一覧から operations_exec 系は 0 件。

## 5. 残12件の分類更新

CI ログの実エラーで分類を精緻化した。残 **12 failed** の内訳:

| # | spec | エラー要旨 | 分類 |
|---|---|---|---|
| 1 | finance_bridge:15 | `getByText('FinanceEvent')` が3要素一致 | **A=TEST_SELECTOR_DRIFT**（新判明・F1c対象） |
| 2 | invoice_payment:25 | `getByText('入金実績')` が2要素一致 | **A=TEST_SELECTOR_DRIFT**（新判明・F1c対象） |
| 3 | dunning:15 | #dunning セクション不在 | C=**SEED_DATA_DRIFT** |
| 4 | dunning:50 | dunning_send ラベル不在 | C=**SEED_DATA_DRIFT** |
| 5 | executive_dashboard:15 | Golden Path KPI 不在 | C=**SEED_DATA_DRIFT** |
| 6 | executive_dashboard:37 | プランニングホッコー link 不在 | C=**SEED_DATA_DRIFT** |
| 7 | golden_path_actions:15 | 「対処:」不在 | C=**SEED_DATA_DRIFT** |
| 8 | operations:44 | 「原価・粗利は財務閲覧権限が必要です」不在 | C=**SEED_DATA_DRIFT** |
| 9 | planning_hokko:16 | Golden Path カード未描画 | C=**SEED_DATA_DRIFT** |
| 10 | planning_hokko:24 | Golden Path カード未描画 | C=**SEED_DATA_DRIFT** |
| 11 | planning_hokko:35 | 「粗利率」不在 | C=**SEED_DATA_DRIFT** |
| 12 | planning_hokko:45 | redaction 文言不在 | C=**SEED_DATA_DRIFT** |

- **本 F1c は #1・#2 の A=2件のみ**。C=10件は F2 診断→F3 データ整合へ。**D=TRUE_APP_BUG は 0** のまま。

## 6. F1cの対象

- 変更ファイルは E2E spec 2本のみ: `finance_bridge.spec.ts`・`invoice_payment.spec.ts`。
- app/seed/schema/ci.yml/package.json/lockfile は不変。

## 7. finance_bridge FinanceEvent strict-mode修正

- finance_bridge:19（テスト「Finance Bridge ダッシュボードが表示される」）: `getByText('FinanceEvent',{exact:false})` が3要素一致（`FinanceEvent` div／h3「直近の FinanceEvent」／「まだFinanceEventがありません」div）＝**strict-mode**。
- → `getByRole('heading', { name: '直近の FinanceEvent' })` に限定（セクション見出しへ厳密化）。app 表示正常（3要素＝コンテンツ存在）でテスト側のみ修正。

## 8. invoice_payment 入金実績 strict-mode修正

- invoice_payment:29（テスト「資金繰り画面に予定 vs 実績が表示される」）: `getByText('入金実績',{exact:false})` が2要素一致（`入金実績`／「直近30日 入金実績」）＝**strict-mode**。
- → `getByText('入金実績', { exact: true })` に限定（完全一致で単一要素へ）。app 表示正常でテスト側のみ修正。

## 9. 変更しなかったこと

- app 本体・seed・schema・migration・RBAC・labels・company-brain-reference・leadmap・customers・approvals・ci.yml・package.json・pnpm-lock.yaml・369-vault は不変。
- C=10件（**SEED_DATA_DRIFT**）は未修正（F2 診断→F3 データ整合へ）。
- **runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番なし・push なし。

## 10. 検証結果

- `pnpm --filter @hokko/web typecheck`（tsc --noEmit）= **exit 0**。
- `pnpm lint`（eslint）= **exit 0**。
- 旧曖昧セレクタ `getByText('FinanceEvent', { exact: false })`・`getByText('入金実績', { exact: false })` 除去 OK（grep = 0）。
- e2e 実走は ローカル DB/サーバー不在のため未実施＝**push 後の CI（stage3_e2e）で確認**。安全ゲート `node scripts/check-company-brain-safety.mjs` exit 0。AI境界は **FakeLLM** 決定論のまま不変（実LLMなし）。

## 11. Phase 3 Gateへの影響

- **CI_STAGE3_E2E_RED** は継続（C10件が未修正）。**F1**＋**F1b**＋**F1c** で A系7＋B系1 の原因を修正済み（CI 再実行で該当行緑化見込み・12→10 見込み）。
- Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」は C10件の解消（F2/F3）まで未達＝**Phase 3** 進入 **HOLD** 継続。
- 失敗は表示系で **Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系は緑（安全中核ゲート影響なし）。

## 12. ロードマップ上の現在地（10項目・明示見出し）

### 12-1. 現在のPhase
事業 Phase 2 CONDITIONAL COMPLETE／PDF 2.5／戦略 18.5-26 未突入／Ledger R4 Commercial Core + R0 Governance Docs。

### 12-2. 現在のPhaseで完了したこと
**F1b** push 後 **CI** 実測（**60 passed** / **12 failed**・operations_exec spec 全緑）を記録・**F1c**（**FinanceEvent** / **入金実績** の **strict-mode** 2件）を tests-only 最小修正・typecheck/lint 緑。

### 12-3. 現在のPhaseで未完了のこと
CI 再実行での **F1c** 該当2行緑確認（12→10 見込み）、C10件の F2 診断→F3 整合、**stage3_e2e** 緑化、最終 Phase Gate 承認。

### 12-4. 次に進むPhase
事業 **Phase 3** AI Growth Engine。

### 12-5. 次のPhaseへ進むために必ず完了すべきこと
F1c push→CI 該当2行緑→F2→F3 で **stage3_e2e** 緑＋最終 Phase Gate 承認。

### 12-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）
**HOLD**（**CI_STAGE3_E2E_RED** 継続）。

### 12-7. GO / HOLD の理由
**F1**〜**F1c** で A系7＋B系1は修正済みだが C10件が残り **e2e** 全緑ではないため **回帰ゲート** 未達。

### 12-8. 人間承認が必要な判断
F1c の push 承認（CI 再実行）、F2（ci/config 変更）承認、F3（seed 変更・schema 影響事前停止条件）承認。

### 12-9. 次Phaseに進む前にやってはいけないこと
**Phase 3** 実装／**runtime 解禁なし**／`externalAiAllowed` true 解禁／`EXTERNAL_SEND_ENABLED` true 解禁／**外部送信なし**／実LLM／AIコスト／本番確認／本番deploy／**schema変更なし**／**migrationなし**／**RBAC変更なし**／**ci.yml変更なし**／**369-vault非編集**。

### 12-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか
`tasks/CURRENT_STATE.md`（bullet 1件）・`tasks/PROGRESS.md`（節1件）・`docs/roadmap/36`（本書）・`docs/audit/135`（記録）・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（行1件）。**369-vault非編集**。

## 13. Complete Function Coverage Matrix（50カテゴリ）

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

## 14. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| **F1b** push 後 CI 実測 | run 28876766413・**Run E2E** | **60 passed** / **12 failed**（**stage1 success**／**stage3_e2e failure**） |
| **F1b** 前後差分 | 59 passed / 13 failed → 60/12 | +1 passed / −1 failed |
| operations_exec spec 全緑 | 失敗一覧に operations_exec 系 0件 | 緑化 |
| F1c **FinanceEvent** 修正 | finance_bridge:19 diff | `getByRole('heading',{name:'直近の FinanceEvent'})` 化 |
| F1c **入金実績** 修正 | invoice_payment:29 diff | `{exact: true}` 化 |
| 旧曖昧セレクタ除去 | grep = 0 | OK |
| typecheck / lint | `pnpm ...` | exit 0 |
| 封印維持 | app/seed/ci.yml 無変更・safety exit 0 | 送信・課金なし |

## 15. Assumption Log

- #1・#2 は app 表示正常（複数要素＝コンテンツ存在）でテスト側 heading/exact 限定のみで緑化見込み。
- e2e 実緑は CI（DB あり）で確認。ローカルは DB 不在で未実行＝ENV 依存。

## 16. Unknowns Log

- CI 再実行で **F1c** 該当2行が確実に緑になるか（ダッシュボード描画に依存）。
- C10件（Golden Path カード・対処:・粗利率・redaction・各リンク）の C/D 断定は F2 の trace/screenshot 待ち（現状 reporter 未設定で screenshot なし）。

## 17. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | F1c 後も2件が別要因で赤 | 低 | CI 再実行で確認 |
| R2 | C10件未修正で **e2e** 全緑ならず | 中 | F2/F3 で対応（HOLD維持） |
| R3 | reporter 未設定で C/D 断定不可 | 低 | F2 で trace/screenshot 追加 |

## 18. Definition of Done

- **F1c**（**FinanceEvent** / **入金実績** の **strict-mode** 2件）を **tests-only** で適用／**F1b** 結果（**60 passed** / **12 failed**・operations_exec 全緑）を roadmap36＋doc135 に記録／typecheck・lint 緑／旧曖昧セレクタ除去／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／commit-only（push なし）。

## 19. 次回推奨プロンプト案

> 「F1c push-only（別承認）で main へ反映→ **CI** の **stage3_e2e** を read-only 確認し、finance_bridge:15・invoice_payment:25 が緑化したかを検証（12→10 見込み）。残 C10件は F2 診断ミッション（playwright html reporter+trace を ci.yml/config に追加＝別承認）で screenshot を取得し C/D 最終確定。schema/seed/runtime/外部送信は禁止。」

## 20. 判定

判定: **F1c 適用完了（tests-only・typecheck/lint 緑）＋F1b 結果記録（60 passed / 12 failed・operations_exec 全緑）／CI_STAGE3_E2E_RED は C10件残存のため継続／Phase 3 進入は HOLD**。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は F1c push-only → CI 再実行で該当2行緑を確認。
