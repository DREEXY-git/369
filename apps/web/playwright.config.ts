import { defineConfig, devices } from '@playwright/test';

// E2E は稼働中の Web（pnpm start）と seed 済み DB を前提とする。
// 事前準備: pnpm db:migrate && pnpm db:seed && pnpm build
// 実行: pnpm test:e2e   （初回は `npx playwright install chromium` が必要）
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    locale: 'ja-JP',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
