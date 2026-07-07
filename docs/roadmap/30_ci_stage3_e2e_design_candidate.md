# 30. CI Stage 3 E2E 追加 設計 Candidate（docs-only）

> 出典＝GitHub 正本 docs。これは **docs-only の設計メモ**であり、`.github/workflows` の実変更・E2E 実走・DB 構築・migration 実行ではありません。実装は別の人間承認。**369-vault非編集**・コード差分ゼロ。

## 1. 目的

doc128/roadmap29 で確定した Phase 3 残条件「e2e の green 確認」を満たすため、現行 CI（Stage 1 のみ）に **CI Stage 3 E2E**（playwright）ジョブを安全に追加するための設計を docs-only で整理する。本書では設計のみを行い、ワークフロー実装・E2E 実走は行わない。

## 2. 現在地の正

- GitHub 正本モノレポ `dreexy-git/369`。現在地は git refs を正とする（`git rev-parse HEAD` / `origin/main`）。
- 事業ロードマップ Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**（残条件＝e2e green 確認手段の確定＋最終 **人間 Phase Gate 承認**）。Complete Ledger **R4 Commercial Core** + **R0 Governance Docs**（R12 Trust 接続）。

## 3. 背景（CI_E2E_NOT_CONFIGURED の確定）

- CI 確認（run `28859371179`・HEAD `9e47933`）: `stage1` = success（safety/test/typecheck/lint 全 green）。ただし **e2e / playwright / build は CI に未組込**（`ci.yml` に「Stage 2 build・Stage 3 E2E smoke は別承認」と明記）＝分類 **CI_E2E_NOT_CONFIGURED**。
- ローカル実測（doc128）は **PARTIAL_GREEN**（5ゲート GREEN・e2e は DB 不在で **ENV_BLOCKED**）。
- よって e2e green は「CI に Stage 3 を足して DB 付きで実行」する必要がある。

## 4. 現行 e2e 構成の実測

- テストランナー: **playwright**（`apps/web/playwright.config.ts`）。`testDir: './tests/e2e'`、spec 12本。
- 前提（config コメント）: 「稼働中の Web（`pnpm start`）＋ seed 済み DB」。`webServer.command='pnpm start'`・`url='http://localhost:3000/login'`・`baseURL=E2E_BASE_URL||http://localhost:3000`。
- DB: Prisma・provider url=`env("DATABASE_URL")`（PostgreSQL）。CI 投入手順候補は `db:migrate:deploy`（非対話・`prisma migrate deploy`）→ `db:seed`（`tsx prisma/seed.ts`）。
- 注意: 既存 db スクリプトは `dotenv -e ../../.env` を読むため、CI では **DATABASE_URL を明示注入**（または CI 専用の最小 env）する必要がある（§9 事前停止条件）。

## 5. 追加する CI Stage 3 E2E ジョブの設計

- 配置: `ci.yml` に **別ジョブ `stage3_e2e`** を追加（`stage1` とは独立・`needs: stage1` で直列化、または push 時のみの別ワークフロー）。実装は別承認。
- ランナー: `ubuntu-latest`、`timeout-minutes: 20-30`。
- **DB は GitHub Actions の Postgres サービスコンテナ（ephemeral・使い捨て）**を使用。**本番DB非接続**（`DATABASE_URL` は service コンテナのローカル接続のみ）。
- ブラウザ: `npx playwright install --with-deps chromium`（CI 内で取得）。
- 実送信封印: **EXTERNAL_SEND_ENABLED** は未設定のまま（既定 false＝**LogEmailProvider**でネット送信なし）。**実LLMなし**（**FakeLLM**）・**externalAiAllowed** 既定 false。secrets/本番トークンは不要。

## 6. 必要なサービス・環境（ephemeral DB / browser / env）

| 要素 | 内容 | 安全条件 |
|---|---|---|
| DB | Postgres service container（例 postgres:16） | ephemeral・使い捨て・**本番DB非接続** |
| DATABASE_URL | `postgres://…@localhost:5432/…`（service 接続） | CI ローカルのみ・secrets 不要 |
| migration | `pnpm db:migrate:deploy`（既存 migration 適用） | 新規 **migration作成なし**・schema 変更なし |
| seed | `pnpm db:seed`（`prisma/seed.ts`・デモ値） | PII/実顧客データなし |
| build/start | `pnpm build` → `pnpm start`（webServer が起動） | 本番deploy なし |
| browser | playwright chromium（CI install） | 外部送信なし |
| 外部送信 | **EXTERNAL_SEND_ENABLED** 未設定＝**LogEmailProvider** | 実送信ゼロ |

