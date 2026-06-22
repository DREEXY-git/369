import { defineConfig } from 'vitest/config';

// Root Vitest config.
// - Unit tests (`*.test.ts`) are DB-free and run with `pnpm test`.
// - Integration tests (`*.itest.ts`) require a live Postgres (DATABASE_URL)
//   and are opt-in via `pnpm --filter @hokko/db test:integration`.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/*.itest.ts'],
    testTimeout: 20000,
  },
});
