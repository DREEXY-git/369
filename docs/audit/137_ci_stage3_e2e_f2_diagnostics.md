# 137. CI Stage 3 E2E F2 diagnostics — docs/roadmap/38 の記録（config-only・369-vault非編集）

## 1. 非エンジニア向け要約

- CI の画面通しテスト（**e2e**）で残っている10本の失敗について、「なぜ落ちたか」を**画面のスクリーンショット・操作記録（trace）・HTMLレポート**として CI から取り出せる仕組み（**F2 診断基盤**）を追加した回です。
- これまで CI は失敗レポートを保存しようとしていましたが、設定が噛み合わず「ファイルが見つからない（No files were found）」になっていました。今回、その設定を**最小限だけ**直しました。
- 直したのは**テストの設定ファイル（playwright.config.ts）**と**CI の保存先設定（ci.yml の artifact パス）**の2つだけ。**アプリ本体・テストの合否条件・データ（seed）・DB 設計（schema）は一切変えていません**。テストの結果（**62 passed / 10 failed**）も変わりません（診断基盤を足しただけ）。
- 次は、これを GitHub に反映（push・別承認）して CI を動かし、取れた証跡を見て、残10本が「データ不足（C=**SEED_DATA_DRIFT**）」か「本当の不具合（D=**TRUE_APP_BUG**）」かを最終確定します。現時点の見立ては D=0（真の不具合なし）です。
- **app変更なし・tests期待値変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・本番確認なし・369-vault非編集**。判定 **F2 診断基盤 追加完了／CI_STAGE3_E2E_RED 継続／Phase 3 HOLD**。

## 2. 今回作成・変更したファイル

