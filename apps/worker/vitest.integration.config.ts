import { defineConfig } from 'vitest/config';

// BullMQ 実 queue 統合テスト（要・loopback Redis / REDIS_TEST_URL 既定 redis://127.0.0.1:6390）。
// 実行: pnpm --filter @hokko/worker test:integration
// CI には Redis service が無いため未収載（BULLMQ_REAL_QUEUE_EVIDENCE_GAP の縮小はローカル実測 evidence）。
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
