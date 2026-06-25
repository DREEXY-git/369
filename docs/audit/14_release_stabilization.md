# 14 — Release Stabilization Gate（本番足場固め）

Phase 1-12 の新機能には進まず、Phase 1-11 までの実装＋本番デプロイ安定化を
**安全に main 化（リリース基盤として確定）** するための監査記録。

- 実施日: 2026-06-24
- 担当観点: SaaS アーキテクト / DevOps / SRE / セキュリティ監査 / QA
- 方針: **新機能ゼロ**。監査 →（安全なら）取り込み → 再検証 → 記録。

---

## 1. 今回の目的
機能を増やす前に、稼働中ブランチを安全にリリース基盤へ取り込み、本番運用の足場を固める。
Phase 1-12（Golden Path KPI / 経営ダッシュボード新機能 / リース在庫予約 / 承認種別分離 /
会計本体 / OCR / AI社員本体 / 契約 / 労務 / 銀行API）は**対象外**。

## 2. 対象ブランチ
- 開発/対象: `claude/friendly-dijkstra-un6l9t`
- **重要事実: `main` ブランチはローカルにも origin にも存在しない。**
  本ブランチがリポジトリの **デフォルトブランチ**（remote HEAD が指す）であり、
  Vercel 本番デプロイもこのブランチから行われている。
  → 「main へ merge」する対象が無いため、main 化は **新規 main 作成**になる（§13）。

## 3. main との差分
`main` が存在しないため差分計測は N/A。
現行 HEAD（ゲート開始時）= `9dee42e` = `8164ae1`(Phase 1-11) + 安定化修正5件。

## 4. 本番デプロイ安定化修正5件の確認結果
| # | 修正 | commit | ファイル | 妥当性 |
|---|------|--------|----------|--------|
| 1 | 接続文字列の検証・原因明示(P1013) | `0d6eb85` | `packages/db/prisma/vercel-setup.mjs` | URL構造を伏字で出力。`@`個数/ポート検証。良 |
| 2 | migrate を直接接続(5432)で実行 | `d525809` | 同上 | `migrate deploy` を `DATABASE_URL=DIRECT_URL` で実行＝pgbouncer回避。良 |
| 3 | lint/typecheck を migrate から分離 | `4e860c7` | `apps/web/package.json`/`packages/db/package.json`/`vercel-setup.mjs` | `prelint`/`pretypecheck`= generate のみ。migrate/seed は web `prebuild`(VERCEL時のみ)。良 |
| 4 | 実行時プーラーに `pgbouncer=true` 自動付与 | `f69133e` | `packages/db/src/client.ts` | port 6543 かつ未指定時のみ付与。5432/ローカルは素通し。良 |
| 5 | Prisma エンジンを関数バンドルへ同梱 | `9dee42e` | `apps/web/next.config.mjs` | `outputFileTracingRoot`＋`outputFileTracingIncludes`。engine-not-found 解消 |

関連: `7f8c7a7`（ログイン/実行時例外を理由付き表示・生500回避）, `97d3e61`（pnpm-lock 同期）。

### env 依存・再発防止の検証
- vercel-setup は `if(!VERCEL) exit0` ＋ `SKIP_DB_SETUP=1` で local/CI/プレビューを保護。
- `lint`/`typecheck` は **DB 非依存**（generate のみ）。本番/開発/CI で壊れない。
- 修正5は **ローカルビルド成果物で実証**: `.next/server` の **112 個の関数トレース(.nft.json)**
  に `libquery_engine-*.so.node` を確認（login ルート含む）。Vercel では `rhel-openssl-3.0.x` 版が同梱される。

