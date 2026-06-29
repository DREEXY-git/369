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

## 21. Phase 1-14 本番デプロイ確認完了（利用者確認・2026-06-24）
Phase 1-14（Golden Path Inline Corrective Actions）を main へ push 後、利用者が本番（`main` ソース）を実機確認した結果を記録する。
**今回は schema 変更なし＝migration なし**（pending なし）。

### 21.1 Vercel Production Deployment
| 項目 | 確認結果 |
|------|----------|
| Commit | **`8b71d07`** |
| Branch | **`main`** |
| Status | **Ready** |
| Build | **成功** |
| Prisma `migrate deploy` | **pending なし / schema 変更なし** |
| Prisma engine error | **なし** |
| Runtime error | **なし** |

### 21.2 本番 URL スモーク（実ブラウザ）
| 観点 | 結果 |
|------|------|
| `/dashboard/ceo` ／ `/planning-hokko` ／ `/operations/events` ／ `/operations/events/[id]` | ✅ OK |
| `#logistics` 物流タスク「完了」ボタン表示 | ✅ OK |
| 物流完了後に案件詳細へ戻る ／ `status=done` 反映 | ✅ OK |
| `#risks` リスク「解消」ボタン表示 | ✅ OK |
| `/invoices/[id]` 送信承認申請 ／ 送信承認待ち ／ 承認済み送信実行 導線 | ✅ OK（壊れていない） |
| 入金記録フォーム ／ 延滞ヒント表示 | ✅ OK |
| OWNER で finance 系アクション表示 | ✅ OK |
| STAFF で finance 系アクション非表示 | ✅ OK |

### 21.3 維持確認（壊していないこと）
- **外部送信ゲート維持**: 請求書外部送信は `invoice_send` 申請→承認→実行のみ。`EXTERNAL_SEND_ENABLED`・`invoice_finalize`/`invoice_send` 分離は不変。
- **督促メール送信は未実装のまま**（延滞表示＋入金記録導線まで。能動的外部アウトリーチは追加なし）。

### 21.4 判定
- **Phase 1-14 本番反映 完了（GO）**。インライン是正（物流完了・リスク解消・Finance Bridge・送信承認申請・入金記録）が実機で動作し、外部送信ゲートと finance 権限制御（OWNER 表示／STAFF 非表示）を維持。
- build / migrate（pending なし）/ engine / runtime いずれもエラーなし。本番ソース＝`main`（`8b71d07`）。
- → **Phase 1-15 以降は別タスク。今回は本番確認の記録のみで、機能開発には着手しない。**

## 22. Phase 1-15 本番デプロイ確認完了（利用者確認・2026-06-28）
Phase 1-15（督促/Dunning）の安全是正コミット `ed1c30d`（督促 server action に `finance:read` 必須化＋会社名の `Tenant.name`/「請求元」汎用化）を `main` へ push 後、
利用者がブラウザ／Vercel 画面で本番（`main` ソース）を確認した結果を記録する。
**確認は利用者の Vercel 画面・実ブラウザによるもので、サンドボックスからの本番到達確認ではない**（サンドボックスは本番URL/Vercelとも egress 403 で到達不可）。本番DB操作・実メール送信は発生していない。

### 22.1 Vercel Production Deployment
| 項目 | 確認結果 |
|------|----------|
| Commit | **`ed1c30d`** |
| Branch | **`main`** |
| Status | **Ready** |
| Build | **成功** |
| Prisma `migrate deploy` | **pending なし / schema 変更なし**（`ed1c30d` は migration 追加なし） |
| Prisma engine error | **なし** |
| Runtime error | **なし** |

### 22.2 本番 URL スモーク（利用者ブラウザ・検証用請求書）
| 観点 | 結果 |
|------|------|
| `/login` | ✅ OK |
| OWNER ログイン | ✅ OK |
| `/invoices` | ✅ OK |
| 確認に使った請求書 | 検証用請求書（実顧客請求書は不使用） |
| `/invoices/[id]#dunning`（入金確認・督促） | ✅ OK |
| 督促下書き作成 | ✅ OK |
| 送信承認申請 | ✅ OK |
| `/approvals` に `dunning_send` 表示 | ✅ OK |
| 承認後の送信/記録 | ✅ **logged / 記録済み**（`EXTERNAL_SEND_ENABLED=false`） |
| Receivable が `collected` に変わらない | ✅ OK |
| STAFF で同じ請求書 URL | ✅ **finance 機密拒否** |
| STAFF で `#dunning` カード非表示 | ✅ OK |
| STAFF が Golden Path 経由でも督促アクション非表示 | ✅ OK |
| 意図しない実メール送信 | ✅ **なし** |

