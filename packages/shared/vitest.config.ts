import { defineConfig } from 'vitest/config';
import { coverageThresholds } from './index.ts';

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
