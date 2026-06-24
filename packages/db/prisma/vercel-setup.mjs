// Vercel デプロイ時のみ、本番DBへスキーマ反映と初回シードを安全に行うためのラッパー。
//
//  - VERCEL 環境変数が無い場合（ローカル/CI/サンドボックス）は何もしない（ビルドに影響を与えない）。
//  - VERCEL 環境では:
//      0) 接続文字列の形式を検証（パスワードは伏字で構造を出力し、原因を特定しやすくする）。
//      1) `prisma migrate deploy` … 未適用マイグレーションのみ適用（drop/reset なし・非破壊）。
//      2) `tsx prisma/seed.ts`     … 空DBのときのみ初回シード（SEED_ONLY_IF_EMPTY=1 で既存データは破壊しない）。
//  - migrate/seed は接続を直接接続(DIRECT_URL/5432)に寄せ、pgbouncer の副作用を避ける。
//  - 失敗時はそのまま例外を投げてビルドを失敗させる（接続不可のまま壊れた状態でデプロイしない）。
import { execSync } from 'node:child_process';

if (!process.env.VERCEL) {
  console.log('[vercel-setup] VERCEL 未設定のためスキップ（migrate/seed は実行しません）。');
  process.exit(0);
}

// "postgresql://USERINFO@HOST:PORT/DB?..." の "USERINFO@HOST:PORT" 部分を取り出す。
function authorityOf(raw) {
  const afterScheme = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  return afterScheme.split('/')[0].split('?')[0];
}

// 接続文字列を検証し、構造（パスワードは伏字）と問題点を分かりやすく出力する。
// P1013「invalid port number」等の不親切なエラーを、原因を特定できるメッセージに変える。
function inspectUrl(name, raw) {
  if (!raw) {
    console.error(`[vercel-setup] ${name} が未設定です。`);
    return false;
  }
  if (raw !== raw.trim()) {
    console.error(`[vercel-setup] ${name} の前後に空白/改行が含まれています。値を貼り直してください。`);
  }
  const value = raw.trim();

  // パスワード内の未エンコード記号（@ / 等）は P1013「invalid port number」の典型原因。
  // authority 内の "@" はちょうど1個（userinfo と host の区切り）であるべき。
  const authority = authorityOf(value);
  const atCount = (authority.match(/@/g) || []).length;
  if (atCount !== 1) {
    console.error(
      `[vercel-setup] ${name}: 接続URL内の "@" が ${atCount} 個あります（正しくは1個）。` +
        `パスワードに記号（@ / : ? # 等）が含まれると壊れます。` +
        `→ Supabase で DB パスワードを英数字のみに再設定するか、記号をURLエンコード（@ は %40 等）してください。`,
    );
    return false;
  }

  let u;
  try {
    u = new URL(value);
  } catch {
    console.error(
      `[vercel-setup] ${name}: 接続URLとして解釈できません。` +
        `記号入りパスワードのエンコード漏れ、余分なクォート/空白などを確認してください。`,
    );
    return false;
  }
  const proto = u.protocol.replace(':', '');
  console.log(
    `[vercel-setup] ${name} = ${proto}://${u.username}:***@${u.hostname}:${u.port || '(既定)'}${u.pathname}`,
  );
  if (proto !== 'postgresql' && proto !== 'postgres') {
    console.error(`[vercel-setup] ${name}: スキームが postgresql ではありません（${proto}）。`);
    return false;
  }
  if (u.port && !/^\d+$/.test(u.port)) {
    console.error(
      `[vercel-setup] ${name}: ポート番号が不正です（${u.port}）。:5432（直接/セッション）または :6543（プール）を指定してください。`,
    );
    return false;
  }
  return true;
}

const directUrl = (process.env.DIRECT_URL || process.env.DATABASE_URL || '').trim();
const databaseUrl = (process.env.DATABASE_URL || '').trim();

console.log('[vercel-setup] 接続文字列を検証します（パスワードは伏字）…');
const okDirect = inspectUrl('DIRECT_URL（migrate/seed 用）', directUrl);
inspectUrl('DATABASE_URL（実行時用）', databaseUrl);

if (!directUrl || !okDirect) {
  console.error(
    '[vercel-setup] migrate/seed 用の接続URLが不正のため中断します。' +
      'Vercel の Environment Variables で DATABASE_URL / DIRECT_URL を修正してください。',
  );
  process.exit(1);
}

const run = (cmd, extraEnv = {}) =>
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...extraEnv } });

console.log('[vercel-setup] (1/2) prisma migrate deploy …');
// migrate は直接接続(5432)で実行（pgbouncer のトランザクションモードを避ける）。
run('pnpm exec prisma migrate deploy', { DATABASE_URL: directUrl });

console.log('[vercel-setup] (2/2) seed (空DBのときのみ) …');
run('pnpm exec tsx prisma/seed.ts', {
  SEED_ONLY_IF_EMPTY: '1',
  // シードも直接接続で実行（pgbouncer のトランザクションモードを避ける）。
  DATABASE_URL: directUrl,
});

console.log('[vercel-setup] 完了。');