### 22.3 維持確認（壊していないこと）
- **外部送信ゲート維持**：督促送信は `dunning_send` 申請→承認→`executeApprovedAction`（二重実行防止）。`EXTERNAL_SEND_ENABLED=false` により**実メール送信なし（logged のみ）**。
- **finance 機密保護維持**：督促 server action は `invoice:update` かつ `finance:read`。STAFF は finance:read 非保有のため server 側で遮断＋invoice detail ABAC＋Golden Path の finance:read フィルタで多層に非表示。
- **Receivable 不変**：督促送信だけでは `collected` にしない（入金時のみ）。
- PII / secret は記録していない。実顧客ではなく検証用請求書で確認。

### 22.4 判定
- **Phase 1-15 本番反映 完了（GO）**。本番ソース＝`main`（`ed1c30d`）。build / migrate（pending なし・schema 変更なし）/ engine / runtime いずれもエラーなし。
- OWNER 督促フロー（下書き→承認申請→承認→送信/記録 logged）、STAFF 権限制御（finance 機密拒否・#dunning 非表示・Golden Path 非表示）、外部送信ゲート、Receivable 不変を**実機確認**。
- 次タスク候補：
  - `recordPaymentAction` / 請求書外部送信 action の `finance:read` server 側統一（dunning と同型の直叩き耐性）
  - UsageEvent / 課金連携（現状 TODO）
  - 本番 E2E または手動スモークの定型化

## 23. Phase 1-16 本番デプロイ確認完了（利用者確認・2026-06-28）
Phase 1-16候補（請求・入金系 server action の finance 権限境界統一）`addbd82` を `main` へ push 後、
利用者がブラウザ／Vercel 画面で本番（`main` ソース）を確認した結果を記録する。
**確認は利用者の Vercel 画面・実ブラウザによるもので、サンドボックスからの本番到達確認ではない**（サンドボックスは本番URL/Vercel とも egress 403 で到達不可）。本番DB操作・実メール送信は発生していない。`addbd82` は schema 変更／migration 追加なし。

### 23.1 Vercel Production Deployment
| 項目 | 確認結果 |
|------|----------|
| Commit | **`addbd82`** |
| Branch | **`main`** |
| Status | **Ready** |
| Build | **成功** |
| Prisma `migrate deploy` | **pending なし / schema 変更なし** |
| Prisma engine error | **なし** |
| Runtime error | **なし** |

### 23.2 本番 URL スモーク（利用者ブラウザ・検証用/デモ用請求書）
| 観点 | 結果 |
|------|------|
| `/login` | ✅ OK |
| OWNER ログイン | ✅ OK |
| `/invoices` | ✅ OK |
| 確認に使った請求書 | 検証用/デモ用請求書（実顧客は不使用） |
| OWNER で請求書外部送信申請 | ✅ OK |
| `/approvals` に `invoice_send` 表示 | ✅ OK |
| OWNER で入金記録 | ✅ OK |
| Invoice / Receivable / FinanceEvent 連動 | ✅ OK |
| 送信だけで Receivable が collected にならない | ✅ OK |
| 入金していないのに collected にならない | ✅ OK |
| 既存 `#dunning` / 督促カード | ✅ OK（壊れていない） |
| `EXTERNAL_SEND_ENABLED` | **false** |
| 意図しない実メール送信 | ✅ **なし** |
| STAFF で請求書外部送信申請 | ✅ **不可** |
| STAFF で承認済み請求書外部送信実行 | ✅ **不可** |
| STAFF で入金記録 | ✅ **不可** |
| STAFF で `#dunning` カード非表示 | ✅ OK |
| STAFF が Golden Path 経由で finance アクション非表示 | ✅ OK |

### 23.3 維持確認（壊していないこと）
- finance 機密 server action（外部送信申請・承認済み外部送信実行・入金記録・督促 3 本）の server 側境界を **`invoice:update` かつ `finance:read`** に統一。STAFF 直叩き耐性を維持。
- 実行境界＝OWNER / EXECUTIVE / DEPARTMENT_MANAGER。ADMIN（invoice:update 非保有）/ READ_ONLY / EXTERNAL 系は実行不可。
- 外部送信ゲート（`invoice_send` 承認→`executeApprovedAction` 二重実行防止）・`EXTERNAL_SEND_ENABLED=false` で実メール送信なし。
- 入金記録の Invoice / Receivable / FinanceEvent 連動を維持。送信だけでは Receivable を collected にしない。
- 既存 dunning フローを壊していない。PII / secret は記録しない。実顧客ではなく検証用/デモ用請求書で確認。

### 23.4 判定
- **Phase 1-16候補 本番反映 完了（GO）**。本番ソース＝`main`（`addbd82`）。build / migrate（pending なし・schema 変更なし）/ engine / runtime いずれもエラーなし。
- OWNER 請求・入金フロー、STAFF 権限制御（外部送信申請/承認済み送信/入金記録すべて不可・#dunning 非表示・Golden Path 非表示）、外部送信ゲート、Receivable 不変、既存 dunning 継続を**実機確認**。
- 次タスク候補：
  - `createInvoiceAction` / `issueInvoiceAction` の権限方針判断
  - UsageEvent / 課金連携
  - 本番 E2E または手動スモークの定型化
  - finance 機密 server action の横断棚卸し継続

