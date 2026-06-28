# BLOCKERS — IKEZAKI OS

> 進行を妨げる事象と回避策。解消したら「解消済み」へ移す。

## 環境（サンドボックス）

### B-01 Prisma エンジンバイナリの自動DL不可（回避策あり）
- 症状: `pnpm install` の `@prisma/engines` postinstall が `ECONNRESET`（Node ダウンローダが proxy 経由のDLを完了できない）。`prisma generate`/typecheck/build/integration が初期状態では不可。
- 回避策（本セッションで実施）: `pnpm install --frozen-lockfile --ignore-scripts` で全パッケージ配置後、`curl --cacert /root/.ccr/ca-bundle.crt` で `binaries.prisma.sh` からエンジン2種（query/schema, `debian-openssl-3.0.x`）を取得して `.pnpm/@prisma+engines@6.19.3/.../@prisma/engines/` に配置。`PRISMA_QUERY_ENGINE_LIBRARY`/`PRISMA_SCHEMA_ENGINE_BINARY`/`PRISMA_CLI_QUERY_ENGINE_TYPE=library` を指定して generate/typecheck/build を実行。
- 影響: ローカル検証のみ。Vercel 本番ビルドは `rhel-openssl-3.0.x` 版を同梱（既存対策）で別系統のため無関係。

### B-02 統合テスト用 Postgres は手動起動が必要
- 症状: フレッシュコンテナでは Postgres 未起動・`.env` 無し。
- 回避策: `/usr/lib/postgresql/16/bin/initdb`（postgres ユーザーで `-A trust`）→ `pg_ctl start`（5432）→ `createdb app369` → `prisma migrate deploy`（DATABASE_URL/DIRECT_URL=`postgresql://postgres@localhost:5432/app369`）→ integration 実行。
- ※ E2E(Playwright) はブラウザDL不可のため未実行（既存方針どおりHTTPスモーク/手動確認で代替）。

## 解消済み
- （なし）