## 5. env 設計（本番=Vercel / Supabase）
| 変数 | 用途 | 本番値の指針 |
|------|------|--------------|
| `DATABASE_URL` | 実行時クエリ（プール） | Supabase Transaction pooler `:6543` + `?pgbouncer=true`（未付与でもコードが自動付与） |
| `DIRECT_URL` | migrate/seed（直接） | Supabase Session pooler `:5432` |
| `SESSION_SECRET` | セッションJWT署名(HS256) | **16文字以上の高エントロピー必須**（未設定だと開発用フォールバックになる→本番厳禁） |
| `EXTERNAL_SEND_ENABLED` | 外部送信マスタースイッチ | 既定 `false`。実送信は人間承認時のみ |
| `MAIL_PROVIDER` / `MAIL_FROM` / `SMTP_*` | メール | 既定 `log`。本番は smtp/sendgrid/resend |
| `LLM_PROVIDER` / `*_API_KEY` | LLM | 未設定なら `fake` に自動フォールバック |
| `NEXT_PUBLIC_MAPS_PROVIDER` | 地図 | 既定 `demo`（非Google地図） |
| `REDIS_URL` / `S3_*` | worker/ストレージ | worker 稼働時に必要 |

注: 認証は **`SESSION_SECRET`**（`JWT_SECRET` ではない）。Cookie名 `ikezaki_session`。

## 6. migration 設計
- 適用済み 7 件（`init` → `p0_foundations` → `p1_3` → `p1_4` → `p1_6` → `p1_7` → `p1_8`）。
  Phase 1-9/1-10/1-11 は既存スキーマ上の純ロジック/UIで**新規マイグレーション無し**。
- ローカル `app369`（195テーブル）と本番 Supabase の適用集合が**一致**。
- `migrate deploy` は **DIRECT_URL(5432)** を使用（pgbouncer のトランザクションモード回避）。
- 破壊操作なし（deploy は未適用分のみ適用）。

## 7. seed 方針
- `vercel-setup` は `SEED_ONLY_IF_EMPTY=1` で実行 → **既存データがあれば完全スキップ（非破壊）**。
  本番再デプロイのログで「既存データを検出したためシードをスキップ」を実証済み。
- ローカル `pnpm db:seed` は TRUNCATE+再生成（開発用途のみ）。本番では到達しない。
- seed は `tenantId` スコープでデモテナントに投入。マルチテナント分離を維持。

## 8. Vercel / Supabase 注意点
- ビルドの `prebuild` でのみ migrate/seed（generate→vercel-setup）。lint/typecheck には足さない。
- Prisma エンジンはモノレポで取りこぼされるため `outputFileTracingIncludes` で明示同梱（修正5）。
- `next start` スクリプトはポート **3000 ハードコード**（ローカル検証時は `next start -p <port>` で回避）。
- ビルド時メモリ: 広域グロブはトレース収集で OOM 誘発。`@prisma+client@*` に限定済み。

## 9. ローカル検証結果（最終・全修正反映後）
| # | コマンド | 結果 |
|---|----------|------|
| 1 | `pnpm db:generate` | ✅ |
| 2 | `pnpm typecheck` | ✅ web/worker/db |
| 3 | `pnpm test`(unit) | ✅ 20ファイル / **168 passed** |
| 4 | `pnpm lint` | ✅ exit 0 |
| 5 | `pnpm build` | ✅ 成功（BUILD_ID生成・トレースにエンジン同梱を実証） |
| 6 | `pnpm --filter @hokko/db test:integration` | ✅ 11ファイル / **67 passed**（本番同一の7マイグレ済DB） |

※ 統合テスト中の `prisma:error` は「重複 idempotencyKey を拒否する」ことを検証する**意図的な期待エラー**（テストは pass）。
※ E2E(Playwright) はサンドボックスのブラウザDL制約で未実行 → 代替として下記 HTTP スモークを実施。