## 24. Phase 1-17 本番デプロイ確認完了（利用者確認・2026-06-28）
Phase 1-17（`issueInvoiceAction` に `finance:read` 必須化＝請求発行を finance 機密の確定操作として保護）`3ab1435` を `main` へ push 後、
利用者がブラウザ／Vercel 画面で本番（`main` ソース）を確認した結果を記録する。
**確認は利用者の Vercel 画面・実ブラウザによるもので、サンドボックスからの本番到達確認ではない**（サンドボックスは本番URL/Vercel とも egress 403 で到達不可）。本番DB操作・実メール送信は発生していない。`3ab1435` は schema 変更／migration 追加なし。

### 24.1 Vercel Production Deployment
| 項目 | 確認結果 |
|------|----------|
| Commit | **`3ab1435`** |
| Branch | **`main`** |
| Status | **Ready** |
| Build | **成功** |
| Prisma `migrate deploy` | **pending なし / schema 変更なし** |
| Prisma engine error | **なし** |
| Runtime error | **なし** |

### 24.2 本番 URL スモーク（利用者ブラウザ・検証用/デモ用請求書）
| 観点 | 結果 |
|------|------|
| OWNER で請求発行 | ✅ OK |
| 請求が DRAFT → ISSUED | ✅ OK |
| Receivable が起票される | ✅ OK |
| 請求発行で実メール送信 | ✅ なし |
| STAFF で請求発行 | ✅ **不可** |
| STAFF で請求外部送信申請 | ✅ **不可** |
| STAFF で入金記録 | ✅ **不可** |
| STAFF で `#dunning` カード | ✅ 非表示 |
| 請求下書き作成（create・据置） | ✅ 既存どおり動作 |
| 下書き作成だけで Receivable 起票 | ✅ されない |
| 下書き作成だけで外部送信 | ✅ されない |
| 意図しない実メール送信 | ✅ なし |

### 24.3 維持確認（壊していないこと）
- finance 機密 server action（外部送信申請・承認済み外部送信実行・入金記録・督促 3 本・**請求発行**）の server 側境界を **`invoice:update` かつ `finance:read`** に統一。STAFF 直叩き耐性を維持。
- 実行境界＝OWNER / EXECUTIVE / DEPARTMENT_MANAGER。STAFF / ADMIN（invoice:update 非保有）/ READ_ONLY / EXTERNAL 系は実行不可。
- **`createInvoiceAction` は据置**（invoice:create のまま）。DRAFT 生成のみで Receivable 起票・外部送信なし＝営業/STAFF の下書き作成を維持（案B）。
- 既存の請求外部送信・入金記録・dunning を壊していない。PII / secret は記録しない。実顧客ではなく検証用/デモ用請求書で確認。

### 24.4 判定
- **Phase 1-17 本番反映 完了（GO）**。本番ソース＝`main`（`3ab1435`）。build / migrate（pending なし・schema 変更なし）/ engine / runtime いずれもエラーなし。
- OWNER 請求発行フロー（DRAFT→ISSUED・Receivable 起票・実送信なし）、STAFF 権限制御（発行/外部送信申請/入金記録すべて不可・#dunning 非表示）、下書き作成据置（Receivable/送信なし）、既存 finance フロー継続を**実機確認**。
- 次タスク候補：
  - `/invoices` 一覧・`/invoices/new` の finance ABAC 判断
  - issue の承認ゲート化（案D）/ AutomationLevel・会社ポリシー化
  - UsageEvent / 課金連携
  - 本番 E2E または手動スモークの定型化

## 25. Phase 1-18 本番デプロイ確認完了（利用者確認・2026-06-28）
Phase 1-18（請求一覧・作成・`createInvoiceAction` を finance 境界に統一＝案C）`5789516` を `main` へ push 後、
利用者がブラウザ／Vercel 画面で本番（`main` ソース）を確認した結果を記録する。
**確認は利用者の Vercel 画面・実ブラウザによるもので、サンドボックスからの本番到達確認ではない**（egress 403）。本番DB操作・実メール送信は発生していない。`5789516` は schema 変更／migration 追加なし。

### 25.1 Vercel Production Deployment
| 項目 | 確認結果 |
|------|----------|
| Commit | **`5789516`** |
| Branch | **`main`** |
| Status | **Ready** |
| Build | **成功** |
| Prisma `migrate deploy` | **pending なし / schema 変更なし** |
| Prisma engine error | **なし** |
| Runtime error | **なし** |

