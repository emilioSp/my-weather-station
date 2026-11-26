// Run API integration tests against local Supabase PostgreSQL and collect source coverage.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    env: {
      POSTGRES_HOST: '127.0.0.1',
      POSTGRES_PORT: '54322',
      POSTGRES_DB: 'postgres',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
    },
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
});
