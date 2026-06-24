// Vercel デプロイ時のみ、本番DBへスキーマ反映と初回シードを安全に行うためのラッパー。
//
//  - VERCEL 環境変数が無い場合（ローカル/CI/サンドボックス）は何もしない（ビルドに影響を与えない）。
//  - VERCEL 環境では:
//      1) `prisma migrate deploy` … 未適用マイグレーションのみ適用（drop/reset なし・非破壊）。
//      2) `tsx prisma/seed.ts`     … 空DBのときのみ初回シード（SEED_ONLY_IF_EMPTY=1 で既存データは破壊しない）。
//  - migrate/seed は接続を直接接続(DIRECT_URL/5432)に寄せ、pgbouncer の副作用を避ける。
//  - 失敗時はそのまま例外を投げてビルドを失敗させる（接続不可のまま壊れた状態でデプロイしない）。
import { execSync } from 'node:child_process';

if (!process.env.VERCEL) {
  console.log('[vercel-setup] VERCEL 未設定のためスキップ（migrate/seed は実行しません）。');
  process.exit(0);
}

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!directUrl) {
  console.error(
    '[vercel-setup] DATABASE_URL / DIRECT_URL が未設定です。Vercel の環境変数に Supabase の接続文字列を設定してください。',
  );
  process.exit(1);
}

const run = (cmd, extraEnv = {}) =>
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...extraEnv } });

console.log('[vercel-setup] (1/2) prisma migrate deploy …');
run('pnpm exec prisma migrate deploy', { DATABASE_URL: directUrl });

console.log('[vercel-setup] (2/2) seed (空DBのときのみ) …');
run('pnpm exec tsx prisma/seed.ts', {
  SEED_ONLY_IF_EMPTY: '1',
  // シードは直接接続で実行（pgbouncer のトランザクションモードを避ける）。
  DATABASE_URL: directUrl,
});

console.log('[vercel-setup] 完了。');