### 25.2 本番 URL スモーク（利用者ブラウザ・検証用/デモ用データ）
| 観点 | 結果 |
|------|------|
| `/login` / OWNER ログイン / `/invoices` | ✅ OK |
| OWNER で請求一覧表示 | ✅ OK |
| OWNER で `/invoices/new` 表示 | ✅ OK |
| OWNER で請求下書き作成 | ✅ OK |
| 下書き作成だけで Receivable 起票 | ✅ されない |
| 下書き作成だけで外部送信 | ✅ されない |
| 既存 請求詳細 / 発行 / 外部送信申請 / 入金記録 / #dunning | ✅ OK（壊れていない） |
| STAFF で `/invoices` 一覧 | ✅ **finance 機密拒否／非表示** |
| STAFF で `/invoices/new` | ✅ **finance 機密拒否／非表示** |
| STAFF で請求下書き作成 | ✅ **不可** |
| STAFF で 請求詳細 / 発行 / 外部送信申請 / 入金記録 / #dunning | ✅ いずれも不可・非表示 |
| STAFF が Golden Path 経由で finance アクション | ✅ 非表示 |
| 意図しない実メール送信 | ✅ **なし** |

### 25.3 維持確認（壊していないこと）
- 請求モジュールの閲覧/作成面を finance 境界へ統一（一覧=ABAC `FINANCIAL_CONFIDENTIAL`、作成/`createInvoiceAction`=`invoice:create` かつ `finance:read`）。詳細・発行・外部送信・入金・dunning と一貫。
- STAFF の請求一覧/作成は停止。営業ドラフトは当面 Quote(見積) で担保。STAFF 向けマスク/スコープ請求は将来の案E。
- `issueInvoiceAction`・詳細ページ・invoice-send/payments/dunning・RBAC/ABAC 定義・schema は不変。
- ※ ADMIN / READ_ONLY の実機確認（一覧閲覧可・作成不可）は本フォームでは選択未確定（実機未確定）。設計・RBAC 上は ADMIN/READ_ONLY=一覧閲覧可（finance:read 保有）・作成不可（invoice:create 非保有）で、`p1_10_invoice_payment.itest.ts` の権限境界テストで担保済み。

### 25.4 判定
- **Phase 1-18 本番反映 完了（GO）**。本番ソース＝`main`（`5789516`）。build / migrate（pending なし・schema 変更なし）/ engine / runtime いずれもエラーなし。
- OWNER 請求一覧/作成/下書き（Receivable・送信なし）、STAFF 全面遮断（一覧・作成・詳細・発行・外部送信・入金・#dunning・Golden Path）、既存 finance フロー継続を**実機確認**。実送信なし。
- 残（実機未確定・別途確認推奨）: ADMIN/READ_ONLY の一覧閲覧可・作成不可。
- 次タスク候補：案E（STAFF向けマスク/スコープ請求ドラフト）、issue 承認ゲート化（案D）、AutomationLevel/会社ポリシー化、UsageEvent/課金、本番 E2E 定型化。

## 26. Phase 1-19 本番デプロイ確認完了（利用者確認・2026-06-28）
Phase 1-19（承認一覧 `/approvals` の閲覧を approval:approve 必須化＋ `/reports/morning` の財務 redact・非finance向けAI本文固定化）`491509a` を `main` へ push 後、
利用者がブラウザ／Vercel 画面で本番（`main` ソース）を確認した結果を記録する。
**確認は利用者の Vercel 画面・実ブラウザによるもので、サンドボックスからの本番到達確認ではない**（egress 403）。本番DB操作・実メール送信は発生していない。`491509a` は schema 変更／migration 追加なし。

### 26.1 Vercel Production Deployment
| 項目 | 確認結果 |
|------|----------|
| Commit | **`491509a`** |
| Branch | **`main`** |
| Status | **Ready** |
| Build | **成功** |
| Prisma `migrate deploy` | **pending なし / schema 変更なし** |
| Prisma engine error | **なし** |
| Runtime error | **なし** |

### 26.2 本番 URL スモーク（利用者ブラウザ）
| 観点 | 結果 |
|------|------|
| `/login` / OWNER ログイン | ✅ OK |
| 承認権限者で `/approvals` 表示・承認/却下フォーム | ✅ OK（PII/secret の不用意な表示なし） |
| STAFF で `/approvals` | ✅ **AccessDenied**（一覧・title・summary・請求番号・金額すべて非表示） |
| finance 権限者で `/reports/morning`（AI本文・財務指標・売上機会カード・非財務カード） | ✅ OK（従来どおり） |
| 非finance ユーザーで `/reports/morning` 財務指標非表示 | ✅ OK |
| 非finance ユーザーで AI本文が固定安全文・財務実値なし・0が実績に見えない | ✅ OK |
| 非finance ユーザーで「売上機会」カード非表示・非財務カードは表示 | ✅ OK |
| 既存 請求一覧/作成/詳細/発行/外部送信申請/入金記録/#dunning | ✅ OK（壊れていない） |
| 意図しない実メール送信 | ✅ **なし** |

