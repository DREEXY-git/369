# 31. CI Stage 3 E2E 実装 Candidate

> 出典＝GitHub 正本 docs。roadmap30/doc129 の設計に基づき `.github/workflows/ci.yml` に **Stage 3 E2E** ジョブを追加した実装記録。**369-vault非編集**。schema/RBAC/labels/app コード変更なし（CI 設定のみ）。e2e の実 green は push 後の CI 実行で確認する。

## 1. 目的

doc129/roadmap30 の承認済み設計に従い、CI に **CI Stage 3 E2E**（playwright）ジョブを実装し、Phase 3 残条件「e2e green 確認」を CI で実行可能にする。実 green の確認は push→CI 実行（別承認）。

## 2. 現在地の正

- 事業 Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**（残＝e2e 実 green＋最終 **人間 Phase Gate 承認**）。Ledger **R4 Commercial Core** + **R0 Governance Docs**（R12 Trust 接続）。現在地は git refs を正とする。

## 3. 事前停止条件の read-only 確認結果（設計 §9）

- (a) DATABASE_URL 注入: db スクリプトは `dotenv -e ../../.env`。CI で非機密 `.env`（gitignore 済）を生成し `DATABASE_URL`/`DIRECT_URL` を ephemeral service に向ける方式で解消。datasource は `url=env("DATABASE_URL")`＋`directUrl=env("DIRECT_URL")`。
- (b) seed 依存: `prisma/seed.ts`（758行）は `source:'DEMO'`・`maps_provider:'demo'`・`DemoMapProvider`・`fakeWebsiteAnalysis` のみで **fetch/API_KEY/OPENAI/ANTHROPIC/実ネットワークなし**＝外部/secrets 依存なし。→ クリア。
- (c) 本番非接触: web アプリは Redis/S3 を起動時に import せず（`pnpm start` は DB のみで起動）・`SESSION_SECRET` はフォールバックあり。ephemeral Postgres のみで完結。→ クリア。

## 4. 実装内容（ci.yml）

- 既存 `stage1`（safety/test/typecheck/lint）は**不変**。
- 追加 `stage3_e2e`（`needs: stage1`・`timeout-minutes: 30`）。
- サービス: `pgvector/pgvector:pg16`（docker-compose と同一・app/app/ikezaki_os・health-cmd `pg_isready`）。**本番DB非接続**。
- ジョブ env（非機密）: `DATABASE_URL`/`DIRECT_URL`（service）・`SESSION_SECRET`（CI 用ダミー）・`APP_URL`/`E2E_BASE_URL`・`LLM_PROVIDER=fake`・`MAIL_PROVIDER=log`・`EXTERNAL_SEND_ENABLED=false`。

## 5. ジョブ手順

1. checkout → pnpm 10.33.0 → node 20（cache pnpm）
2. `pnpm install --frozen-lockfile`
3. CI 専用 `.env` 生成（非機密・gitignore 済・未コミット）
4. `pnpm db:generate`
5. `pnpm db:migrate:deploy`（ephemeral DB へ既存 migration 適用）
6. `pnpm db:seed`（DEMO データ）
7. `pnpm build`
8. `pnpm --filter @hokko/web exec playwright install --with-deps chromium`
9. `pnpm --filter @hokko/web exec playwright test`（12 spec）
10. 失敗時 `apps/web/playwright-report` を artifact 保存（診断用）

## 6. 安全封印の維持

- **外部送信なし**（`EXTERNAL_SEND_ENABLED=false`・`LogEmailProvider`・`assertAiToolAllowed`）。
- **実LLMなし**・**AIコストなし**（`LLM_PROVIDER=fake`・`FakeLLM`）。**externalAiAllowed** 既定false・**runtime 解禁なし**。
- **本番DB非接続**（ephemeral service）・secrets 不要・本番deploy なし。
- YAML 検証・非機密確認・`node scripts/check-company-brain-safety.mjs` exit 0。

## 7. 検証状況

- ローカル検証: YAML パース成功（jobs=stage1/stage3_e2e）・env 安全値（EXTERNAL_SEND=false/LLM=fake/MAIL=log）・stage1 不変・実 secrets なし・lockfile 不変・safety exit 0。
- **未検証**: e2e の実 green（CI で postgres service を立てて実行する必要があり、**push 後の CI 実行で確認**）。本サンドボックスでは Postgres/Actions 実行環境がなく実走不能。

## 8. Complete Function Coverage Matrix（50カテゴリ）

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

## 9. ロードマップ上の現在地（10項目・明示見出し）

### 9-1. 現在のPhase
事業 Phase 2 CONDITIONAL COMPLETE／PDF 2.5／戦略 18.5-26 未突入／Ledger **R4 Commercial Core** + **R0 Governance Docs**。

