// Verify partial readings and delayed history using controlled HTTP responses in a real browser.
import { readFileSync } from 'node:fs';

import { expect, type Route } from '@playwright/test';

import { devices } from '#tests/utils/dashboard-scenario.ts';
import { test } from '#tests/utils/test.ts';

type Row = {
  device_name: string;
  temperature: number;
};

const fixture: { initial: Row[] } = JSON.parse(
  readFileSync(
    new URL('../fixtures/weather-station/current-and-refreshed-readings.json', import.meta.url),
    'utf8',
  ),
);

const initialReadings = devices.map(({ deviceName }, index) => ({
  ...fixture.initial[index],
  device_name: deviceName,
}));

const primaryDevice = devices[0].deviceName;

const history = Object.fromEntries(initialReadings.map((row) => [row.device_name, [row]]));

const getRequestedReading = (route: Route) => {
  const name = new URL(route.request().url()).searchParams.get('device_name')?.slice(3);
  const reading = initialReadings.find((row) => row.device_name === name);

  if (reading === undefined) throw new Error(`No fixture for requested device ${name}`);

  return reading;
};

test('given one reporting meter and other empty meters when opening the dashboard then shows its reading and empty cards for the others', async ({
  page,
}) => {
  await page.route('**/rest/v1/measures**', async (route) => {
    const reading = getRequestedReading(route);
    await route.fulfill({ json: reading.device_name === primaryDevice ? [reading] : [] });
  });
  await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
    await route.fulfill({
      json: { [primaryDevice]: [initialReadings[0]] },
    });
  });

  await page.goto('/');

  await expect(page.getByText('No readings available.')).toHaveCount(devices.length - 1);
  await expect(page.getByLabel('Current readings')).toContainText('20.0°C');
  await expect(
    page.getByLabel(
      `Interactive temperature chart for ${primaryDevice} measurements in last 3 days.`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator('[id^="history-"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Refresh readings' })).toBeEnabled();
});

test('given history for an unconfigured meter when opening the dashboard then renders history only for configured meters', async ({
  page,
}) => {
  await page.route('**/rest/v1/measures**', async (route) => {
    await route.fulfill({ json: [getRequestedReading(route)] });
  });
  await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
    await route.fulfill({ json: { ...history, 'unconfigured-device': [initialReadings[0]] } });
  });

  await page.goto('/');

  await expect(page.locator('[id^="history-"]')).toHaveCount(devices.length);
  await expect(
    page.getByLabel(
      `Interactive temperature chart for ${primaryDevice} measurements in last 3 days.`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator('[id="history-unconfigured-device"]')).toHaveCount(0);
});

test('given a delayed history response when opening the dashboard then shows placeholders followed by the loaded chart', async ({
  page,
}) => {
  const { promise: historyReady, resolve: releaseHistory } = Promise.withResolvers<void>();
  await page.route('**/rest/v1/measures**', async (route) => {
    await route.fulfill({ json: [getRequestedReading(route)] });
  });
  await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
    await historyReady;
    await route.fulfill({ json: history });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Loading chart')).toHaveCount(devices.length * 3);
  releaseHistory();

  await expect(
    page.getByLabel(
      `Interactive temperature chart for ${primaryDevice} measurements in last 3 days.`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByLabel('Current readings')).toContainText('20.0°C');
  await expect(page.getByLabel('Current readings')).toContainText('-101 dBm');
  await expect(page.getByLabel('Current readings')).toContainText('1 dBm');
});