### 26.3 維持確認（壊していないこと）
- `/approvals` は承認者（approval:approve）限定。承認 title/summary の請求金額・番号が非承認者(STAFF)に漏れない（Phase 1-18 の抜け穴を解消）。承認/却下・実行フローは不変。
- `/reports/morning` は finance:read 非保有者に財務を画面・AI入力・異常検知すべてで redact。非finance には固定安全文＋「売上機会」非表示で 0 の実績誤認も排除。非財務指標は維持。
- RBAC/ABAC 定義・schema・各 action・lib は不変。既存 finance フロー（請求一覧/作成/詳細/発行/外部送信/入金/dunning）継続。
- ※ READ_ONLY / EXTERNAL の `/approvals` 実機確認はフォーム未記入（実機未確定）。RBAC 上は approval:approve 非保有のため遮断（`p1_10_invoice_payment.itest.ts` の閲覧境界テストで担保）。

### 26.4 判定
- **Phase 1-19 本番反映 完了（GO）**。本番ソース＝`main`（`491509a`）。build / migrate（pending なし・schema 変更なし）/ engine / runtime いずれもエラーなし。
- 承認一覧の承認者限定、STAFF 遮断、朝報の finance redact（UI＋AI）、非finance の固定安全文・売上機会非表示、既存 finance フロー継続を**実機確認**。実送信なし。
- **これにより finance 境界統一ライン（Phase 1-15〜1-19）を本番確認込みでクローズ可能**。
- 次タスク候補（P2）：UsageEvent/課金、案E（STAFF向けマスク/スコープ請求）、issue 承認ゲート化（案D）、AutomationLevel/会社ポリシー化、本番 E2E 定型化。

## 27. Phase 1-22 本番デプロイ確認完了（利用者確認・2026-06-28）
Phase 1-22（**非課金の利用量台帳 `UsageEvent` の DB model ＋ migration ＋ 統合テストのみ**。emit・課金・決済は未実装）`d14ce1d` を `main` へ push 後、
利用者がブラウザ／Vercel 画面で本番（`main` ソース）を確認した結果を記録する。
**確認は利用者の Vercel 画面・実ブラウザによるもので、サンドボックスからの本番到達確認ではない**（egress 403）。本番DB操作・実メール送信は発生していない。
`d14ce1d` は schema 追加（`UsageEvent`）＋新規 migration（`20260628183116_p1_22_usage_event`・CREATE TABLE と index のみ・非破壊）を含み、Vercel デプロイ時に `migrate deploy` で本番に新規テーブルが作成される。

### 27.1 Vercel Production Deployment
| 項目 | 確認結果 |
|------|----------|
| Commit | **`d14ce1d`** |
| Branch | **`main`** |
| Status | **Ready** |
| Build | **成功** |
| Prisma `migrate deploy` | **成功** |
| Migration pending | **なし** |
| Prisma engine error | **なし** |
| Runtime error | **なし** |
| UsageEvent / Prisma migration related error | **なし** |

### 27.2 本番 URL スモーク（利用者ブラウザ）
| 観点 | 結果 |
|------|------|
| `/login` | ✅ OK |
| OWNER ログイン | ✅ OK |
| `/invoices` | ✅ OK |
| `/approvals` | ✅ OK |
| `/reports/morning` | ✅ OK |
| `/finance` | ✅ OK |
| `/planning-hokko` | ✅ OK |

### 27.3 既存 finance / invoice フローの回帰確認
| 観点 | 結果 |
|------|------|
| 既存の請求一覧 | ✅ OK |
| 既存の請求作成 | ✅ OK |
| 既存の請求詳細 | ✅ OK |
| 既存の請求発行 | ✅ OK |
| 既存の請求外部送信申請 | ✅ OK |
| 既存の入金記録 | ✅ OK |
| 既存 #dunning / 督促カード | ✅ OK |

### 27.4 UsageEvent 追加による影響確認
| 観点 | 結果 |
|------|------|
| UsageEvent テーブル追加による画面影響 | ✅ なし |
| 課金画面が新規表示されていない | ✅ OK |
| 決済画面が新規表示されていない | ✅ OK |
| サブスク画面が新規表示されていない | ✅ OK |
| UsageEvent 管理画面が新規表示されていない | ✅ OK |

### 27.5 課金・決済・emit が発生していないこと
| 観点 | 結果 |
|------|------|
| 課金処理 | ✅ なし |
| 決済処理 | ✅ なし |
| サブスクリプション処理 | ✅ なし |
| UsageEvent emit | ✅ なし |
| 意図しない実メール送信 | ✅ なし |
| Vercel 環境変数変更 | ✅ なし |

### 27.6 権限・既存セキュリティ確認
| 観点 | 結果 |
|------|------|
| OWNER で既存機能 | ✅ OK |
| STAFF で finance 機密が見えない | ✅ OK |
| STAFF で請求一覧/作成が遮断される | ✅ OK |
| STAFF で `/approvals` が AccessDenied | ✅ OK |
| 非finance ユーザーで朝報の財務値が非表示 | ✅ OK |

