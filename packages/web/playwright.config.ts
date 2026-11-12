// Configure mocked browser checks and sequential real-Supabase tests with separate Vite servers.

import { randomUUID } from 'node:crypto';

import { defineConfig, devices } from '@playwright/test';

// Workers reload this config; inherit the coordinator's device name rather than generating another.
const supabaseDeviceName = process.env.WX_E2E_DEVICE_NAME ?? `e2e-smartphone-${randomUUID()}`;

process.env.WX_E2E_DEVICE_NAME = supabaseDeviceName;

const supabaseBaseURL = 'http://127.0.0.1:4174/my-weather-station/';

export default defineConfig({
  testDir: './tests',
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  use: {
    baseURL: 'http://127.0.0.1:4173/my-weather-station/',
  },
  projects: [
    // Mocked HTTP responses and visual snapshots — app on port 4173.
    {
      name: 'mocked-http-chromium',
      // Keep existing visual baseline filenames independent of the HTTP test grouping.
      snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-chromium-{platform}{ext}',
      testMatch: ['**/ui/*.spec.ts', '**/visual/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mocked-http-webkit',
      snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-webkit-{platform}{ext}',
      testMatch: ['**/ui/*.spec.ts', '**/visual/*.spec.ts'],
      use: { ...devices['Desktop Safari'] },
    },
    // Real local Supabase — app on port 4174.
    {
      name: 'chromium',
      testMatch: '**/e2e/*.spec.ts',
      workers: 1,
      metadata: { deviceName: supabaseDeviceName },
      use: { ...devices['Desktop Chrome'], baseURL: supabaseBaseURL },
    },
    {
      name: 'webkit',
      testMatch: '**/e2e/*.spec.ts',
      // Both browser projects share run-specific devices; do not overlap their seeded data.
      dependencies: ['chromium'],
      workers: 1,
      metadata: { deviceName: supabaseDeviceName },
      use: { ...devices['Desktop Safari'], baseURL: supabaseBaseURL },
    },
  ],
  webServer: [
    // App for tests with mocked HTTP responses.
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
      port: 4173,
      reuseExistingServer: false,
    },
    // App for real Supabase tests, displaying only the run-specific device.
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
      port: 4174,
      reuseExistingServer: false,
      env: {
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_DEVICES: JSON.stringify([{ deviceName: supabaseDeviceName, icon: 'FaSeedling' }]),
      },
    },
  ],
});
