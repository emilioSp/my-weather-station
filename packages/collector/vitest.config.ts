import { coverageThresholds } from '@wx/shared';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    fileParallelism: false, // shared Postgres
    coverage: {
      provider: 'v8',
      reporter: ['json', 'html', 'text-summary'],
      include: [
        'meters/**/*.ts',
        'api/**/*.ts',
        'db/**/*.ts',
        'errors/**/*.ts',
      ],
      thresholds: coverageThresholds,
    },
  },
});