### 9-2. 現在のPhaseで完了したこと
CI に **stage3_e2e** ジョブを実装（ci.yml）。事前停止条件を read-only で解消。YAML/安全検証 green。

### 9-3. 現在のPhaseで未完了のこと
push→CI 実行での e2e 実 green、最終 **人間 Phase Gate 承認**。

### 9-4. 次に進むPhase
事業 **Phase 3** AI Growth Engine。

### 9-5. 次のPhaseへ進むために必ず完了すべきこと
push（別承認）→ CI で `stage3_e2e` green → 最終 Phase Gate 承認。

### 9-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）
**HOLD**（e2e 実 green 未確認・push 別承認）。

### 9-7. GO / HOLD の理由
CI 実装は完了・安全検証は green だが、e2e の実 green は CI 実行（push 後）でのみ確認できるため。

### 9-8. 人間承認が必要な判断
push 承認（CI 実行トリガ）、CI 結果に基づく最終 Phase Gate 承認。

### 9-9. 次Phaseに進む前にやってはいけないこと
**Phase 3** 実装／**runtime 解禁なし**／**externalAiAllowed** true 解禁／**EXTERNAL_SEND_ENABLED** true 解禁／**外部送信なし**／実LLM／AIコスト／本番確認／本番deploy／**schema変更なし**／新規 **migration作成なし**／**RBAC変更なし**／**369-vault非編集**。

### 9-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか
`tasks/CURRENT_STATE.md`（bullet 1件）・`tasks/PROGRESS.md`（節1件）・`docs/roadmap/31`（本書）・`docs/audit/130`（記録）・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（行1件）。**369-vault非編集**。

## 10. Global AI Rules

AIは下書き・提案・要約・分析・参照まで。危険操作は **Human Certification Gate**。**外部送信なし**・**実LLMなし**・**AIコストなし**・**runtime 解禁なし**・同意なし外部送信なし。生成は **FakeLLM** 決定論・AI 参照は NORMAL/INTERNAL のみ・**CUSTOMER_CONFIDENTIAL** 非注入。

## 11. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| stage3_e2e 追加 | `.github/workflows/ci.yml` jobs | stage1＋stage3_e2e |
| stage1 不変 | YAML 検証（9 steps） | 保持 |
| 送信封印 | env `EXTERNAL_SEND_ENABLED=false` / `MAIL_PROVIDER=log` | 送信ゼロ |
| 実LLMなし | env `LLM_PROVIDER=fake` | fake |
| seed 非依存 | `seed.ts` DEMO のみ | 外部/secrets なし |
| 本番非接触 | ephemeral postgres service | 本番DB非接続 |
| 実secretsなし | diff grep | none |
| safety seal | `check-company-brain-safety.mjs` | exit 0 |

## 12. Assumption Log

- e2e の実 green は CI（postgres service あり）で確認。ローカルサンドボックスでは実走不能。
- `pnpm start`（apps/web）は DB のみで起動（Redis/S3 非依存）。

## 13. Unknowns Log

- CI 上での e2e 12 spec の実 green/red。
- Stage 3 追加による CI 実行時間・コスト増。

## 14. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | CI 上で e2e が red の可能性（未実行） | 中 | push 後 CI で確認 |
| R2 | seed/migrate が CI 特有要因で失敗 | 中 | artifact/ログで診断 |
| R3 | e2e 追加による CI 時間・コスト増 | 低 | timeout 30分で上限 |

## 15. Definition of Done

- ci.yml に `stage3_e2e`（ephemeral DB・封印維持）を実装／YAML・安全検証 green／stage1 不変／**369-vault非編集**／**schema変更なし**・新規 **migration作成なし**・**RBAC変更なし**・**runtime 解禁なし**／**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番DB非接続**／commit-only（push なし）。

## 16. 次回推奨プロンプト案

> 「roadmap31/doc130 と ci.yml 変更を push（別承認）し、GitHub Actions の `stage3_e2e` 結果を read-only 取得。green なら doc131 で『Phase 3 移行 GO（最終 Phase Gate 承認待ち）』を docs-only 記録。red なら失敗ログ（artifact）を分類し原因整理（修正は別承認）。schema 変更・runtime 解禁・外部送信は禁止。」

## 17. 判定

判定: **CI 実装 完了（ローカル検証 green）／e2e 実 green は push→CI で確認・Phase 3 進入は HOLD**。**Phase 3** 実装なし・**runtime 解禁なし**・**schema変更なし**・新規 **migration作成なし**・**RBAC変更なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**本番DB非接続**・**369-vault非編集**・push なし（commit-only）。次は push（別承認）→ CI e2e 結果確認。
