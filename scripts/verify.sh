#!/usr/bin/env bash
# IKEZAKI OS — ローカル検証ワンショット（Phase 1-20）
# 目的: push 前に lint/typecheck/test/build をまとめて実行し、どのステップで失敗したか分かるようにする。
#
# 使い方（リポジトリルートで実行）:
#   ./scripts/verify.sh
#
# 安全方針:
#   - 本番 DB には接続しない（接続文字列・secret は表示しない）。
#   - 実メール送信・Vercel 操作・外部送信は行わない（このスクリプトは検証のみ）。
#   - E2E(Playwright) はデフォルトで実行しない（サンドボックスのブラウザ DL 制約のため）。
#       将来ローカルで動かす場合は最下部のコメント参照。
#
# 環境制約（重要）: 詳細と回避策は tasks/BLOCKERS.md を参照。
#   - B-01: Prisma エンジンの自動 DL がネットワーク制約で失敗することがある。
#       その場合は BLOCKERS.md B-01 の手順でエンジンを取得し、PRISMA_QUERY_ENGINE_LIBRARY 等を
#       export してから本スクリプトを実行する（このスクリプトはエンジン取得は行わない）。
#   - B-02: 統合テスト(*.itest.ts)はローカル Postgres が必要。本スクリプトのデフォルトには含めない
#       （単体 `pnpm test` のみ）。統合テストは別途 BLOCKERS.md B-02 の手順で実行する。
#   - TLS 検証無効化・proxy 迂回・本番 DB 接続は禁止。
#
# build を Vercel 用 DB セットアップから切り離すため SKIP_DB_SETUP=1 を既定で付与
#   （prebuild の vercel-setup.mjs は VERCEL 未設定 or SKIP_DB_SETUP=1 でスキップ。CLAUDE.md 参照）。

set -euo pipefail

# リポジトリルートへ移動（scripts/ の1つ上）。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

export SKIP_DB_SETUP="${SKIP_DB_SETUP:-1}"

step() { echo ""; echo "==================== $1 ===================="; }
fail() { echo ""; echo "❌ verify failed at: $1"; exit 1; }

echo "🔍 IKEZAKI OS verify start ($(pwd))"
echo "   ※ 本番DB非接続 / 実送信なし / E2Eは既定で実行しない（BLOCKERS.md 参照）"

step "1/5 prisma generate (pnpm db:generate)"
pnpm db:generate || fail "db:generate"

step "2/5 typecheck (pnpm typecheck)"
pnpm typecheck || fail "typecheck"

step "3/5 lint (pnpm lint)"
pnpm lint || fail "lint"

step "4/5 unit test (pnpm test)"
pnpm test || fail "test (unit)"

step "5/5 build (pnpm build)"
pnpm build || fail "build"

echo ""
echo "✅ verify passed — db:generate / typecheck / lint / test / build すべて成功"
echo "   （統合テストは別途: pnpm --filter @hokko/db test:integration ／ BLOCKERS.md B-02）"
echo "   （E2E は既定で未実行。将来ローカルで: pnpm test:e2e ／ BLOCKERS.md 参照）"
