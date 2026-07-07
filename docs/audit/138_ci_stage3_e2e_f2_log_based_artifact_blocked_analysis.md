# 138. CI Stage 3 E2E F2 log-based artifact-blocked analysis — docs/roadmap/39 の記録（docs-only・369-vault非編集）

## 1. 非エンジニア向け要約

- **F2** で仕込んだ「失敗時の証拠（**screenshot**/**trace**/**html report**）」は CI 上で確かに作られ、**artifact**（playwright-report・29.9MB）として GitHub に保存されています。ただし**この作業環境からはその中身をダウンロードできません**（社内ネットワーク制約で **proxy 403**）。
- そこで今回は、ダウンロードできる「CI の実行ログ（テキスト）」だけを証拠にして、残10件の失敗を分類し直しました（**log-based**）。
- **大きな訂正があります**。これまで「残10件は全部データ不足（C=**SEED_DATA_DRIFT**）」と書いていましたが、ログを最後まで読むと、**4件は『同じ言葉が画面に2つある』というテストの書き方の問題（A=**TEST_SELECTOR_DRIFT**）**でした。つまりこの4件は**画面にちゃんと出ている**（データ不足ではない）＝テスト側を直せば緑になります（例: #dunning セクションに「未回収 ¥1,320,000」まで表示されていた）。
- 残り6件は「画面に要素が出ていない」ため**データ不足（C）が濃厚**ですが、screenshot を見られないので **C暫定**（＋証拠不足=**INSUFFICIENT_EVIDENCE**）としています。**本当のアプリ不具合（D=**TRUE_APP_BUG**）は証拠なし（0）**のままです。
- スタッフに機密を出さないテスト2件（原価・粗利）は、**機密の値が漏れて見えていた証拠はありません**（メッセージも値も出ていない＝前提データ不足）。よって D とは断定しません。
- 今回はアプリ・テスト・データ・設定を**一切変えていません**（**docs-only**・記録のみ）。ネットワーク制約の回避もしていません。
- **app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**。判定 **log-based 分類完了／CI_STAGE3_E2E_RED 継続／Phase 3 HOLD**。

## 2. 今回確認した CI run / artifact

- CI run 28885319767（HEAD c195f61・run_number 137）。**artifact**: playwright-report・id 8145981012・29933595 bytes・expired=false・expires 2026-07-14・77 files（各失敗に screenshot+trace+error-context）。

## 3. artifact取得結果

- GitHub MCP でメタデータ取得成功・署名付き download URL 発行成功。しかし Azure blob storage への curl が **proxy 403（CONNECT tunnel failed）** でブロックされ、**ZIP バイナリ・中身は取得不能**＝**artifact取得不能**。

## 4. artifact取得不能の理由

- 本実行環境の network policy が blob storage ホストへの直接 download を拒否。GitHub MCP は URL のみ返し、ファイル内容を返す API はない。network policy 回避は行わない。

## 5. 代替分析方法

- job logs（read-only 取得可）の error / locator / strict-mode / element-not-found を一次証跡とする **log-based** 分析。strict-mode は実DOM要素がログに引用されるため A を log だけで確定でき、element-not-found は C暫定＋F 併記とする。

## 6. CI / stage3_e2e 結果

- **stage1 success**／**stage3_e2e failure**／**Run E2E** = **62 passed** / **10 failed**（**CI_STAGE3_E2E_RED** 継続）。基盤（migrate/seed/build/browser）success。security.spec 全 passed。env `LLM_PROVIDER: fake`・`MAIL_PROVIDER: log`・`EXTERNAL_SEND_ENABLED: false`。

## 7. 10件の分類サマリー

| # | spec:line | 分類 | 強度 | log 根拠 |
|---|---|---|---|---|
| 1 | dunning:15 | **A=TEST_SELECTOR_DRIFT** | 高 | strict-mode 2要素（#dunning h3＋未回収額 p） |
| 2 | dunning:50 | **A=TEST_SELECTOR_DRIFT** | 高 | strict-mode 2要素（承認待ち link＋h1） |
| 3 | executive_dashboard:15 | **A=TEST_SELECTOR_DRIFT** | 高（後続F） | strict-mode 2要素（社長コックピット link＋h1） |
| 4 | executive_dashboard:37 | **A=TEST_SELECTOR_DRIFT** | 高 | strict-mode 2要素（プランニングホッコー link×2） |
| 5 | golden_path_actions:15 | **C=SEED_DATA_DRIFT（暫定）** | 中（F） | element not found（対処:） |
| 6 | operations:44 | **C=SEED_DATA_DRIFT（暫定）** | 中（F・redaction） | element not found（redaction message） |
| 7 | planning_hokko:16 | **C=SEED_DATA_DRIFT（暫定）** | 中（F） | element not found（Golden Path card） |
| 8 | planning_hokko:24 | **C=SEED_DATA_DRIFT（暫定）** | 中（F） | element not found（同 card） |
| 9 | planning_hokko:35 | **C=SEED_DATA_DRIFT（暫定）** | 中（F） | element not found（粗利率） |
| 10 | planning_hokko:45 | **C=SEED_DATA_DRIFT（暫定）** | 中（F・redaction） | element not found（redaction message） |

