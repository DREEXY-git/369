import { defineConfig } from 'vitest/config';

// BullMQ 実 queue 統合テスト（要・loopback Redis / REDIS_TEST_URL 既定 redis://127.0.0.1:6390）。
// 実行: pnpm --filter @hokko/worker test:integration
// CI: EMERGENCY Gate-0（V82/V83）で ci.yml の stage2_integration に ephemeral Redis service を追加し、
// 本テストを exact-head CI で実行する（従来の「CI に Redis service が無い」状態は解消）。
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
