# 129. CI Stage 3 E2E 追加 設計 — docs/roadmap/30 の記録（docs-only・369-vault非編集）

## 1. 非エンジニア向け要約

- 今回は、Phase 3 に進む前の残り宿題「画面通しテスト（e2e）の自動チェック」を、GitHub の自動チェック（CI）に**足すための設計図**を、コードを**一切変えず**に文章で作った回です。実装ではありません。
- 前回わかったこと: 今の CI は「安全チェック・自動テスト・型チェック・書式チェック」の4つを毎回チェックしていますが、**画面通しテスト（e2e）は入っていません**。e2e は「動くアプリ＋データベース」が必要なので、CI に安全に足す方法を設計しました。
- 設計のポイント: (1) CI 内に**使い捨ての練習用データベース**（本番には一切つながない）を立てて動かす (2) メール送信は**しない**設定のまま（**EXTERNAL_SEND_ENABLED** 既定OFF・**LogEmailProvider**）(3) AI は本物ではなく**ダミー**（**FakeLLM**）でお金がかからない (4) 実装に進む前に確認すべき「事前停止条件」を明記。
- これは設計の記録であり、**`.github` の実変更なし**・**schema変更なし**・新規 **migration作成なし**・**RBAC変更なし**・**runtime 解禁なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**本番DB非接続**。**369-vault非編集**。判定は **HOLD**（実装は別の承認）。

## 2. 今回作成したdocs

- `docs/roadmap/30_ci_stage3_e2e_design_candidate.md`（20見出し・1から連番・§12 現在地10項目・§11 50カテゴリ Matrix・§13 Global AI Rules）— **CI Stage 3 E2E** 追加設計本体。
- `docs/audit/129_ci_stage3_e2e_design.md`（本書・14見出し）— 監査記録。

## 3. 現在地の実測結果

- 事業 Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**（残条件＝e2e green 確認手段の確定＋最終 **人間 Phase Gate 承認**）。Complete Ledger **R4 Commercial Core** + **R0 Governance Docs**（R12 Trust 接続）。現在地は git refs を正とする。
- CI 実測: run `28859371179`（HEAD `9e47933`）= success・`stage1` のみ（safety/test/typecheck/lint green）・**e2e/build は CI 未組込＝CI_E2E_NOT_CONFIGURED**。ローカルは **PARTIAL_GREEN**（e2e は DB 不在で **ENV_BLOCKED**）。

## 4. チェックリストの要約

- CI に **別ジョブ `stage3_e2e`** を追加（`needs: stage1` 直列 or 別ワークフロー）。
- **ephemeral Postgres service**（使い捨て・**本番DB非接続**）に既存 migration を `db:migrate:deploy` 適用＋`db:seed`（デモ値）→ `pnpm build` → `pnpm start` → **playwright** で 12 spec 実行。
- 封印維持: **外部送信なし**（**EXTERNAL_SEND_ENABLED** 既定OFF・**LogEmailProvider**）・**実LLMなし**（**FakeLLM**）・**externalAiAllowed** 既定false・**runtime 解禁なし**・secrets 不要。
- 事前停止条件: DATABASE_URL 注入方式（`dotenv -e ../../.env` 前提の解消）、seed の外部/secrets 依存有無、本番系非接触。

## 5. Phase 3 移行条件への影響

- e2e green の確認手段が「CI Stage 3 追加（DB 付き）」として設計確定。実装（`.github/workflows` 変更）→ e2e 実 green → 最終 Phase Gate 承認で GO 条件が揃う。**Phase 3** 進入は引き続き **HOLD**。

## 6. 今回やらなかったこと

- `.github/workflows` 実変更なし・E2E 実走なし・DB 構築なし・migration 実行なし・seed 実行なし。
- 実装・**schema変更なし**・新規 **migration作成なし**・**RBAC変更なし**・labels変更なし・company-brain-reference変更なし・leadmap/customers/approvals 変更なし。
- **runtime 解禁なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・本番deploy なし・**本番DB非接続**・**369-vault非編集**・push なし（commit-only）。

## 7. Complete Function Coverage Matrix

- 直接対象: **C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。
- 間接対象: C01,C04,C05,C07,C09,C10,C11,C12,C15,C18,C20,C26,C28,C30,C33,C34,C40,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。

## 8. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| CI は Stage 1 のみ | `.github/workflows/ci.yml` | e2e 未組込 |
| CI run success | actions run `28859371179` | success |
| e2e は DB/稼働Web前提 | `apps/web/playwright.config.ts`（webServer `pnpm start`） | seed済DB必須 |
| DB投入手段 | `db:migrate:deploy` / `db:seed` | 既存script |
| 実送信封印 | **EXTERNAL_SEND_ENABLED** 既定OFF・**LogEmailProvider** | 送信ゼロ |
| AI境界 | **FakeLLM**・**externalAiAllowed** 既定false | 閉 |

## 9. Assumption Log

- CI の Postgres は ephemeral service container（**本番DB非接続**）。seed はデモ値で完結する前提（要事前確認）。
- 既存 migration をそのまま `db:migrate:deploy` で適用（新規 **migration作成なし**・schema 不変）。

## 10. Unknowns Log

- `prisma/seed.ts` の外部/secrets 依存有無。
- e2e 12 spec が seed 済みデモ DB のみで全 green になるか。
- Stage 3 追加による CI 実行時間・コスト増。

## 11. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | seed が外部/secrets 依存 | 中 | 事前停止条件化 |
| R2 | DATABASE_URL 注入方式が未確定 | 中 | 事前停止条件化 |
| R3 | e2e が本番系に触れる設計ミス | 高 | ephemeral・封印維持を必須化 |
| R4 | 設計承認なしに実装着手 | 中 | 実装は別 Phase Gate 承認 |

## 12. Definition of Done

- **CI Stage 3 E2E** 追加設計（構成・手順・封印・事前停止条件・トリガ）を docs-only で整理／roadmap30＋doc129 作成／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／**369-vault非編集**／**schema変更なし**・新規 **migration作成なし**・**RBAC変更なし**・**runtime 解禁なし**／**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番DB非接続**／`.github` 実変更なし／安全ゲート exit 0／commit-only（push なし）。

## 13. 次回推奨プロンプト案

> 「roadmap30/doc129 を人間承認後、CI Stage 3 E2E 実装ミッションとして `.github/workflows` に ephemeral Postgres service＋`db:migrate:deploy`＋`db:seed`＋`pnpm build`＋playwright を追加（別承認）。先に §9 事前停止条件を read-only 確認し詰まれば停止。実装後 CI で e2e green を確認し doc130 に記録。schema 変更・runtime 解禁・外部送信は禁止。」

## 14. 判定

判定: **HOLD（設計 docs-only 完了・実装は別 Phase Gate 承認）**。**Phase 3** 実装なし・**runtime 解禁なし**・**schema変更なし**・新規 **migration作成なし**・**RBAC変更なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**本番DB非接続**・**369-vault非編集**・push なし（commit-only）。次は 本設計の **人間 Phase Gate 承認** → CI Stage 3 E2E 実装（別ミッション）。
