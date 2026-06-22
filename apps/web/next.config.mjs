import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 単一のルート .env をロード（モノレポ全体で共有）
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@hokko/db', '@hokko/shared', '@hokko/ai', '@hokko/integrations'],
  serverExternalPackages: ['@prisma/client', '.prisma/client', 'nodemailer', 'bcryptjs'],
  eslint: {
    // lint は別途 `pnpm lint` で実行
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_MAPS_PROVIDER: process.env.NEXT_PUBLIC_MAPS_PROVIDER ?? 'demo',
  },
};

export default nextConfig;
