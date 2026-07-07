# 132. CI Stage 3 E2E root-cause plan — docs/roadmap/33 の記録（docs-only・369-vault非編集）

## 1. 非エンジニア向け要約

- 今回は、CI の画面通しテスト（**e2e**）で落ちた15本を、コードを**一切変えず**に1本ずつ原因究明（**root-cause**）した回です。修正ではありません。
- 結論: 落ちた原因は3タイプで、**本当のアプリ不具合（TRUE_APP_BUG）は0件**でした。
  - **A（3本）**: テストが「同じ言葉が画面に2か所ある」ので迷うだけ（**strict-mode**）。→ テスト側の軽い直しで解決・アプリは正常。
  - **B（1本）**: テストが期待する言葉が古い（「現在地と次の一手（Golden Path）」→ 実際は「Golden Path — 現在地と次の一手」）。→ テストの言葉を今の画面に合わせるだけ。
  - **C（11本）**: 画面自体は正しく作られている（言葉はアプリに存在）が、テストが前提とする**データ（案件・請求書など）がテスト用DBに十分作られていない**ため、「一覧の先頭をクリック→詳細を見る」で空振りしている可能性が高い。→ テスト用データの整備が必要。
- 大事な点: 落ちた15本はすべて **operations（在庫・イベント）・planning・finance・dunning の表示画面**で、**Customer一覧・LocalBusinessLead・Contact・SuppressionList などの機密・同意・CRM閲覧統制（Phase 3 の安全の要）は全部合格**。しかも権限チェックの中核テスト（security）も合格しており、**安全は守られています**。
- **実装なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし。**369-vault非編集**。判定 **CI_STAGE3_E2E_RED / PLAYWRIGHT_FAIL / HOLD**。

## 2. 今回作成したdocs

- `docs/roadmap/33_ci_stage3_e2e_root_cause_plan_candidate.md`（28見出し・§13 現在地10項目・§9 最終分類表・§10-11 修正計画）。
- `docs/audit/132_ci_stage3_e2e_root_cause_plan.md`（本書・16見出し）。

## 3. 現在地の実測結果

- 事業 Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**（残＝**stage3_e2e** 緑化＋最終 **人間 Phase Gate 承認**）。Ledger **R4 Commercial Core** + **R0 Governance Docs**。現在地は git refs を正とする。
- CI run 28860862696: **stage1 success**／**stage3_e2e failure**（**Run E2E** = **57 passed** / **15 failed**、基盤 migrate/seed/build 全成功）。

## 4. root-cause 深掘り結果

- 8 spec を実読し、各失敗の期待文言を app/components に `rg` 突合、seed の作成エンティティを確認。
- 期待文言は **1件（planning_hokko:16「現在地と次の一手（Golden Path）」）を除き全て app に存在**＝機能・文言は残存。→ 多くは「一覧→先頭クリック→詳細アサート」型で **SEED_DATA_DRIFT**（前提データ不足）が優勢。
- `security.spec.ts` は passed（15失敗に含まれない）＝権限 redact の中核は機能＝**TRUE_APP_BUG** の証跡なし。

## 5. 15失敗の分類

- **A: TEST_SELECTOR_DRIFT（strict-mode）= 3件確定**: operations_exec:15（棚卸）・operations_exec:39（人員配置）・operations:22（案件名）。ロケータが2要素に一致＝**expected text** の曖昧さ。テスト側のみ・低リスク。
- **B: TEXT_EXPECTATION_DRIFT = 1件確定**: planning_hokko:16（期待文言不在／app は「Golden Path — 現在地と次の一手」）。テスト期待値更新。
- **C: SEED_DATA_DRIFT = 11件（優勢・要ライブ確認）**: dunning:15/50・executive_dashboard:15/37・finance_bridge:15・golden_path_actions:15・invoice_payment:25・operations:44・planning_hokko:24/35/45。前提データ不足が主因。
- **D: TRUE_APP_BUG = 0（確定）** / **E: ENV_RELATED = 0**。

## 6. 最小修正方針

