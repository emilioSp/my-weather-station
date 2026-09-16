import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['json'],
      reportsDirectory: 'coverage/vitest',
      include: ['**/*.{ts,tsx}'],
      exclude: [
        '**/*.spec.ts',
        'environment.ts',
        'playwright.config.ts',
        'e2e/utils/*.ts',
      ],
    },
  },
});
