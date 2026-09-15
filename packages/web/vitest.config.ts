import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    coverage: {
      include: ['**/*.ts'],
      exclude: ['**/*.spec.ts', 'environment.ts', 'playwright.config.ts'],
      thresholds: {
        statements: 80,
        lines: 80,
        branches: 75,
        functions: 75,
      },
    },
  },
});