- 変更（config-only）: `apps/web/playwright.config.ts`（html reporter + trace + screenshot）・`.github/workflows/ci.yml`（artifact path 拡張のみ）。
- 新規: `docs/roadmap/38_ci_stage3_e2e_f2_diagnostics_candidate.md`（22見出し・§10 サブ10）・`docs/audit/137_…`（本書・15見出し）。
- 更新: `tasks/CURRENT_STATE.md`・`tasks/PROGRESS.md`・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`。

## 3. F2で追加した診断設定

- **背景**: 直近 run 28882890123 は **stage1 success**／**stage3_e2e failure**／**Run E2E** = 62 passed / 10 failed。基盤ステップ（migrate/seed/build/browser）は全 success で、Run E2E のみ failure。
- **原因**: `reporter: 'list'`（html 未生成）＋ `trace: 'on-first-retry'` だが `retries: 0`（trace 永久未取得）＝証跡が生成されず、同 run で `No files were found with the provided path: apps/web/playwright-report`。
- **playwright.config.ts**: `reporter: [['list'],['html',{outputFolder:'playwright-report',open:'never'}]]`／`use.trace: 'retain-on-failure'`／`use.screenshot: 'only-on-failure'`。trace/screenshot は既定 `test-results/`（gitignore 済み）。
- **ci.yml**: artifact upload の `path` に `apps/web/playwright-report` と `apps/web/test-results` を含める。**env / service / 実行ステップは不変**（EXTERNAL_SEND_ENABLED=false / LLM_PROVIDER=fake / MAIL_PROVIDER=log / ephemeral Postgres 維持）。

## 4. 残C10件（診断対象）

- dunning:15・dunning:50・executive_dashboard:15・executive_dashboard:37・golden_path_actions:15・operations:44・planning_hokko:16・planning_hokko:24・planning_hokko:35・planning_hokko:45。
- 全 10件が element-not-found 型＝C=**SEED_DATA_DRIFT** 疑い（前提データ不足）。A=**strict-mode**=0（F1/F1b/F1c で全消化）・B=文言=0・**TRUE_APP_BUG**=0・E=ENV=0。F2 の trace/screenshot で C/D を最終確定する。

## 5. 検証結果

- `git diff --check` = OK。secret = NONE。`node scripts/check-company-brain-safety.mjs` = exit 0。
- `pnpm --filter @hokko/web typecheck` = exit 0。`pnpm lint` = exit 0。
- package.json / pnpm-lock.yaml 差分なし・369-vault 差分なし・app/tests期待値/seed/schema/migration 差分なし。
- 実 e2e artifact は push 後の CI（stage3_e2e）で失敗時に生成（本ミッションは commit-only・push なし）。AI境界は **FakeLLM** 決定論のまま不変。

## 6. 今回やらなかったこと

- **app変更なし・tests期待値変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし**・labels変更なし・company-brain-reference変更なし・leadmap/customers/approvals・**package.json/lockfile変更なし**。ci.yml の env/service/実行ステップも不変。
- F3 データ整合には進まない（別承認）。**runtime 解禁なし**・`externalAiAllowed` true 解禁なし・`EXTERNAL_SEND_ENABLED` true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。

## 7. Phase 3 移行条件への影響

- **CI_STAGE3_E2E_RED** は C10件残存で継続（F2 は結果を変えない・診断基盤のみ）。Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」は未達＝**Phase 3** 進入 **HOLD** 継続。
- 失敗は表示系で **Customer一覧 / LocalBusinessLead / Contact / SuppressionList** など機密・同意・CRM閲覧統制系は緑（安全中核ゲート影響なし）。

## 8. Complete Function Coverage Matrix

- 直接: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 9. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| artifact 空の原因 | run 28882890123 ログ「No files were found」 | reporter=list＋retries:0 |
| html reporter 追加 | playwright.config.ts diff | `[['list'],['html',...]]` |
| trace/screenshot 追加 | playwright.config.ts diff | `retain-on-failure`/`only-on-failure` |
| artifact path 拡張 | ci.yml diff | report + test-results |
| package/lock 不変 | git status（禁止領域空） | 新規依存なし（html 組込） |
| 封印維持 | ci.yml env 不変・safety exit 0 | 送信・課金なし |

## 10. Assumption Log

- html reporter は `@playwright/test ^1.49.1` 組込のため **package.json 変更不要**。
- `test-results/` は既定 outputDir・`.gitignore` 済みで誤コミットしない。
- `retain-on-failure` は retries:0 でも失敗テストの trace を保持。

## 11. Unknowns Log

- push 後の CI で trace/screenshot/html が実際に artifact 化されるか（次回 push で確認）。
- 各 C10件が screenshot 上で C（要素未描画）か D（描画あり・別要因）かの最終判定（artifact 取得後）。

## 12. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | trace zip で artifact サイズ増 | 低 | retention-days:7・失敗時のみ |
| R2 | html reporter が CI をブロック | 低 | `open:'never'` で回避 |
| R3 | C10件が D を含む可能性 | 中 | F2 artifact で確定（D=0 仮説） |

## 13. Definition of Done

- **F2** 診断基盤（html reporter + trace retain-on-failure + screenshot only-on-failure + ci.yml artifact path 拡張）を **config-only** で追加／typecheck・lint・safety 緑／roadmap38＋doc137 記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**app変更なし・tests期待値変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・369-vault非編集**／commit-only（push なし）。

## 14. 次回推奨プロンプト案

> 「F2 push-only（別承認）で main へ反映→ CI の stage3_e2e を read-only 確認し、失敗時の playwright-report artifact（html + trace + screenshot）生成を検証。artifact を根拠に残 C10件を C（**SEED_DATA_DRIFT**）か D（**TRUE_APP_BUG**）に最終確定。schema/seed/runtime/外部送信は禁止（F3 は別承認）。」

## 15. 判定

判定: **F2 診断基盤 追加完了（config-only・typecheck/lint/safety 緑）／CI_STAGE3_E2E_RED は C10件残存で継続（結果不変・診断基盤のみ）／Phase 3 進入 HOLD**。**app変更なし・tests期待値変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は F2 push-only → CI で artifact 取得 → C/D 最終確定。