### 27.7 判定
- **Phase 1-22 本番反映 完了（GO）**。本番ソース＝`main`（`d14ce1d`）。
- **UsageEvent テーブル追加の migration 成功**／migration pending なし／engine・runtime error なし。
- 既存画面・既存 finance フロー（請求一覧/作成/詳細/発行/外部送信/入金/dunning）に**回帰なし**を実機確認。
- 権限境界（STAFF の finance 機密遮断・請求一覧/作成遮断・`/approvals` AccessDenied・非finance 朝報財務非表示）も維持。
- **課金・決済・サブスク・UsageEvent emit は未実装のまま**。UsageEvent はまだ「入れ物（DB テーブル）」のみで、利用量は記録されていない。
- 次候補は Phase 1-23「非課金 usage 記録 emit」（別途承認・金額なし）。**実課金はさらに先で、人間承認・設計 §11 の安全条件が必要**。

## 28. Phase 1-23 本番デプロイ確認完了（利用者確認・2026-06-29）
Phase 1-23（**非課金 UsageEvent emit の最小実装**＝LeadMap CSV export が1回発生したことを `export.generated`/`billing=usage_only` として記録）`399de6f` を `main` へ push 後、
利用者がブラウザ／Vercel 画面で本番（`main` ソース）を確認した結果を記録する。
**確認は利用者の Vercel 画面・実ブラウザによるもので、サンドボックスからの本番到達確認ではない**（egress 403）。本番DB操作・実メール送信・Prisma migrate 手動実行は発生していない。
`399de6f` は apps/web のコード変更（emit 1箇所＋helper）のみで schema 変更・migration 追加はない。

### 28.1 Vercel Production Deployment
| 項目 | 確認結果 |
|------|----------|
| Commit | **`399de6f`** |
| Branch | **`main`** |
| Status | **Ready** |
| Build | **成功** |
| Prisma `migrate deploy` | **不要** |
| Migration pending | **なし** |
| Prisma engine error | **なし** |
| Runtime error | **なし** |
| UsageEvent / LeadMap export related error | **なし** |

### 28.2 本番 URL スモーク（利用者ブラウザ）
| 観点 | 結果 |
|------|------|
| `/login` | ✅ OK |
| OWNER ログイン | ✅ OK |
| `/leadmap` | ✅ OK |
| `/invoices` | ✅ OK |
| `/finance` | ✅ OK |
| `/approvals` | ✅ OK |
| `/reports/morning` | ✅ OK |

### 28.3 LeadMap CSV export 確認
| 観点 | 結果 |
|------|------|
| LeadMap export CSV ダウンロード | ✅ OK |
| CSV ファイルが従来どおり取得できる | ✅ OK |
| CSV の内容が壊れていない | ✅ OK |
| Export 操作後に画面エラーが出ない | ✅ OK |
| Export 操作後に runtime error が出ない | ✅ OK |
| UsageEvent / recordUsageEvent 関連エラー | ✅ なし |

### 28.4 UsageEvent emit の安全確認
| 観点 | 結果 |
|------|------|
| UsageEvent emit 対象が LeadMap export のみ | ✅ OK |
| billing が usage_only | ✅ OK |
| billable_candidate が使われていない | ✅ OK |
| 課金処理 | ✅ なし |
| 決済処理 | ✅ なし |
| サブスクリプション処理 | ✅ なし |
| UsageEvent 管理画面が新規表示されていない | ✅ OK |
| 課金画面が新規表示されていない | ✅ OK |
| 決済画面が新規表示されていない | ✅ OK |
| サブスク画面が新規表示されていない | ✅ OK |

### 28.5 既存機能の回帰確認
| 観点 | 結果 |
|------|------|
| 既存の請求一覧 | ✅ OK |
| 既存の請求作成 | ✅ OK |
| 既存の請求詳細 | ✅ OK |
| 既存の請求発行 | ✅ OK |
| 既存の請求外部送信申請 | ✅ OK |
| 既存の入金記録 | ✅ OK |
| 既存 #dunning / 督促カード | ✅ OK |
| 承認一覧 `/approvals` | ✅ OK |
| 朝報 `/reports/morning` | ✅ OK |
| finance 画面 | ✅ OK |

### 28.6 権限・セキュリティ確認
| 観点 | 結果 |
|------|------|
| OWNER で LeadMap export | ✅ OK |
| STAFF で finance 機密が見えない | ✅ OK |
| STAFF で請求一覧/作成が遮断される | ✅ OK |
| STAFF で `/approvals` が AccessDenied | ✅ OK |
| 非finance ユーザーで朝報の財務値が非表示 | ✅ OK |