**A=4（log確定）／C暫定=6（redaction 2件は F=INSUFFICIENT_EVIDENCE 併記）／D=TRUE_APP_BUG=0／E=0。**

## 8. A=TEST_SELECTOR_DRIFT の有無

- **A は 4件残存**（dunning:15/50・executive_dashboard:15/37）。ログの strict-mode violation で実DOM要素が引用され、**要素は描画済み**＝データ不足（C）ではない。doc136/roadmap37 の「A は全消化」は**訂正**（フルログで新規判明）。tests-only（`.first()`/heading/exact 限定）で緑化見込み＝F1d 候補（別承認）。

## 9. C=SEED_DATA_DRIFT の範囲

- **C は 6件（暫定）**（golden_path_actions:15・operations:44・planning_hokko:16/24/35/45）。element-not-found で C 濃厚だが screenshot 未確認のため **C暫定＋F**。確定には artifact screenshot が要る。

## 10. D=TRUE_APP_BUG の証跡有無

- **D=0（証跡なし）**。security.spec 全 passed・strict-mode 4件は描画正常・element-not-found 6件は前提データ不足濃厚。redaction 2件は機密値露出の証跡なし（メッセージも値も未表示）＝D 断定せず（F 留保）。

## 11. Security / Consent / HCG 影響

- 失敗は表示系。**Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系の失敗はゼロ＝安全中核ゲート（HCG/Consent/Security）影響なし。redaction 系は漏えい証跡なし。封印維持（**EXTERNAL_SEND_ENABLED** false・**FakeLLM**・**externalAiAllowed** 既定 false・Suppression 強制）。

## 12. 今回やらなかったこと

- **app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし**・labels/company-brain-reference/leadmap/customers/approvals・**ci.yml変更なし**・**playwright.config.ts変更なし**・**package.json/lockfile変更なし**。
- artifact バイナリ取得の再試行・network policy 回避なし。F3 seed 整合に進まない。**runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。

## 13. Complete Function Coverage Matrix

- 直接: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 14. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| artifact 有効 | list_workflow_run_artifacts（id 8145981012・expired=false） | 存在 |
| **artifact取得不能** | curl 署名URL=`proxy 403` | 中身読めず |
| A=4件 | job log strict mode violation＋DOM要素引用 | A 確定 |
| C暫定=6件 | job log `element(s) not found` | C暫定＋F |
| D=0 | security.spec passed・漏えい証跡なし | 証跡なし |
| 封印維持 | job log env（fake/log/false） | 送信・課金なし |

## 15. Assumption Log

- strict-mode の DOM 引用により A=4件は screenshot なしで確定。
- element-not-found は C 濃厚だが D 排除には screenshot 要＝C暫定。
- redaction 2件は漏えい証跡なし。

## 16. Unknowns Log

- C暫定6件の C/D 最終確定（screenshot 依存）。executive_dashboard:15 後続 KPI 文言の描画有無。redaction 2件の最終無罪。

## 17. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | artifact 期限 2026-07-14・本環境から読めない | 中 | 人手 download or network 許可（人間） |
| R2 | A=4件放置で回帰ゲート緑が遠のく | 低 | F1d tests-only（別承認） |
| R3 | C暫定に D 混在の可能性 | 中 | screenshot 確定まで D 断定せず |

## 18. Definition of Done

- **artifact取得不能（proxy 403）** の記録＋**log-based** 分類（A=4／C暫定=6／D=0／F 併記）を roadmap39＋doc138 に **docs-only** 記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／commit-only（push なし）。

## 19. 次回推奨プロンプト案

> 「F1d tests-only 修正ミッション（別承認）: log 確定の strict-mode 4件（dunning:15・dunning:50・executive_dashboard:15・executive_dashboard:37）を e2e spec のみで最小修正（heading/exact/first 限定）。app/seed/schema/ci.yml/playwright.config.ts 変更なし・typecheck/lint 緑・commit-only。push→CI で 62/10→66/6 見込みを確認。残 C暫定6件は artifact screenshot 確定後に F3 seed（schema 影響事前停止条件・別承認）。」

## 20. 判定

判定: **F2 artifact取得不能（proxy 403）記録・log-based 再分類完了（A=4 log確定／C暫定=6／D=TRUE_APP_BUG=0／F 併記）／CI_STAGE3_E2E_RED は 10 failed 残存で継続／Phase 3 進入 HOLD**。**app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は F1d（A=4件 tests-only）→ screenshot 確定 → F3（C=6件 seed・別承認）。
