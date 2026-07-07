# 131. CI Stage 3 E2E failure triage — docs/roadmap/32 の記録（docs-only・369-vault非編集）

## 1. 非エンジニア向け要約

- 今回は、CI に足した「画面通しテスト（e2e）」が **72本中15本失敗**した件を、コードを**一切変えず**に1件ずつ原因分類した回です。修正ではありません。
- 良い点: 使い捨てDB・データ投入・ビルド・ブラウザ導入などの**土台はすべて成功**（**migrate success** / **seed success** / **build success**）。落ちたのは**テスト本体だけ**（**57 passed** / **15 failed**）＝**PLAYWRIGHT_FAIL**。CI 設定や環境の問題ではありません。
- 失敗15本の内訳: (A) **同じ言葉が画面の2か所にあってテストが迷う**タイプ（strict-mode）＝3本（棚卸・人員配置・案件名）。これは**テスト側の軽い直しで解決**。(B〜D) **期待する文字が見つからない**タイプ＝12本（経営ダッシュボード・資金繰り・案件詳細などの表示）。これは「画面の言葉が変わった／テスト用データの前提ズレ／稀に本当の不具合」の混在で、**1本ずつの精査が必要**。
- 大事な点: 失敗はすべて **operations（在庫・イベント）・planning・finance・dunning の表示画面**で、**Customer一覧・LocalBusinessLead・Contact・SuppressionList などの機密・同意・CRM閲覧統制（Phase 3 の安全の要）は全部合格**でした。
- **実装なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし。**369-vault非編集**。判定 **CI_STAGE3_E2E_RED / PLAYWRIGHT_FAIL / HOLD**。

## 2. 今回作成したdocs

- `docs/roadmap/32_ci_stage3_e2e_failure_triage_candidate.md`（28見出し・§13 現在地10項目・§14 50カテゴリ Matrix・§7 15失敗一覧・§8-10 分類）。
- `docs/audit/131_ci_stage3_e2e_failure_triage.md`（本書・15見出し）。

## 3. 現在地の実測結果

- 事業 Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**（残＝**e2e** 緑化＋最終 **人間 Phase Gate 承認**）。Ledger **R4 Commercial Core** + **R0 Governance Docs**。現在地は git refs を正とする。
- CI run 28860862696（HEAD 1e8bcd1）: **stage1 success** / **stage3_e2e failure**。基盤（**migrate success** / **seed success** / **build success** / browser install）全成功、**Run E2E** のみ失敗＝**57 passed** / **15 failed**。

## 4. CI結果の要約

- **CI_STAGE3_E2E_RED / PLAYWRIGHT_FAIL**。環境/CI 設定は正常（ENV_RELATED=0）。失敗は e2e テスト本体のアサーション15件。封印維持（`EXTERNAL_SEND_ENABLED=false`・**FakeLLM**・`externalAiAllowed` 既定false・**runtime 解禁なし**）。

## 5. 失敗分類

- **A: TEST_SELECTOR_DRIFT（strict-mode）= 3件確定**: operations_exec:15（棚卸）・operations_exec:39（人員配置）・operations:22（案件名）。ロケータが2要素に一致＝**expected text** の曖昧さ。修正はテスト spec のみ・低リスク。
- **B: TEXT_EXPECTATION_DRIFT / C: SEED_DATA_DRIFT / D: TRUE_APP_BUG = 12件（要精査）**: dunning:15/50・executive_dashboard:15/37・finance_bridge:15・golden_path_actions:15・invoice_payment:25・operations:44・planning_hokko:16/24/35/45。UI 文言 or seed 前提 or 権限/表示の切り分けを read-only 深掘りで確定。
- **E: ENV_RELATED = 0**（基盤全成功のため該当なし）。
- 失敗領域に **Customer一覧 / LocalBusinessLead / Contact / SuppressionList** 系は**ゼロ**。

## 6. Phase 3 移行条件への影響

- Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」未達＝**Phase 3** 進入 **HOLD** 継続。
- ただし失敗は表示系15件で、機密・同意・CRM閲覧統制の e2e は緑＝安全中核ゲート（HCG/Consent/Security）に影響なし。解除には15件修正→**CI** で **stage3_e2e** 緑＋最終 Phase Gate 承認。

## 7. 今回やらなかったこと

- E2E/Playwright/UI/seed 修正なし・**schema変更なし**・**migrationなし**・**RBAC変更なし**・labels変更なし・company-brain-reference変更なし・leadmap/customers/approvals/ci.yml/package.json/lockfile 変更なし。
- **runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・本番deploy なし・**369-vault非編集**・push なし（commit-only）。

## 8. Complete Function Coverage Matrix

- 直接: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 9. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| run failure | actions run 28860862696 | failure |
| **stage1 success** | job 85598812855 | success |
| 基盤全成功 | **migrate success**/**seed success**/**build success** | success |
| **stage3_e2e failure** | 「**Run E2E**」step | failure |
| サマリ | **57 passed** / **15 failed** | 72本中15赤 |
| strict-mode 3件 | 棚卸/人員配置/案件名 | TEST_SELECTOR_DRIFT |
| 封印維持 | `EXTERNAL_SEND_ENABLED=false`/**FakeLLM** | 送信・課金なし |

## 10. Assumption Log

- 失敗15件は **CI** 未組込だった **e2e** の drift（初実行で可視化）。CI 実装の不具合ではない。
- A（3件）はテスト側確定。B/C/D は未確定（spec 精査で確定）。

## 11. Unknowns Log

- 12件（B/C/D）それぞれの root-cause（UI 文言 / seed / 権限 / 真の不具合）。
- seed が各ダッシュボードの前提エンティティを十分作るか。
- Node20 非推奨警告の対応要否。

## 12. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | **e2e** red のまま Phase 3 進入 | 中 | HOLD維持で回避 |
| R2 | 12件に真のアプリ不具合（D）混在 | 中 | read-only 深掘りで確定 |
| R3 | seed 整合が schema/seed 変更に波及 | 中 | 事前停止条件で別承認化 |

## 13. Definition of Done

- 15失敗を read-only で分類（A確定3・B/C/D要精査12・E=0）／修正優先度整理／roadmap32＋doc131 作成／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**369-vault非編集**／**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**／**外部送信なし**・**実LLMなし**・**AIコストなし**／実装なし・commit-only（push なし）。

## 14. 次回推奨プロンプト案

> 「`/workspace/369` で e2e 15失敗を spec ごとに read-only 深掘り（UI 実表示・seed・権限を突合）し、A/B/C/D を確定した修正計画を doc132/roadmap33 に docs-only 記録。まず A の3件（**strict-mode**）の最小テスト修正案を提示（実装は承認後の別ミッション）。schema/RBAC/runtime/外部送信は禁止。」

## 15. 判定

判定: **CI_STAGE3_E2E_RED / PLAYWRIGHT_FAIL**（**stage1 success** / **migrate success** / **seed success** / **build success** / **Run E2E** = **57 passed** / **15 failed**）。**Phase 3** 進入は **HOLD**。**実装なし**・**runtime 解禁なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は e2e 15件の root-cause 深掘り→修正計画（別承認）。
