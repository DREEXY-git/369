# 34. CI Stage 3 E2E F1 test fix Candidate（tests-only）

> 出典＝GitHub 正本 docs。これは **tests-only の最小修正**（E2E テスト spec のみ）であり、app 本体・seed・schema・ci.yml は変更しません。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**・push なし（commit-only）。

## 1. 目的

doc132/roadmap33 の **root-cause** 計画で確定した **F1**（A=**TEST_SELECTOR_DRIFT** 3件＋B=**TEXT_EXPECTATION_DRIFT** 1件）を、**tests-only** の最小修正として適用する。C=**SEED_DATA_DRIFT** 11件・D=**TRUE_APP_BUG**（0）は本 F1 の対象外（F2/F3 へ）。

## 2. 現在地の正

- GitHub 正本モノレポ `dreexy-git/369`。現在地は git refs を正とする。事業 Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**（残＝**stage3_e2e** 緑化＋最終人間 Phase Gate 承認）。Ledger R4 Commercial Core + R0 Governance Docs。

## 3. doc132から引き継ぐ分類

- CI run 28860862696: **stage3_e2e** failure・**Run E2E** = **57 passed** / **15 failed**（**CI_STAGE3_E2E_RED** / **PLAYWRIGHT_FAIL**）。
- 分類: A=3（**strict-mode**）/B=1（**expected text** ドリフト）/C=11（**SEED_DATA_DRIFT** 優勢）/D=0（**TRUE_APP_BUG** 証跡なし）/E=0。
- 本 F1 は A3＋B1 の4件のみ。

## 4. F1の修正範囲

- 変更ファイルは E2E spec 3本のみ: `operations_exec.spec.ts`・`operations.spec.ts`・`planning_hokko_golden_path.spec.ts`。
- app/seed/schema/ci.yml/package.json/lockfile は不変。

## 5. operations_exec strict-mode 修正

- 棚卸（operations_exec:15/#8）: `getByRole('heading',{name:/棚卸/})`（h1「棚卸（実地在庫照合）」＋h3「棚卸を開始」の2要素一致＝**strict-mode**）→ `getByRole('heading',{name:'棚卸（実地在庫照合）'})` に厳密化。
- 人員配置（operations_exec:39/#9）: `getByText('人員配置',{exact:false})`（span＋h3「人員配置（0）」の2要素）→ `getByRole('heading',{name:/人員配置/}).first()` に限定。
- **app 表示は正常**（2要素＝コンテンツ存在）。テスト側の **expected text** の曖昧さのみ修正。

## 6. operations strict-mode 修正

- イベント案件（operations:22/#10）: `getByText('E2Eテスト案件')`（link＋h1の2要素＝**strict-mode**）→ `getByRole('heading',{name:'E2Eテスト案件'})` に限定。
- 同テスト内の粗利サマリー `getByText('粗利率')` も同種 **strict-mode** 回避のため `.first()` を付与（同一テスト #10 を緑化するための最小・同カテゴリ追加。app 変更なし）。

## 7. planning_hokko expected text 修正

- planning_hokko:16（#12）: 期待文言「現在地と次の一手（Golden Path）」は app に不在（**TEXT_EXPECTATION_DRIFT**）。app 実文言「Golden Path — 現在地と次の一手」へ更新。**app 変更なし**（テスト期待値のみ）。

## 8. 変更しなかったこと

- app 本体・seed・schema・migration・RBAC・labels・company-brain-reference・leadmap・customers・approvals・ci.yml・package.json・pnpm-lock.yaml・369-vault は不変。
- C=11件（**SEED_DATA_DRIFT** 優勢）は未修正（F2 診断→F3 データ整合へ）。
- **runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番なし・push なし。

## 9. 検証結果

- `pnpm --filter @hokko/web typecheck`（tsc --noEmit）= **exit 0**。
- `pnpm lint`（eslint）= **exit 0**。
- e2e 実走は ローカル DB/サーバー不在のため未実施＝**push 後の CI（stage3_e2e）で確認**。安全ゲート `node scripts/check-company-brain-safety.mjs` exit 0。AI境界は **FakeLLM** 決定論のまま不変（実LLMなし）。

## 10. Phase 3 Gateへの影響

- **CI_STAGE3_E2E_RED** は継続（C11件が未修正）。本 F1 で A3＋B1 の4件の**原因は修正済み**（CI 再実行で該当4件緑化見込み）。
- Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」は C11件の解消（F2/F3）まで未達＝**Phase 3** 進入 **HOLD** 継続。
- 失敗は表示系で **Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系は緑（安全中核ゲート影響なし）。