## 10. 本番スモークテスト（HTTP・署名Cookie / ローカル本番ビルド）
ローカルで本番ビルド成果物を起動し、署名済 `ikezaki_session` Cookie で検証。
| 観点 | 結果 |
|------|------|
| `/login` 表示 | ✅ 200 |
| 未認証で保護ページ | ✅ `/dashboard`,`/planning-hokko`,`/finance/bridge`,`/approvals` → 307（/loginへ誘導） |
| OWNER ダッシュボード | ✅ `/dashboard`,`/dashboard/ceo` 200 |
| OWNER Golden Path | ✅ `/planning-hokko`,`/operations/events` 200 |
| OWNER Finance | ✅ `/finance/bridge`,`/finance/invoice-candidates`,`/finance/cashflow` 200 |
| OWNER 承認/LeadMap/顧客 | ✅ `/approvals`,`/leadmap/leads`,`/customers` 200 |
| RBAC: STAFF が `/admin/users` | ✅ 修正後は「閲覧権限がありません」（**データ非表示**） |
| RBAC: STAFF が機密admin | ✅ `data-access-logs`/`danger-actions`/`audit` で拒否表示 |
| 外部送信 | ✅ `EXTERNAL_SEND_ENABLED=false` 既定（実送信は承認時のみ） |

### 本番（Vercel）側
- 認証 → ログイン → ダッシュボードは利用者により本番URLで確認済み。
- migrate(7件) / seed(初回) / build は本番ログで成功確認済み。
- ※ Vercel ランタイムログの継続監視は手動確認が必要。

## 11. 禁止ファイル・秘密情報チェック結果
- トラッキング中の `.env`/`.env.local`/`.env.production`/`.next`/`node_modules`/`*.tsbuildinfo`: **無し**。
- `.env.example` はプレースホルダのみ（実シークレット無し）。`.env`/`.env.local` は `.gitignore` 済。
- 接続文字列/Supabaseホスト/`sb_secret`/`service_role`/`JWT_SECRET`/Vercel token: **トラッキング対象に混入無し**。
- **検出: `dump.rdb`（Redisダンプ）が追跡されていた → 本ゲートで untrack＋`.gitignore` 追加（`dump.rdb`,`*.rdb`）。**
  - ※ サンドボックスの `.env` はローカル `localhost:5432/app369` を指し、本番資格情報は含まれていなかった（本番資格は Vercel のみ）。

## 12. 旧名称「369」再混入チェック結果
- `apps/`・`packages/` のコード: **0 件**（リネーム完了済み）。
- `docs/audit/` 内 8 件は **「369→IKEZAKI OS」移行を説明する歴史的記述**であり再混入ではない → 修正不要。
- リポジトリ名 `369` / DB名 `app369` はインフラ識別子の許容例外。

## 13. main 取り込み判断
- **コード品質判定: GO（取り込み可）** — 6検証 green / secret無し / 禁止ファイル解消 / RBAC欠陥修正 / スモーク良好。
- **ただし `main` が存在しない**ため、利用者の想定した `git merge main` は実行不能。
  取り込み＝「検証済みコミットから **新規 `main` を作成して push**」となる。
  併せて以下は**運用上の意思決定が必要（本ゲートでは未実施）**:
  - GitHub デフォルトブランチを `main` に切替えるか。
  - Vercel の Production Branch を `main` に切替えるか（現状は `claude/friendly-dijkstra-un6l9t`）。
- → main 作成の実行可否は利用者の承認後に行う。

## 14. 残リスク
- `main`/デフォルトブランチ/Vercel Production Branch の整合は未確定（§13）。
- E2E(Playwright) はサンドボックス制約で未実行（HTTP スモークで代替）。
- Vercel Native Checks の TypeCheck（隔離 install）が別系統で失敗する事象あり（本ビルドは成功・公開はブロックしない）。
- ローカル `next start` のポート 3000 ハードコード（運用影響なし、検証時の注意）。
- Vercel ランタイムログの継続監視は手動。

