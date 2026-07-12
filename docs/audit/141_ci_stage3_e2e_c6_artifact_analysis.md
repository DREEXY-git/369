# 141. CI Stage 3 E2E C6 artifact analysis — docs/roadmap/42 の記録（docs-only・369-vault非編集）

## 1. 非エンジニア向け要約

- CI で残っていた6件の失敗について、失敗時の証拠（画面の中身＝error-context、スクリーンショット、trace）を実際に開いて確認しました。
- **大きな訂正があります**。これまで「残6件はデータ不足（C=SEED_DATA_DRIFT）の疑い」としていましたが、証拠を見ると**データは足りていて、アプリも正常**でした。**6件はすべてテストの書き方の問題**でした。
- 内訳: 4件は「テストが案件詳細ページではなく『新規作成フォーム』を開いてしまっていた」（一覧の先頭リンクが『＋新規作成』だったのを掴んでいた、または作成手順で金額未入力のまま詳細に進めていなかった）＝テストのリンク選択の問題（A=TEST_SELECTOR_DRIFT）。2件は「テストが期待した文字（『対処:』『Golden Path — 現在地と次の一手』）が、そのページには別の言い回しで表示されていた」＝テストの期待文言のズレ（B=TEXT_EXPECTATION_DRIFT）。
- **本当のアプリ不具合（D=TRUE_APP_BUG）はゼロ**でした。とくに大事な点として、**スタッフ（財務権限なし）に原価・粗利などの機密の金額が漏れて見えていた事実はありません**。スタッフは作成フォームに留まっていて、金額はどこにも表示されていませんでした。社長は自分の権限どおり金額を見られており、これは正常です。
- したがって、**データ整備（F3 seed）やDB設計変更（schema）は不要**です。直すのは**テストだけ**（次の tests-only 修正、仮に F1e）で、CI は 66 passed / 6 failed から 72 passed / 0 failed へ緑化できる見込みです。
- ただし Phase 3 はまだ HOLD です。理由は、まだ e2e が赤（6件失敗）で回帰ゲートが緑になっていないためです。テストを直して緑にし、最後に人間が Phase Gate を承認するまで進みません。
- 今回はアプリ・テスト・データ・設定を**一切変えていません**（docs-only・記録のみ）。artifact の zip や展開物、スクリーンショット、trace は git に一切含めていません。**app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**。

## 2. 今回確認した artifact

- name: playwright-report・artifact ID: **8158827253**・run: **28919165959**（run_number 140）・18MB・54 files。チャット添付で到達し、read-only で /tmp へ展開（repo 内には展開せず・git add せず）。
- 6件すべてに error-context.md（ARIA スナップショット）・test-failed-1.png・trace.zip が存在。error-context.md を一次証跡、screenshot を補助とした。

## 3. 6件の分類サマリー

| # | spec:line | 分類 | 到達画面 | 機密漏えい | F3 seed |
|---|---|---|---|---|---|
| 1 | golden_path_actions:15 | **B=TEXT_EXPECTATION_DRIFT** | /dashboard/ceo（正常描画・`対処:`不在） | 非該当 | 不要 |
| 2 | operations:44 | **A=TEST_SELECTOR_DRIFT/setup** | /operations/events/new（作成フォーム） | なし | 不要 |
| 3 | planning_hokko:16 | **B=TEXT_EXPECTATION_DRIFT** | /planning-hokko（3案件・正常描画） | 非該当 | 不要 |
| 4 | planning_hokko:24 | **A=TEST_SELECTOR_DRIFT** | /operations/events/new | 非該当 | 不要 |
| 5 | planning_hokko:35 | **A=TEST_SELECTOR_DRIFT** | /operations/events/new | 非該当 | 不要 |
| 6 | planning_hokko:45 | **A=TEST_SELECTOR_DRIFT** | /operations/events/new（作成フォーム） | なし | 不要 |

