// Compare the populated dashboard with reference screenshots in the pinned Linux container.
import { readFileSync } from 'node:fs';

import { expect } from '@playwright/test';
import { loadEnv } from 'vite';

import { test } from '#e2e/utils/test.ts';

type ConfiguredDevice = {
  deviceName: string;
};

type MeasureRow = {
  id: string;
  device_name: string;
  device_type: string;
  measured_at: string;
  temperature: number;
  humidity: number;
  dew_point: number;
  heat_index: number;
  battery: number;
  signal_power_dbm: number;
};

type DashboardFixture = {
  initial: MeasureRow[];
  changed: MeasureRow[];
};

const fixture: DashboardFixture = JSON.parse(
  readFileSync(
    new URL(
      '../tests/fixtures/weather-station/current-and-refreshed-readings.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

// JUSTIFICATION: Development devices have string deviceName fields, as required by environment.ts.
const devices = JSON.parse(
  loadEnv('development', process.cwd(), '').VITE_DEVICES ?? '[]',
) as ConfiguredDevice[];

const history = Object.fromEntries(
  devices.map(({ deviceName }, index) => [
    deviceName,
    [fixture.initial[index], fixture.changed[index]].map((row) => ({
      ...row,
      device_name: deviceName,
    })),
  ]),
);

test.use({
  colorScheme: 'dark',
  locale: 'en-GB',
  timezoneId: 'Europe/Rome',
  contextOptions: { reducedMotion: 'reduce' },
});

for (const viewport of [
  { label: 'desktop', width: 1280, height: 700 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'smartphone', width: 390, height: 844 },
]) {
  test(
    `given fixed readings at ${viewport.label} size when viewing the dashboard then matches the reference screenshot`,
    { tag: '@visual' },
    async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Use the app's fallback fonts so network availability cannot change the baseline.
      await page.route('https://fonts.googleapis.com/**', async (route) => {
        await route.abort();
      });
      await page.route('**/rest/v1/measures**', async (route) => {
        const deviceName = new URL(route.request().url()).searchParams
          .get('device_name')
          ?.replace(/^eq\./, '');

        const index = devices.findIndex((device) => device.deviceName === deviceName);

        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify([{ ...fixture.changed[index], device_name: deviceName }]),
        });
      });
      await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(history),
        });
      });

      await page.goto('/');
      await expect(page.getByLabel('Current readings').locator('article')).toHaveCount(
        devices.length,
      );
      await expect(page.locator('header strong')).toContainText('17:00:00');
      await expect(page.getByLabel('Loading chart')).toHaveCount(0);
      await expect(page.locator('.recharts-cartesian-grid')).toHaveCount(devices.length * 3);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      await expect(page).toHaveScreenshot(`dashboard-${viewport.label}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    },
  );
}
