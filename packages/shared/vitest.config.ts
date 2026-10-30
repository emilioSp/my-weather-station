// Configure vitest when running builds or automated checks.

import { defineConfig } from 'vitest/config';

import { coverageThresholds } from '#testing/coverage-thresholds.ts';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['json', 'html', 'text-summary'],
      include: ['**/*.ts'],
      exclude: ['testing/coverage-thresholds.ts'],
      thresholds: coverageThresholds,
    },
  },
});
