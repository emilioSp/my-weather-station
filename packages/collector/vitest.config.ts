// Configure vitest when running builds or automated checks.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    fileParallelism: false, // shared Postgres
    // BEGIN/ROLLBACK test isolation shares one connection, so test transactions must not overlap.
    maxConcurrency: 1,
    coverage: {
      provider: 'v8',
      reporter: ['json', 'html', 'text-summary'],
      include: ['meters/**/*.ts', 'api/**/*.ts', 'db/**/*.ts', 'errors/**/*.ts'],
    },
  },
});
