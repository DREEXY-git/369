# 136. CI Stage 3 E2E F1c result — docs/roadmap/37 の記録（docs-only・369-vault非編集）

## 1. 非エンジニア向け要約

- 前回テスト側で直した2本（**F1c**）を GitHub に反映し、**CI** の画面通しテスト（**e2e**）を実際に走らせた結果を記録した回です。結果は **62 passed** / **10 failed**（**F1c** 前は **60 passed** / **12 failed**）＝**着実に2本改善・悪化ゼロ**。
- **F1c** の2本（**FinanceEvent** と **入金実績** の「同じ言葉が画面に複数ある＝**strict-mode**」）は**両方とも緑**になり、失敗一覧から消えました。
- これで「テストの書き方の問題（**strict-mode** / 文言ズレ）」は**全部片付き**、残る10本は**すべて「テスト用データが足りず画面に要素が出ない（＝C=SEED_DATA_DRIFT）」**という1種類に収束しました。**真のアプリ不具合（TRUE_APP_BUG）は0件**のまま。機密・同意・CRM閲覧統制系は緑のまま。
- 今回はアプリ本体・テスト・データ・設定は**一切変えていません**（**docs-only**）。結果を記録しただけです。
- 次は **F2 診断**（画面のスクリーンショット/traceを取る仕組みを CI に足す＝別のご承認）で、残10本が「データ不足（C）」か「本当の不具合（D）」かを最終確定します。
- **app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・本番確認なし・369-vault非編集**。判定 **F1c 結果記録完了／CI_STAGE3_E2E_RED 継続／Phase 3 HOLD**。

## 2. 今回作成したdocs

- `docs/roadmap/37_ci_stage3_e2e_f1c_result_candidate.md`（25見出し・§13 サブ10個）。
- `docs/audit/136_…`（本書・15見出し）。
- 更新: `tasks/CURRENT_STATE.md`・`tasks/PROGRESS.md`・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`。

## 3. F1c push後 CI結果

- CI run 28879821278（HEAD c2d07c5・run_number 135）: **stage1 success**／**stage3_e2e failure**。基盤ステップ（migrate/seed/build/browser）は全 success、**Run E2E** のみ failure。
- **Run E2E** = **62 passed** / **10 failed**（**CI_STAGE3_E2E_RED** / **PLAYWRIGHT_FAIL** 継続）。
- 差分: **F1c** 前 = **60 passed** / **12 failed**（+2 passed / −2 failed）。
- env 維持: `LLM_PROVIDER: fake`・`MAIL_PROVIDER: log`・`EXTERNAL_SEND_ENABLED: false`。

## 4. F1c対象2件の結果

1. finance_bridge:15 **FinanceEvent** strict-mode → `getByRole('heading',{name:'直近の FinanceEvent'})`＝**緑化**（失敗一覧から消滅）。
2. invoice_payment:25 **入金実績** strict-mode → `getByText('入金実績',{exact:true})`＝**緑化**（失敗一覧から消滅）。
- 両ターゲット成功。A=**TEST_SELECTOR_DRIFT** は F1/F1b/F1c で計7件すべて緑化＝完全消化。

## 5. 残10件の分類

- dunning:15・dunning:50・executive_dashboard:15・executive_dashboard:37・golden_path_actions:15・operations:44・planning_hokko:16・planning_hokko:24・planning_hokko:35・planning_hokko:45。
- 全 10件が element-not-found 型＝C=**SEED_DATA_DRIFT**（前提データ不足・「一覧→先頭クリック→詳細アサート」型）。A=**strict-mode**=0・B=文言=0・**TRUE_APP_BUG**=0・E=ENV=0。
- security.spec は passed（権限 redact 機能は動作）。redaction テスト失敗は前提イベント未生成であり機密漏えいではない。

## 6. Phase 3 移行条件への影響

- **CI_STAGE3_E2E_RED** は C10件残存で継続。Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」は未達＝**Phase 3** 進入 **HOLD** 継続。
- 失敗は表示系で **Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系は緑（安全中核ゲート影響なし）。

## 7. 今回やらなかったこと

- **app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし**・labels変更なし・company-brain-reference変更なし・leadmap/customers/approvals・**ci.yml変更なし**・package.json/lockfile 変更なし。
- F2 診断・F3 データ整合は未着手（別承認）。**runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。封印維持（**FakeLLM** 決定論・`EXTERNAL_SEND_ENABLED=false`・`externalAiAllowed` 既定 false・Suppression 送信ゲート強制）。

## 8. Complete Function Coverage Matrix

- 直接: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 9. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| **F1c** push 後 CI 実測 | run 28879821278・**Run E2E** | **62 passed** / **10 failed** |
| **F1c** 前後差分 | 60 passed / 12 failed → 62/10 | +2 passed / −2 failed |
| **FinanceEvent** 緑化 | 失敗一覧に finance_bridge 系 0件 | 緑化 |
| **入金実績** 緑化 | 失敗一覧に invoice_payment 系 0件 | 緑化 |
| 残10件 | ログ「10 failed」一覧 | 全て C=**SEED_DATA_DRIFT** |
| 封印維持 | env `LLM_PROVIDER: fake`・`EXTERNAL_SEND_ENABLED: false` | 送信・課金なし |

## 10. Assumption Log

- 残10件は前提データ不足（C=**SEED_DATA_DRIFT**）が濃厚。F2 の trace/screenshot で C/D 最終確定。
- 期待文言は app に存在（doc132 突合済み）ため **TRUE_APP_BUG** は 0 と仮定。

## 11. Unknowns Log

- 残10件が seed 不足（C）か描画不具合（D）かの最終確定（F2 待ち・現状 reporter 未設定で screenshot なし）。
- F3 が schema/migration に波及するか（事前停止条件で担保）。

## 12. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | 残10件が F3（seed 整合）で schema 影響に達する | 中 | 事前停止条件で担保（HOLD維持） |
| R2 | reporter 未設定で C/D 断定不可 | 低 | F2 で trace/screenshot 追加 |
| R3 | C10件未解消で **e2e** 全緑ならず | 中 | F2→F3 で対応（HOLD維持） |

## 13. Definition of Done

- **F1c** 結果（**62 passed** / **10 failed**・**FinanceEvent** / **入金実績** 緑化・残10件 C=**SEED_DATA_DRIFT** 収束・**TRUE_APP_BUG** 0）を roadmap37＋doc136 に **docs-only** 記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／commit-only（push なし）。

## 14. 次回推奨プロンプト案

> 「F2 診断ミッション（別承認）: playwright html reporter + trace を ci.yml/playwright.config に追加→ push 後の CI で残 C10件の screenshot/trace を取得し C（データ前提）か D（真の不具合）を最終確定。schema/seed/runtime/外部送信は禁止。」

## 15. 判定

判定: **F1c 結果記録完了（docs-only・62 passed / 10 failed・FinanceEvent/入金実績 緑化・残10件 C=SEED_DATA_DRIFT 収束・TRUE_APP_BUG 0）／CI_STAGE3_E2E_RED は C10件残存で継続／Phase 3 進入 HOLD**。**app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は F2 診断（別承認）。