## 15. 次にやること
1. 利用者承認のうえ `main` を検証済みコミットから作成・push（必要ならデフォルト/Vercel Production も切替）。
2. main push 後、Vercel 本番デプロイのログ（build/migrate/engine/auth/runtime error）を確認。
3. Vercel Native Checks の TypeCheck 失敗（隔離 install）の解消は別タスクで。
4. 以降の機能開発（Phase 1-12 候補）は main 確定後に着手。

## 16. main ブランチ新規作成の実行記録（2026-06-24）
利用者承認（Option 1）に基づき、検証済み HEAD から `main` を新規作成して push した。
**GitHub default branch / Vercel Production Branch の切替は未実施（手動判断のため自動実行せず）。**

- 作成元 HEAD: `8fbb98b`（= Phase 1-11 `8164ae1` + 安定化修正5件 + 本ゲート修正3件）
- 手順: `git switch -c main` → `git push -u origin main`（**origin/main を新規作成**）
- **main と `claude/friendly-dijkstra-un6l9t` は同一 HEAD `8fbb98b`**（ローカル・origin とも一致を確認）
- **main 上の6検証（再実行）**: db:generate ✅ / typecheck ✅ / test(unit) 168 ✅ / lint ✅ / build ✅ / integration 67 ✅
- 禁止ファイル: なし（`dump.rdb` 解消済み）／ secret 実値: なし（`docker-compose.yml`・`.env.example` は開発用プレースホルダ）／ コード「369」再混入: 0 件
- **未実施（ダッシュボードでの手動確認・実施が必要）**:
  1. GitHub **default branch** を `main` へ変更: Settings → Branches → Default branch → `main` に切替 → 確認（以降 PR の base が main）。
  2. Vercel **Production Branch** を `main` へ変更: Settings → Git → Production Branch → `main` → Save → main push で本番デプロイ確認（build/migrate/engine/auth/runtime）。
- 注意: 切替前は引き続き `claude/friendly-dijkstra-un6l9t` が Vercel 本番ソース。**`main` への push だけでは本番は切替わらない**（main はプレビュー扱い）。両ブランチは同一HEADのため内容差異はない。

## 17. Post-Switch Verification Gate（切替後の足場確認・2026-06-24）
利用者が **GitHub default branch を `main`** に、**Vercel の Production Branch（Settings → Environments → Production → Branch Tracking）を `main`** に切替えた後の確認記録。
Phase 1-12 の機能開発には進まず、切替の整合・main 上の再検証・本番ビルドスモーク・RBAC を確認した。

### 17.1 切替の整合（origin / default branch）
- `git ls-remote --symref origin HEAD` → **`ref: refs/heads/main`**（remote HEAD が main を指す）。
- GitHub API（repo メタ）→ **`default_branch: "main"`**（独立確認）。
- 全参照が同一 HEAD **`edeabf8`** で一致: origin HEAD / `main`(local) / `origin/main` / `claude/friendly-dijkstra-un6l9t`(local) / `origin/claude/...`。
- `main` は §16 作成時の `8fbb98b` に §16 記録コミット `edeabf8` を載せた状態。`8fbb98b`→`edeabf8` の差分は本 doc のみ（コード差分ゼロ）。

### 17.2 main 上での 6 検証（再実行・HEAD=`edeabf8`）
フレッシュなコンテナのため stock postgres-16 を起動し、`localhost` を trust 認証化、`app369` に 7 マイグレーションを適用してから実行（pgvector は schema が `Float[]` 採用のため不要）。
| # | コマンド | 結果 |
|---|----------|------|
| 1 | `pnpm db:generate` | ✅ Prisma Client v6.19.3 生成 |
| 2 | `pnpm typecheck` | ✅ web / worker / db |
| 3 | `pnpm test`(unit) | ✅ 20 ファイル / **168 passed** |
| 4 | `pnpm lint` | ✅ exit 0（Pages dir 警告は無害な Next plugin 通知） |
| 5 | `pnpm build` | ✅ 成功・BUILD_ID `3cXS30ybXT1-QonrU8cWP`・**114 個の関数トレース(.nft.json)に `libquery_engine` 同梱**（engine-not-found 対策有効） |
| 6 | `pnpm --filter @hokko/db test:integration` | ✅ 11 ファイル / **67 passed**（適用済み 7 マイグレ DB） |

