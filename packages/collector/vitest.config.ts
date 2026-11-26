// Configure vitest when running builds or automated checks.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    // BEGIN/ROLLBACK test isolation shares one connection, so test transactions in the same file must not overlap.
    // file parallelization is safe because each test file gets its own connection and transaction.
    maxConcurrency: 1,
    coverage: {
      provider: 'v8',
      reporter: ['json', 'html', 'text-summary'],
      include: ['meters/**/*.ts', 'api/**/*.ts', 'repository/**/*.ts', 'errors/**/*.ts'],
    },
  },
});
