import { defineConfig } from 'vitest/config';

// 統合テスト（要・稼働中の PostgreSQL / DATABASE_URL）。
// 実行: pnpm --filter @hokko/db test:integration
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/**/*.itest.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
