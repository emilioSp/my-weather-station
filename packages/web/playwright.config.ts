// Configure playwright when running builds or automated checks.

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  use: {
    baseURL: 'http://127.0.0.1:4173/my-weather-station/',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: false,
  },
});