## 11. ロードマップ上の現在地（10項目・明示見出し）

### 11-1. 現在のPhase
事業 Phase 2 CONDITIONAL COMPLETE／PDF 2.5／戦略 18.5-26 未突入／Ledger R4 Commercial Core + R0 Governance Docs。

### 11-2. 現在のPhaseで完了したこと
**F1**（A3＋B1）の tests-only 最小修正を適用・typecheck/lint 緑。

### 11-3. 現在のPhaseで未完了のこと
CI 再実行での該当4件緑確認、C11件の F2 診断→F3 整合、**stage3_e2e** 緑化、最終 Phase Gate 承認。

### 11-4. 次に進むPhase
事業 **Phase 3** AI Growth Engine。

### 11-5. 次のPhaseへ進むために必ず完了すべきこと
F1 push→CI 該当4件緑→F2→F3 で **stage3_e2e** 緑＋最終 Phase Gate 承認。

### 11-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）
**HOLD**（**CI_STAGE3_E2E_RED** 継続）。

### 11-7. GO / HOLD の理由
F1 で4件は修正済みだが C11件が残り **e2e** 全緑ではないため **回帰ゲート** 未達。

### 11-8. 人間承認が必要な判断
F1 の push 承認（CI 再実行）、F2（ci/config 変更）承認、F3（seed 変更・schema 影響事前停止条件）承認。

### 11-9. 次Phaseに進む前にやってはいけないこと
**Phase 3** 実装／**runtime 解禁なし**／`externalAiAllowed` true 解禁／`EXTERNAL_SEND_ENABLED` true 解禁／**外部送信なし**／実LLM／AIコスト／本番確認／本番deploy／**schema変更なし**／**migrationなし**／**RBAC変更なし**／**ci.yml変更なし**／**369-vault非編集**。

### 11-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか
`tasks/CURRENT_STATE.md`（bullet 1件）・`tasks/PROGRESS.md`（節1件）・`docs/roadmap/34`（本書）・`docs/audit/133`（記録）・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（行1件）。**369-vault非編集**。

## 12. Complete Function Coverage Matrix（50カテゴリ）

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

## 13. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| A3件 **strict-mode** 修正 | operations_exec:15/39・operations:22 diff | heading/exact/`.first()` 化 |
| B1件 **expected text** 更新 | planning_hokko:16 diff | 実文言へ |
| 旧文言除去 | grep「現在地と次の一手（Golden Path）」= 0 | OK |
| typecheck | `pnpm --filter @hokko/web typecheck` | exit 0 |
| lint | `pnpm lint` | exit 0 |
| 封印維持 | app/seed/ci.yml 無変更・safety exit 0 | 送信・課金なし |

## 14. Assumption Log

- A3件は app 表示正常（2要素＝コンテンツ存在）でテスト側のみ修正で緑化見込み。
- operations:22 の粗利率 `.first()` は同テストを緑化するための同カテゴリ最小追加（app 変更なし）。
- e2e 実緑は CI（DB あり）で確認。ローカルは DB 不在で未実行。

## 15. Unknowns Log

- CI 再実行で該当4件が確実に緑になるか（特に operations:22 は案件作成後の描画に依存）。
- C11件の内訳（F2 診断で確定）。

## 16. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | F1 後も4件のうち一部が別要因で赤 | 低 | CI 再実行で確認 |
| R2 | C11件が未修正で **e2e** 全緑にならない | 中 | F2/F3 で対応（HOLD維持） |

## 17. Definition of Done

- **F1**（A3＋B1）を **tests-only** で適用／旧文言除去 OK／typecheck・lint 緑／roadmap34＋doc133 記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／commit-only（push なし）。

## 18. 次回推奨プロンプト案

> 「F1 push-only（別承認）で main へ反映→ CI の **stage3_e2e** を read-only 確認し、該当4件（operations_exec:15/39・operations:22・planning_hokko:16）が緑化したかを検証。残 C11件は F2 診断ミッション（playwright html reporter+trace を ci.yml/config に追加＝別承認）で screenshot を取得し C/D 最終確定。schema/seed/runtime/外部送信は禁止。」

## 19. 判定

判定: **F1 適用完了（tests-only・typecheck/lint 緑）／CI_STAGE3_E2E_RED は C11件残存のため継続／Phase 3 進入は HOLD**。**app変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は F1 push-only → CI 再実行結果確認。