※ 統合テストの `prisma:error` は重複 idempotencyKey 拒否を検証する**意図的な期待エラー**（test は pass）。

### 17.3 本番スモーク
- **ライブ本番 URL（`https://369-web.vercel.app`）はサンドボックスのegressポリシーで遮断**（agent proxy が CONNECT に 403／allowlist 外）。README 指示に従い retry/迂回せず**ブロックを報告**。→ ライブ URL のスモークは**利用者がブラウザ／Vercel デプロイログで確認**する。
- 代替として **ローカル本番ビルド成果物**（`next start -p 3939`・root `.env` 注入）に対し、署名済 `ikezaki_session` Cookie で検証（doc §10 と同等。いま `main` にある正にそのコードの本番ビルドが配信されることを実証）。
  | 観点 | 結果 |
  |------|------|
  | `/login`（公開） | ✅ 200 |
  | 未認証で保護ページ | ✅ `/dashboard`,`/planning-hokko`,`/finance/bridge`,`/approvals`,`/leadmap/leads`,`/customers` → **307**（/login へ） |
  | OWNER 認証 | ✅ 12 ページ 200（`/dashboard`,`/dashboard/ceo`,`/planning-hokko`,`/operations`,`/operations/events`,`/finance/bridge`,`/finance/invoice-candidates`,`/finance/cashflow`,`/approvals`,`/leadmap/leads`,`/customers`,`/admin/users`） |

### 17.4 RBAC 認可ガード（負験・対比）
| 主体 | ページ | 結果 |
|------|--------|------|
| STAFF(`sales@`) | `/admin/users`・`/admin/data-access-logs`・`/admin/danger-actions`・`/admin/audit` | ✅ いずれも「権限がありません」表示・**機密データ非露出** |
| STAFF(`sales@`) | `/dashboard`（自スコープ） | ✅ 200 |
| OWNER(`ceo@`) | `/admin/users` | ✅ 200・拒否文言なし・**実ユーザー4件を表示**（ガードがロール感応であることを対比で実証） |

### 17.5 判定と残作業
- **コード／ビルド／データ層の足場は GO**：main 上で 6 検証 green・本番ビルド成果物のHTTPスモーク良好・RBAC ガード有効・作業ツリー clean・secret/禁止ファイル混入なし。
- **利用者側で要確認（サンドボックス不可）**：`main` への push を契機とした **Vercel 本番デプロイのログ**（build 成功 / migrate pending 無し / Prisma engine error 無し / 認証 / runtime error）。ライブ URL は egress ポリシーで本サンドボックスから到達不可のため。
- 以降の Phase 1-12 機能開発は、上記 Vercel 本番ログ確認後に着手する。

## 18. Vercel Production Branch `main` 切替後の本番確認完了（利用者確認・2026-06-24）
§17 の残作業（ライブ本番のデプロイログ／URL スモーク）は egress ポリシーによりサンドボックスから到達不可のため、
**利用者がブラウザ／Vercel 画面で確認**した結果を以下に記録する。これにより Release Stabilization Gate は**完全クローズ**。

### 18.1 Vercel Production Deployment
| 項目 | 確認結果 |
|------|----------|
| Production Branch / Branch Tracking | **`main`** |
| 最新 Production Deployment の Branch | **`main`** |
| 最新 Production Deployment の Status | **Ready** |
| Build | **成功** |
| Prisma engine error | **なし** |
| migrate error | **なし** |
| runtime error | **なし** |