**最終: C=SEED_DATA_DRIFT=0／D=TRUE_APP_BUG=0／F=INSUFFICIENT_EVIDENCE=0（redaction 描画正当性のみ残 F 論点）。真因は A=4／B=2＝すべて tests-only。**

## 4. 6件ごとの要点

- golden_path_actions:15: /dashboard/ceo が完全描画（KPI・「今すぐ見るべき案件」・推奨アクション）。`:18` の「今すぐ見るべき案件」は通過、`:20` の `対処:` が不在（`対処:` は /planning-hokko の描画）。→ 期待文言ドリフト。
- operations:44: スタッフが /operations/events/new（作成フォーム）に到達。社長の作成ステップが想定売上未入力＋`waitForURL('**/operations/events/**')` の race で url=/new を捕捉。機密値露出なし。→ selector/setup ドリフト。
- planning_hokko:16: /planning-hokko が3案件・KPI・`対処:`・`次の一手`・財務値まで完全描画。期待 literal `Golden Path — 現在地と次の一手` のみ不在。→ 期待文言ドリフト。
- planning_hokko:24/35/45: `page.locator('a[href^="/operations/events/"]').first()` が一覧先頭の「イベント案件を作成」(/new) リンクを掴み作成フォームへ。案件は seed に3件存在。→ selector ドリフト。
- planning_hokko:45: スタッフが /new に到達・機密値露出なし。

## 5. redaction / Security / HCG 影響

- redaction 2件（operations:44・planning_hokko:45）とも、スタッフは作成フォームに到達し **原価・粗利・金額いずれの機密値も露出していない**。**D重大（機密漏えい）は無し**。
- 社長は /planning-hokko で 売上/原価/粗利 を正当に閲覧（finance:read どおり・過剰表示ではない）。
- 失敗は表示系のみ。**Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系の失敗はゼロ＝安全中核ゲート（HCG/Consent/Security）影響なし。封印維持（`EXTERNAL_SEND_ENABLED=false`・**FakeLLM**・`externalAiAllowed` 既定 false・Suppression 強制）。

## 6. Phase 3 にまだ進めない理由

- **CI_STAGE3_E2E_RED** 継続（**66 passed / 6 failed**）。Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」が未達。残 C暫定6件（実際は tests-only 6件）が未解消で、**stage3_e2e** が failure のまま。最終 Phase Gate 承認も未実施。よって **Phase 3 は HOLD**。

## 7. Phase 3 に進むために必要なこと

1. **tests-only 修正（F1e・別承認）**で6件を緑化（selector で /new 除外・実案件リンク選択／operations:44 は想定売上入力＋waitForURL race 解消／golden_path_actions:15・planning_hokko:16 は期待文言をページ実在文言へ）。**F3 seed/schema は不要**。
2. push→CI で 66/6 → 72/0 を確認。
3. redaction 2件は detail 到達後に redaction メッセージが実際に描画されるか再検証（出なければ D として停止・人間承認）。
4. **stage3_e2e** を green にする。
5. 最終 **Phase 3 Phase Gate** を人間が承認する。

## 8. 今回やらなかったこと

- **app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし**・labels/company-brain-reference/leadmap/customers/approvals・**ci.yml変更なし**・**playwright.config.ts変更なし**・**package.json/lockfile変更なし**。
- artifact zip・展開物・screenshot・trace・test-results・playwright-report を git add せず。artifact blob URL の curl・network policy 回避なし。F3 seed に進まない。**runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・本番deployなし・**Phase 3 実装なし**・**369-vault非編集**・push なし（commit-only）。

## 9. Complete Function Coverage Matrix