## 7. ジョブ手順（設計・擬似）

1. `actions/checkout@v4`
2. `pnpm/action-setup@v4`（10.33.0）＋`actions/setup-node@v4`（node 20・cache pnpm）
3. `pnpm install --frozen-lockfile`
4. `pnpm db:generate`
5. Postgres service を待機 → `DATABASE_URL` を注入
6. `pnpm db:migrate:deploy`（ephemeral DB に既存 migration 適用）
7. `pnpm db:seed`（デモ seed）
8. `pnpm build`
9. `npx playwright install --with-deps chromium`
10. `pnpm --filter @hokko/web test:e2e`（webServer が `pnpm start` を起動し 12 spec 実行）
11. 失敗時は playwright report/trace を artifact 保存（read-only 診断用）

## 8. 安全封印の維持（外部送信/実LLM/本番非接触）

- **外部送信なし**（**EXTERNAL_SEND_ENABLED** false・**LogEmailProvider**・`assertAiToolAllowed`）。
- **実LLMなし**・**AIコストなし**（**FakeLLM** 決定論）。**externalAiAllowed** 既定 false・**runtime 解禁なし**。
- **本番DB非接続**（ephemeral service のみ）・本番deploy なし・secrets 不要。
- 送信ゲート（`decideApprovalAction`＋**SuppressionList**）・機密統制（`assertCanViewConfidential`／**DataAccessLog**）・AI境界の封印は e2e 実行中も不変。

## 9. 事前停止条件

- (a) 既存 db スクリプトが `dotenv -e ../../.env` を要求 → CI では **DATABASE_URL 注入 or CI 専用 env** の方式を先に確定（決まらなければ実装に進まない）。
- (b) seed が外部 API / 実サービス / secrets を要求する場合は停止（`prisma/seed.ts` がデモ値のみで完結するか事前確認）。
- (c) e2e が **本番DB**・**本番URL**・実送信・実LLM・課金を要求する兆候があれば停止（ephemeral・封印維持でなければ実装しない）。
- (d) `.github/workflows` 変更・CI 実装・E2E 実走は **人間 Phase Gate 承認** 後の別ミッション。

## 10. トリガと分離方針

- 案A（推奨）: `ci.yml` に `stage3_e2e` を追加し、`main` への push と PR で `needs: stage1` 直列実行。
- 案B: 重い e2e を別ワークフロー（`e2e.yml`）に分離し、`main` push のみ or 手動 `workflow_dispatch`。
- いずれも Stage 1（safety/test/typecheck/lint）は現状維持で不変。決定は実装ミッションで人間承認。

## 11. Complete Function Coverage Matrix（50カテゴリ）

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

直接対象＝**C03**（Approval/Audit）・**C06**・**C08**・**C37**・**C38**・**C39**（Security）・**C46**（Governance/CI）。

## 12. ロードマップ上の現在地（10項目・明示見出し）

### 12-1. 現在のPhase
事業 Phase 2 CONDITIONAL COMPLETE／PDF 2.5／戦略 18.5-26 未突入／Ledger **R4 Commercial Core** + **R0 Governance Docs**（R12 Trust 接続）。

### 12-2. 現在のPhaseで完了したこと
CI Stage 3 E2E 追加の設計（ephemeral DB・封印維持・事前停止条件）を docs-only で整備。Stage 1 は CI green・build はローカル green 実測済み。

### 12-3. 現在のPhaseで未完了のこと
`.github/workflows` への実装（別承認）、e2e の実 green、最終 **人間 Phase Gate 承認**。

### 12-4. 次に進むPhase
事業 **Phase 3** AI Growth Engine。

### 12-5. 次のPhaseへ進むために必ず完了すべきこと
本設計の人間承認 → CI Stage 3 E2E 実装（別ミッション）→ e2e green 実測 → 最終 Phase Gate 承認。

### 12-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）
**HOLD**（e2e 実 green 未達・実装は別承認）。

### 12-7. GO / HOLD の理由
5ゲートは green・設計は整ったが、e2e の実行環境（CI Stage 3）が未実装のため。安全側で **HOLD**。

