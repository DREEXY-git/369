# 130. CI Stage 3 E2E 実装 — docs/roadmap/31 の記録（.github/workflows のみ・369-vault非編集）

## 1. 非エンジニア向け要約

- 今回は、前回作った設計図（doc129）に従って、**GitHub の自動チェック（CI）に「画面通しテスト（e2e）」を実際に追加**した回です。変更したのは CI の設定ファイル1つ（`.github/workflows/ci.yml`）だけで、アプリ本体・データベースの定義・権限は**一切変えていません**。
- 追加した仕組み: CI の中に **使い捨ての練習用データベース**（本番には一切つながない）を立て、デモデータを入れて、アプリを起動し、画面通しテストを自動実行します。
- 安全設定: メール送信は**しない**（`EXTERNAL_SEND_ENABLED=false`・ログのみ）／AI は本物ではなく**ダミー**（`LLM_PROVIDER=fake`）でお金がかからない／秘密情報（パスワード等）は不要。
- 大事な注意: この「画面通しテスト」が実際に**合格するかどうかは、GitHub に反映（push）して CI が動いたときに初めてわかります**。今回の作業環境では本物のデータベースが無いため、テストの実走はできず、**設定が正しく書けたことまで**を確認しました（記述チェックは合格）。
- **schema変更なし**・新規 **migration作成なし**・**RBAC変更なし**・**runtime 解禁なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番DB非接続**・本番確認なし。**369-vault非編集**。**push なし**（commit-only）。

## 2. 今回変更/作成したもの

- `.github/workflows/ci.yml`（変更・`stage3_e2e` ジョブ追加。`stage1` は不変）。
- `docs/roadmap/31_ci_stage3_e2e_implementation_candidate.md`（17見出し・§9 現在地10項目・§8 50カテゴリ Matrix）。
- `docs/audit/130_ci_stage3_e2e_implementation.md`（本書・14見出し）。

## 3. 現在地の実測結果

- 事業 Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**（残＝e2e 実 green＋最終 **人間 Phase Gate 承認**）。Ledger **R4 Commercial Core** + **R0 Governance Docs**。現在地は git refs を正とする。
- 事前停止条件（設計 §9）を read-only で解消: seed は DEMO のみ（外部/secrets なし）・web は Redis/S3 起動非依存・`.env` は gitignore 済み・datasource は `DATABASE_URL`＋`DIRECT_URL`。

## 4. 実装の要約

- `stage3_e2e`（`needs: stage1`）を追加。**ephemeral Postgres service（`pgvector/pgvector:pg16`・本番DB非接続）** に `db:migrate:deploy`＋`db:seed`（DEMO）→ `pnpm build` → `playwright test`（12 spec）。
- 封印: `EXTERNAL_SEND_ENABLED=false`・`LogEmailProvider`・`LLM_PROVIDER=fake`（`FakeLLM`）・`externalAiAllowed` 既定false・**runtime 解禁なし**・secrets 不要。
- CI 専用 `.env`（非機密・gitignore 済・未コミット）で db スクリプトの `dotenv` 依存を解消。

## 5. Phase 3 移行条件への影響

- 「e2e green 確認手段」が CI 上に実装され、あとは **push→CI 実行で実 green を確認** すれば Phase 3 GO 条件が揃う（＋最終 Phase Gate 承認）。**Phase 3** 進入は引き続き **HOLD**。

## 6. 今回やらなかったこと

- アプリ実装・**schema変更なし**・新規 **migration作成なし**・**RBAC変更なし**・labels変更なし・company-brain-reference変更なし・leadmap/customers/approvals 変更なし・seed 変更なし。
- **runtime 解禁なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・本番deploy なし・**本番DB非接続**・**369-vault非編集**・push なし（commit-only）。e2e の実走もしていない（CI で実行）。

## 7. Complete Function Coverage Matrix

- 直接: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 8. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| stage3_e2e 追加 | `.github/workflows/ci.yml` | 追加 |
| stage1 不変 | YAML 検証（9 steps 保持） | 保持 |
| 送信封印 | env `EXTERNAL_SEND_ENABLED=false`/`MAIL_PROVIDER=log` | 送信ゼロ |
| 実LLMなし | env `LLM_PROVIDER=fake` | fake |
| seed 非依存 | `seed.ts` DEMO のみ | 外部/secrets なし |
| 本番非接触 | ephemeral postgres service | 本番DB非接続 |
| 実secretsなし | diff grep | none |
| safety seal | `check-company-brain-safety.mjs` | exit 0 |

## 9. Assumption Log

- e2e の実 green は CI（postgres service あり）で確認。ローカルサンドボックスでは実走不能。
- `pnpm start`（apps/web）は DB のみで起動（Redis/S3 非依存）。

## 10. Unknowns Log

- CI 上での e2e 12 spec の実 green/red。
- Stage 3 追加による CI 実行時間・コスト増。

## 11. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | CI 上で e2e が red の可能性（未実行） | 中 | push 後 CI で確認 |
| R2 | seed/migrate が CI 特有要因で失敗 | 中 | artifact/ログで診断 |
| R3 | e2e 追加による CI 時間・コスト増 | 低 | timeout 30分で上限 |

## 12. Definition of Done

- ci.yml に `stage3_e2e`（ephemeral DB・封印維持）を実装／YAML・安全検証 green／stage1 不変／roadmap31＋doc130 記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**369-vault非編集**／**schema変更なし**・新規 **migration作成なし**・**RBAC変更なし**・**runtime 解禁なし**／**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番DB非接続**／commit-only（push なし）。

## 13. 次回推奨プロンプト案

> 「roadmap31/doc130＋ci.yml を push（別承認）し、GitHub Actions `stage3_e2e` の結果を read-only 取得。green なら doc131 で『Phase 3 移行 GO（最終 Phase Gate 承認待ち）』を docs-only 記録。red なら artifact ログを分類（修正は別承認）。schema 変更・runtime 解禁・外部送信は禁止。」

## 14. 判定

判定: **CI 実装 完了（ローカル検証 green）／e2e 実 green は push→CI で確認・Phase 3 進入は HOLD**。**Phase 3** 実装なし・**runtime 解禁なし**・**schema変更なし**・新規 **migration作成なし**・**RBAC変更なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**本番DB非接続**・**369-vault非編集**・push なし（commit-only）。次は push（別承認）→ CI e2e 結果確認。
