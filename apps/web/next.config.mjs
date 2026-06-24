import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 単一のルート .env をロード（モノレポ全体で共有）
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

// モノレポのルート（apps/web から 2 つ上）。ファイルトレースの基準に使う。
const monorepoRoot = resolve(__dirname, '../../');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@hokko/db', '@hokko/shared', '@hokko/ai', '@hokko/integrations'],
  serverExternalPackages: ['@prisma/client', '.prisma/client', 'nodemailer', 'bcryptjs'],
  // Vercel のサーバーレス関数に Prisma のクエリエンジン(.node)を確実に同梱する。
  // pnpm モノレポでは Next.js のファイルトレース(nft)が .pnpm 配下のネイティブ
  // エンジンを取りこぼし、実行時に
  //   "Prisma Client could not locate the Query Engine for runtime rhel-openssl-3.0.x"
  // となる（build/migrate/seed は通るのにログイン等の実行時クエリだけ落ちる）。
  // → トレースの基準をモノレポ直下に固定し、エンジンを明示的に include する。
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    // .pnpm ストア全体を走査しないよう、@prisma+client パッケージ配下に限定して include する。
    '**': [
      '../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**',
      '../../node_modules/.prisma/client/**',
    ],
  },
  eslint: {
    // lint は別途 `pnpm lint` で実行
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_MAPS_PROVIDER: process.env.NEXT_PUBLIC_MAPS_PROVIDER ?? 'demo',
  },
};

export default nextConfig;
