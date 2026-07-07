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
  // F2 診断（doc137/roadmap38）: 失敗時の証跡を CI artifact として取得するため
  // html reporter を追加（既定 outputFolder=playwright-report）。list は開発時の可読性維持。
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    locale: 'ja-JP',
    // retries:0 のため on-first-retry では trace が取得できない。失敗時に trace/screenshot を
    // 保持する設定へ（診断用・test-results/ に出力・gitignore 済み・本番非接続）。
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