- 直接: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 10. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| artifact 整合 | unzip -t = No errors・ID 8158827253・54 files | 有効 |
| golden_path_actions:15＝B | error-context: /dashboard/ceo 完全描画・`対処:` 不在 | text-drift |
| operations:44＝A/no-leak | error-context: staff /operations/events/new・機密値なし | selector/setup・漏えいなし |
| planning_hokko:16＝B | error-context: /planning-hokko 3案件・`Golden Path — 現在地と次の一手` 不在 | text-drift |
| planning_hokko:24/35/45＝A | error-context: /new 作成フォーム（`a[href^=…].first()`が/new） | selector-drift |
| planning_hokko:45 no-leak | error-context: staff /new・機密値なし | 漏えいなし |
| C=0/D=0 | 3案件・財務値・是正アクション描画・権限正当・漏えいなし | seed十分・アプリ健全 |
| 封印維持 | env fake/log/false | 送信・課金なし |

## 11. Assumption Log

- error-context.md（ARIA スナップショット）は失敗時点の実 DOM を反映するため C/D/F を確定できる。
- /operations/events 一覧の先頭 `a[href^="/operations/events/"]` は「新規作成」(/new)。案件は seed に3件存在（ID 確認済み）。よって selector drift であり seed 不足ではない。
- operations:44 は作成ステップ想定売上未入力＋waitForURL race で /new を捕捉。

## 12. Unknowns Log

- redaction 2件（operations:44・planning_hokko:45）の redaction メッセージ描画正当性は detail 未到達のため未検証（漏えいは無い・残 F 論点）。
- /operations/events 一覧そのものの ARIA は本 artifact に含まれず（案件存在は planning_hokko:16 で確認）。

## 13. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | detail 到達後に redaction が実は出ない（残 D 可能性） | 中 | F1e 後に redaction 2件を再検証（漏えいは現状なし） |
| R2 | 誤って F3 seed に着手（無駄・schema リスク） | 中 | 本書で C=0・F3 seed 不要を明記 |
| R3 | artifact 保持期限（7日）で再取得不可 | 低 | 証跡を docs に固定化 |
| R4 | stage3_e2e red 継続で Phase 3 HOLD 長期化 | 低 | tests-only（F1e）で緑化可能 |

## 14. Definition of Done

- artifact（ID 8158827253・run 28919165959）を read-only 展開し6件の error-context/screenshot を分析／**C=0・D=0・F=0（redaction 描画正当性は残 F 論点）・真因 A=4/B=2・機密漏えいなし**を確定／roadmap42＋doc141 に **docs-only** 記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／`git diff --check`・secret scan・safety green／**app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／artifact/展開物/screenshot/trace は git add せず／commit-only（push なし）。

## 15. 次回推奨プロンプト案

> 「F1e tests-only 修正ミッション（別承認）: doc141/roadmap42 で確定した tests-only 6件を e2e spec のみで最小修正。planning_hokko:24/35/45・operations:44 は一覧の実案件リンクを選ぶ（/new 除外）＋operations:44 は想定売上入力と waitForURL race 解消。golden_path_actions:15・planning_hokko:16 は期待文言をページ実在文言へ更新。app/seed/schema/ci.yml/playwright.config.ts 変更なし・typecheck/lint 緑・commit-only。push→CI で 66/6→72/0 を確認。detail 到達後に redaction 2件が実際に描画されるか確認し、出なければ D として停止・人間承認。369-vault非編集。」

## 16. 判定

判定: **C6 artifact 分析完了（C=0／D=0／F=0・redaction 描画正当性は残 F 論点／真因 A=TEST_SELECTOR_DRIFT・setup 4件＋B=TEXT_EXPECTATION_DRIFT 2件＝すべて tests-only／機密漏えいなし・アプリ健全・seed 十分）。重要訂正: 前分類「C暫定6件」は誤りで C=0。F3 seed/schema 変更は不要、tests-only（F1e）で 66/6→72/0 の緑化可能。CI_STAGE3_E2E_RED は 6 failed 残存で継続／Phase 3 進入は HOLD**。**app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・artifact blob URL curl なし・push なし（commit-only）。次は **F1e tests-only 修正**（別承認）。