### 18.2 本番 URL スモーク（`https://369-web.vercel.app`・実ブラウザ）
| 観点 | 結果 |
|------|------|
| `/login` 表示 | ✅ OK |
| 社長（OWNER）アカウントでログイン | ✅ OK |
| `/dashboard` ／ `/dashboard/ceo` | ✅ OK |
| `/planning-hokko` | ✅ OK |
| `/operations/events` | ✅ OK |
| `/finance/bridge` ／ `/finance/invoice-candidates` ／ `/finance/cashflow` | ✅ OK |
| `/approvals` | ✅ OK |
| `/leadmap/leads` | ✅ OK |
| `/customers` | ✅ OK |
| OWNER で `/admin/users` 表示 | ✅ OK |
| STAFF で `/admin/users` 拒否表示 | ✅ OK |

### 18.3 判定
- **Release Stabilization Gate: クローズ（GO）**。ライブ本番（Vercel・`main` ソース）で、ローカル検証（§17）と
  同一の挙動（認証・全モジュール表示・RBAC 認可ガード）を実機確認。
- 本番ソース＝`main`（検証済み系列）。build / migrate / Prisma engine / runtime いずれもエラーなし。
- → **Phase 1-12 以降の機能開発に着手可能**（ゲート外の別タスク）。本足場固めはこれで完了。

## 19. Phase 1-12 着手（ゲート後の最初の機能・2026-06-24）
Release Stabilization Gate クローズ後、最初の機能開発として **Phase 1-12: Golden Path KPI Executive Dashboard** を実装。
新規DBモデルゼロ・横展開なし・既存モデル集約のみ・集計は lib に分離（page.tsx は表示のみ）・finance 機密は lib 段階で redact。
6検証 green（unit 186 / integration 73 / build 成功）。詳細は `13_planning_hokko_golden_path.md` §Phase 1-12 と `10_next_implementation_plan.md`。

## 20. Phase 1-13 本番デプロイ確認完了（利用者確認・2026-06-24）
Phase 1-13（Golden Path Action Deep Links ＋ `EventProject.completedAt` ＋ Approval 種別分離）を main へ push 後、
利用者がブラウザ／Vercel 画面で本番（`main` ソース）を確認した結果を記録する。**`completedAt` の migration を含む初の本番デプロイ**。

### 20.1 Vercel Production Deployment
| 項目 | 確認結果 |
|------|----------|
| Commit | **`246e2be`** |
| Branch | **`main`** |
| Status | **Ready** |
| Build | **成功** |
| Prisma `migrate deploy` | **成功** |
| `EventProject.completedAt` migration（`20260624184937_p1_13_event_completed_at`・1列追加） | **成功** |
| Prisma engine error | **なし** |
| Runtime error | **なし** |

### 20.2 本番 URL スモーク（実ブラウザ）
| 観点 | 結果 |
|------|------|
| `/login` | ✅ OK |
| `/dashboard/ceo` | ✅ OK |
| `/planning-hokko` | ✅ OK |
| `/operations/events` ／ `/operations/events/[id]` | ✅ OK |
| Golden Path KPI 表示 | ✅ OK |
| 「今すぐ見るべき案件」表示 | ✅ OK |
| 是正アクションボタン表示 | ✅ OK |
| Event detail のアンカー遷移（#risks 等） | ✅ OK |
| OWNER で finance 系アクション表示 | ✅ OK |
| STAFF で finance 系アクション非表示 | ✅ OK |

### 20.3 判定
- **Phase 1-13 本番反映 完了（GO）**。`completedAt` の追加 migration が本番で安全に適用され、是正アクション導線・アンカー遷移・finance 権限制御（OWNER 表示／STAFF 非表示）が実機で期待どおり動作。
- build / migrate / engine / runtime いずれもエラーなし。本番ソース＝`main`（`246e2be`）。
- → **Phase 1-14 以降の機能開発に着手可能**（別タスク。本記録は本番確認のみ）。