### 28.7 外部送信・環境確認
| 観点 | 結果 |
|------|------|
| 意図しない実メール送信 | ✅ なし |
| Vercel 環境変数変更 | ✅ なし |
| 本番DBを直接触ったか | ✅ 触っていない |
| Prisma migrate を手動実行したか | ✅ 実行していない |

### 28.8 判定
- **Phase 1-23 本番反映 完了（GO）**。本番ソース＝`main`（`399de6f`）。
- LeadMap CSV export が**従来どおり動作**。UsageEvent / recordUsageEvent 関連エラーなし。
- UsageEvent emit 対象は **LeadMap export のみ**。runtime route の billing は **usage_only**。**billable_candidate は使っていない**。
- **課金・決済・サブスクは未実装のまま**。UsageEvent 管理画面は新規表示なし。
- 既存 finance / invoice / dunning / approvals / morning に**回帰なし**を実機確認。権限境界も維持。
- 意図しない実メール送信なし。本番DB直接操作・Prisma migrate 手動実行なし。
- 次候補は「他の安全な発火点への段階展開」（別途承認）。**実課金はさらに先で、人間承認・設計 §11 の安全条件が必要**。

## 29. Phase 1-25 本番デプロイ確認完了（利用者確認・2026-06-29）
Phase 1-25（**AIOutput 非課金 UsageEvent emit**＝`saveAIOutputStandard` で AIOutput が1件生成されたことを `ai.output.generated` / `billing=usage_only` として記録）`11c224d` を `main` へ push 後、
利用者がブラウザ／Vercel 画面で本番（`main` ソース）を確認した結果を記録する。
**確認は利用者の Vercel 画面・実ブラウザによるもので、サンドボックスからの本番到達確認ではない**（egress 403）。本番DB操作・実メール送信・Prisma migrate 手動実行は発生していない。
`11c224d` は apps/web のコード変更（AIOutput emit 1箇所＋テスト/docs）のみで schema 変更・migration 追加はない。
※ 本記録は、未push のローカル記録コミットが揮発環境で失われたため、同一の受領実測値に基づき再作成したもの（コード `11c224d` は不変）。

### 29.1 Vercel Production Deployment
| 項目 | 確認結果 |
|------|----------|
| Commit | **`11c224d`** |
| Branch | **`main`** |
| Status | **Ready** |
| Build | **成功** |
| Prisma `migrate deploy` | **不要** |
| Migration pending | **なし** |
| Prisma engine error | **なし** |
| Runtime error | **なし** |
| UsageEvent / AIOutput related error | **なし** |

### 29.2 AIOutput / UsageEvent emit 確認
| 観点 | 結果 |
|------|------|
| AI出力が発生する既存機能 | ✅ OK |
| LeadMap AI分析など `saveAIOutputStandard` 経由のAI生成 | ✅ OK |
| AIOutput 保存後に画面エラーが出ない | ✅ OK |
| AIOutput 保存後に runtime error が出ない | ✅ OK |
| UsageEvent / recordUsageEvent 関連エラー | ✅ なし |

### 29.3 UsageEvent emit の安全確認
| 観点 | 結果 |
|------|------|
| UsageEvent emit対象に AIOutput が追加されている | ✅ OK |
| 既存の LeadMap export emit は維持されている | ✅ OK |
| billing が usage_only | ✅ OK |
| billable_candidate が使われていない | ✅ OK |
| 課金処理 | ✅ なし |
| 決済処理 | ✅ なし |
| サブスクリプション処理 | ✅ なし |

### 29.4 UI / Monetization 非表示確認
| 観点 | 結果 |
|------|------|
| UsageEvent管理画面が新規表示されていない | ✅ OK |
| 課金画面が新規表示されていない | ✅ OK |
| 決済画面が新規表示されていない | ✅ OK |
| サブスク画面が新規表示されていない | ✅ OK |

### 29.5 判定
- **Phase 1-25 本番反映 完了（GO）**。本番ソース＝`main`（`11c224d`）。
- AIOutput emit が本番で動作。`saveAIOutputStandard` 経由のAI生成が従来どおり動作。UsageEvent / recordUsageEvent 関連エラーなし。
- UsageEvent emit対象は **LeadMap export + AIOutput の2種類**。
- runtime route / runtime emit の billing は **usage_only**。**billable_candidate は使っていない**。metadata は **task/model のみ**。
- **課金・決済・サブスクは未実装のまま**。UsageEvent 管理画面は新規表示なし。
- 次候補は P1 候補（danger-actions export / 外部送信 sent / Webhook など）への段階展開（別途承認）。**実課金はさらに先で、人間承認・設計 §11 の安全条件が必要**。