### 12-8. 人間承認が必要な判断
本設計の承認、事前停止条件(§9)の解消方式（DATABASE_URL 注入 or CI 専用 env）、実装ミッションの起票。

### 12-9. 次Phaseに進む前にやってはいけないこと
**Phase 3** 実装／**runtime 解禁なし**／**externalAiAllowed** true 解禁／**EXTERNAL_SEND_ENABLED** true 解禁／**外部送信なし**／実LLM／AIコスト／本番確認／本番deploy／**schema変更なし**／新規 **migration作成**／**RBAC変更なし**／**369-vault非編集**／本タスクでの `.github` 実変更。

### 12-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか
`tasks/CURRENT_STATE.md`（bullet 1件）・`tasks/PROGRESS.md`（節1件）・`docs/roadmap/30`（本書）・`docs/audit/129`（記録）・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（行1件）に反映。**369-vault非編集**。

## 13. Global AI Rules

AIは下書き・提案・要約・分析・参照まで。危険操作は **Human Certification Gate**。**外部送信なし**・**実LLMなし**・**AIコストなし**・高機密ラベル **runtime 解禁なし**・同意なし外部送信なし。AI 参照は NORMAL/INTERNAL のみ・**CUSTOMER_CONFIDENTIAL** 非注入・生成は **FakeLLM** 決定論。

## 14. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| CI は Stage 1 のみ | `.github/workflows/ci.yml`（Stage2/3別承認） | e2e 未組込 |
| CI run success | actions run `28859371179` | success |
| e2e は DB/稼働Web前提 | `apps/web/playwright.config.ts` | seed済DB必須 |
| DB投入手段 | `db:migrate:deploy` / `db:seed`（package.json） | 既存script |
| 実送信封印 | `EXTERNAL_SEND_ENABLED` 既定OFF・**LogEmailProvider** | 送信ゼロ |
| AI境界 | **FakeLLM**・**externalAiAllowed** 既定false | 閉 |

## 15. Assumption Log

- CI の Postgres は ephemeral service container（本番非接続）。seed はデモ値で完結する前提（§9-b で事前確認）。
- 既存 migration をそのまま `db:migrate:deploy` で適用（新規 migration 作成なし・schema 不変）。

## 16. Unknowns Log

- `prisma/seed.ts` が外部 API/secrets を必要とするか（要事前確認）。
- e2e 12 spec が seed 済みデモ DB のみで全 green になるか。
- Stage 3 追加による CI 実行時間・コスト増。

## 17. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | seed が外部/secrets 依存で CI 実装が詰まる | 中 | §9-b で事前停止条件化 |
| R2 | dotenv `.env` 前提で DATABASE_URL 注入方式が未確定 | 中 | §9-a で事前停止条件化 |
| R3 | e2e が本番系に触れる設計ミス | 高 | ephemeral・封印維持を必須要件化 |
| R4 | Stage 3 実装を設計承認なしに着手 | 中 | 実装は別 Phase Gate 承認 |

## 18. Definition of Done

- CI Stage 3 E2E の設計（構成・手順・封印・事前停止条件・トリガ）を docs-only で整理／判定 **HOLD**／**369-vault非編集**／**schema変更なし**・**migration作成なし**・**RBAC変更なし**・**runtime 解禁なし**／**外部送信なし**・**実LLMなし**・**AIコストなし**／`.github` 実変更なし／commit-only（push なし）。

## 19. 次回推奨プロンプト案

> 「本設計（roadmap30/doc129）を人間承認後、CI Stage 3 E2E 実装ミッションとして `.github/workflows` に ephemeral Postgres service＋migrate deploy＋seed＋build＋playwright を追加（別承認）。先に §9 事前停止条件（DATABASE_URL 注入方式・seed の外部依存有無）を read-only 確認し、詰まれば停止。実装後 CI で e2e green を確認し doc130 に記録。schema 変更・runtime 解禁・外部送信は禁止。」

## 20. 判定

判定: **HOLD（設計 docs-only 完了・実装は別 Phase Gate 承認）**。**Phase 3** 実装なし・**runtime 解禁なし**・**schema変更なし**・新規 **migration作成なし**・**RBAC変更なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**本番DB非接続**・**369-vault非編集**・push なし（commit-only）。次は 本設計の **人間 Phase Gate 承認** → CI Stage 3 E2E 実装（別ミッション）。