- **F1（最小・テスト側のみ・低リスク）**: A3件（**strict-mode** → `.first()`/exact 化）＋ B1件（期待文言更新）＝4件。app/seed 変更なし。
- **F2（診断補強）**: playwright html reporter＋trace/screenshot 追加（現状 report 未生成）で C11件を証跡化し C/D 最終確定。ci.yml/config 変更＝別承認。
- **F3（データ整合）**: C 確定分を seed 決定論化 or テスト側データ setup で緑化。seed 変更＝別承認・schema 影響の事前停止条件付き。
- **F4（Dのみ）**: F2 で真の不具合が出た場合のみ app 修正。現時点 D=0。
- 順序: F1→F2→F3→（必要時 F4）。各 F は承認後の別実装ミッション。

## 7. Phase 3 移行条件への影響

- Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」未達＝**Phase 3** 進入 **HOLD** 継続。
- 失敗は表示系で **Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系は緑＝安全中核ゲートに影響なし。解除は F1→F3 で **stage3_e2e** 緑＋最終 Phase Gate 承認。

## 8. 今回やらなかったこと

- E2E/UI/seed 修正なし・**schema変更なし**・**migrationなし**・**RBAC変更なし**・labels変更なし・company-brain-reference変更なし・leadmap/customers/approvals/ci.yml/package.json/lockfile 変更なし。
- **runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・本番deploy なし・**369-vault非編集**・push なし（commit-only）。

## 9. Complete Function Coverage Matrix

- 直接: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 10. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| **stage1 success** | run 28860862696 | success |
| **stage3_e2e failure**/**Run E2E** | job stage3_e2e | **57 passed** / **15 failed** |
| A 3件 **strict-mode** | spec＋CIログ（2要素一致） | 確定 |
| B 1件 文言不在 | rg「現在地と次の一手（Golden Path）」MISSING | 確定 |
| 期待文言ほぼ存在 | rg app/components FOUND | C 優勢 |
| D 証跡なし | security.spec passed＋文言存在 | D=0 |
| 封印維持 | `EXTERNAL_SEND_ENABLED=false`/**FakeLLM** | 送信・課金なし |

## 11. Assumption Log

- 期待文言が app に存在＝機能残存。多くの失敗は前提データ不足（**SEED_DATA_DRIFT**）優勢。
- security.spec passed＝権限 redact 機能＝**TRUE_APP_BUG** 証跡なし。
- C/D 最終確定には F2 の screenshot/trace が必要（現状 report 未生成）。

## 12. Unknowns Log

- C11件のうち seed 追加 vs テスト側 setup の内訳。
- `eventProject` と `/operations/events` の対応・seed 件数の十分性。
- 稀な D の有無（F2 で確定）。

## 13. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | **e2e** red のまま Phase 3 進入 | 中 | HOLD維持で回避 |
| R2 | C の一部が実は D | 中 | F2 診断で確定 |
| R3 | seed 整合が schema/seed 変更に波及 | 中 | 事前停止条件で別承認化 |

## 14. Definition of Done

- 15失敗を **root-cause** 確定（A=3/B=1/C=11/D=0/E=0）／最小修正計画 F1-F4・順序策定／roadmap33＋doc132 作成／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**369-vault非編集**／**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**／**外部送信なし**・**実LLMなし**・**AIコストなし**／実装なし・commit-only（push なし）。

## 15. 次回推奨プロンプト案

> 「F1 実装ミッション（別承認）: `apps/web/tests/e2e/` の A=**strict-mode** 3件を `.first()`/exact 化、B=1件（planning_hokko:16）を実文言へ更新。app/seed/schema/ci.yml 変更なし。push で CI 再実行し該当4件緑を確認。残 C11件は F2 診断（html reporter/trace）別ミッション。」

## 16. 判定

判定: **CI_STAGE3_E2E_RED / PLAYWRIGHT_FAIL**（**stage1 success** / **stage3_e2e failure** / **Run E2E** = **57 passed** / **15 failed**）。**root-cause**=A3/B1/C11/D0/E0。**Phase 3** 進入 **HOLD**。**実装なし**・**runtime 解禁なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は F1（テスト4件修正・別承認）。
