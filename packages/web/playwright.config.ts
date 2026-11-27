// Configure mocked browser checks and sequential real-API tests with separate Vite servers.

import { randomUUID } from 'node:crypto';

import { defineConfig, devices } from '@playwright/test';

// Workers reload this config; inherit the coordinator's device name rather than generating another.
const apiDeviceName = process.env.WX_E2E_DEVICE_NAME ?? `e2e-smartphone-${randomUUID()}`;

process.env.WX_E2E_DEVICE_NAME = apiDeviceName;

const apiPort = 4175;

const e2eBaseURL = 'http://127.0.0.1:4174/my-weather-station/';

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
    // Real local Node.js API and PostgreSQL — app on port 4174.
    {
      name: 'chromium',
      testMatch: '**/e2e/*.spec.ts',
      workers: 1,
      metadata: { deviceName: apiDeviceName },
      use: { ...devices['Desktop Chrome'], baseURL: e2eBaseURL },
    },
    {
      name: 'webkit',
      testMatch: '**/e2e/*.spec.ts',
      // Both browser projects share run-specific devices; do not overlap their seeded data.
      dependencies: ['chromium'],
      workers: 1,
      metadata: { deviceName: apiDeviceName },
      use: { ...devices['Desktop Safari'], baseURL: e2eBaseURL },
    },
  ],
  webServer: [
    // App for tests with mocked HTTP responses.
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
      port: 4173,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -w @wx/api',
      cwd: '../..',
      port: apiPort,
      reuseExistingServer: false,
      env: { NODE_ENV: 'development', PORT: String(apiPort) },
    },
    // App for real API tests, displaying only the run-specific device.
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
      port: 4174,
      reuseExistingServer: false,
      env: {
        VITE_API_BASE_URL: `http://127.0.0.1:${apiPort}`,
        VITE_DEVICES: JSON.stringify([{ deviceName: apiDeviceName, icon: 'FaSeedling' }]),
      },
    },
  ],
});