## 30. Phase 1-27 本番デプロイ確認完了（利用者確認・2026-06-29）
Phase 1-27（**admin danger-actions export 非課金 UsageEvent emit**＝承認済み export 実行で ExportJob 作成・writeAudit 後に `export.generated` / `billing=usage_only` を記録）`35cd384` を `main` へ push 後、
利用者がブラウザ／Vercel 画面で本番（`main` ソース）を確認した結果を記録する。
**確認は利用者の Vercel 画面・実ブラウザによるもので、サンドボックスからの本番到達確認ではない**（egress 403）。本番DB操作・実メール送信・Prisma migrate 手動実行は発生していない。
`35cd384` は apps/web のコード変更（admin export emit 1箇所＋テスト/docs）のみで schema 変更・migration 追加はない。

### 30.1 Vercel Production Deployment
| 項目 | 確認結果 |
|------|----------|
| Commit | **`35cd384`** |
| Branch | **`main`** |
| Status | **Ready** |
| Build | **成功** |
| Prisma `migrate deploy` | **不要** |
| Migration pending | **なし** |
| Prisma engine error | **なし** |
| Runtime error | **なし** |
| UsageEvent / admin danger-actions export related error | **なし** |

### 30.2 本番ブラウザ確認
| 観点 | 結果 |
|------|------|
| `/login` | ✅ OK |
| OWNER ログイン | ✅ OK |
| `/admin/danger-actions` | ✅ OK |
| admin danger-actions 画面が開ける | ✅ OK |
| 承認済み export 実行 | ✅ OK |
| ExportJob 作成 | ✅ OK |
| 同じ承認リクエストの再実行 | ✅ already-executed で拒否（正常・二重実行防止） |
| Export 実行後に画面エラーが出ない | ✅ OK |
| Export 実行後に runtime error が出ない | ✅ OK |
| UsageEvent / recordUsageEvent 関連エラー | ✅ なし |

### 30.3 UsageEvent emit 安全確認
| 観点 | 結果 |
|------|------|
| UsageEvent emit対象に admin danger-actions export が追加されている | ✅ OK |
| 既存の LeadMap export emit は維持されている | ✅ OK |
| 既存の AIOutput emit は維持されている | ✅ OK |
| billing が usage_only | ✅ OK |
| billable_candidate が使われていない | ✅ OK |
| metadata が固定3値（scope/format/source）のみ | ✅ OK |
| req.payloadAfter 実値が metadata に入っていない | ✅ OK |

### 30.4 課金・決済・サブスクなし確認
| 観点 | 結果 |
|------|------|
| 課金処理 | ✅ なし |
| 決済処理 | ✅ なし |
| サブスクリプション処理 | ✅ なし |
| UsageEvent 管理画面が新規表示されていない | ✅ OK |
| 課金画面が新規表示されていない | ✅ OK |
| 決済画面が新規表示されていない | ✅ OK |
| サブスク画面が新規表示されていない | ✅ OK |

### 30.5 既存機能の回帰確認
| 観点 | 結果 |
|------|------|
| `/leadmap` | ✅ OK |
| `/invoices` | ✅ OK |
| `/finance` | ✅ OK |
| `/approvals` | ✅ OK |
| `/reports/morning` | ✅ OK |
| 既存 #dunning / 督促カード | ✅ OK |
| LeadMap export CSV | ✅ OK |
| AIOutput 生成機能 | ✅ OK |

### 30.6 権限・セキュリティ確認
| 観点 | 結果 |
|------|------|
| STAFF で finance 機密が見えない | ✅ OK |
| STAFF で請求一覧/作成が遮断される | ✅ OK |
| STAFF で `/approvals` が AccessDenied | ✅ OK |
| 非finance ユーザーで朝報の財務値が非表示 | ✅ OK |

### 30.7 外部送信・環境確認
| 観点 | 結果 |
|------|------|
| 意図しない実メール送信 | ✅ なし |
| Vercel 環境変数変更 | ✅ なし |
| 本番DBを直接触ったか | ✅ 触っていない |
| Prisma migrate を手動実行したか | ✅ 実行していない |

### 30.8 判定
- **Phase 1-27 本番反映 完了（GO）**。本番ソース＝`main`（`35cd384`）。
- admin danger-actions の承認済み export は**従来どおり動作**。ExportJob 作成 OK。
- 同じ承認リクエストの再実行は **already-executed で拒否**され、正常な二重実行防止。
- UsageEvent / recordUsageEvent 関連エラーなし。
- UsageEvent emit対象は **LeadMap export + AIOutput + admin danger-actions export の3種類**。
- billing は **usage_only**。**billable_candidate は使っていない**。metadata は **固定3値（scope/format/source）のみ**。
- **`req.payloadAfter` 実値・顧客情報・CSV本文・件数・金額・secret は UsageEvent metadata に保存していない**。
- **課金・決済・サブスクは未実装のまま**。既存機能・既存権限境界に**回帰なし**。
- 実メール送信・本番DB直接操作・Prisma migrate 手動実行・Vercel 環境変数変更なし。
- 次候補は P1（外部送信 sent / Webhook delivery）だが、**別途監査・人間承認が必要**。**実課金はさらに先で、人間承認・設計上の安全条件が必要**。
