// Verify dated metric extremes when loading history, changing ranges, and refreshing.
import { readFileSync } from 'node:fs';

import { expect, type Page } from '@playwright/test';
import { loadEnv } from 'vite';

import { test } from '#tests/utils/test.ts';
import { WEATHER_METRICS, chartMetricDetails, type WeatherMetric } from '#utils/weather-metrics.ts';

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

type Fixture = {
  history: MeasureRow[][];
  latest: MeasureRow[];
};

// JUSTIFICATION: Development devices have string deviceName fields, as required by environment.ts.
const devices = JSON.parse(loadEnv('development', process.cwd(), '').VITE_DEVICES ?? '[]') as {
  deviceName: string;
}[];

const primaryDevice = devices[0].deviceName;

const readFixture = (name: string): Fixture =>
  JSON.parse(readFileSync(`tests/fixtures/metric-extreme-dates/${name}.json`, 'utf8'));

type MockDashboardInput = {
  page: Page;
  fixture: Fixture;
};

const mockDashboard = async ({ page, fixture }: MockDashboardInput) => {
  await page.route('**/rest/v1/measures**', async (route) => {
    const requestedName = new URL(route.request().url()).searchParams
      .get('device_name')
      ?.replace(/^eq\./, '');

    const deviceIndex = devices.findIndex(({ deviceName }) => deviceName === requestedName);

    const row = fixture.latest[deviceIndex];

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(row === undefined ? [] : [{ ...row, device_name: requestedName }]),
    });
  });
  await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        Object.fromEntries(
          fixture.history.map((rows, index) => [
            devices[index].deviceName,
            rows.map((row) => ({
              ...row,
              device_name: devices[index].deviceName,
            })),
          ]),
        ),
      ),
    });
  });
};

type GetSummaryInput = {
  page: Page;
  deviceName: string;
  metric: WeatherMetric;
};

const getSummary = ({ page, deviceName, metric }: GetSummaryInput) =>
  page
    .locator(`[id="history-${deviceName}"]`)
    .locator('section')
    .filter({
      has: page.getByText(chartMetricDetails[metric].label, { exact: true }),
    });

for (const { label, deviceIndex, metric, expectedDates } of [
  {
    label: 'primary temperature',
    deviceIndex: 0,
    metric: WEATHER_METRICS.TEMPERATURE,
    expectedDates: ['06 Oct · 08:00', '06 Oct · 10:00'],
  },
  {
    label: 'primary humidity',
    deviceIndex: 0,
    metric: WEATHER_METRICS.HUMIDITY,
    expectedDates: ['06 Oct · 10:00', '06 Oct · 08:00'],
  },
  {
    label: 'primary dew point',
    deviceIndex: 0,
    metric: WEATHER_METRICS.DEW_POINT,
    expectedDates: ['06 Oct · 10:00', '06 Oct · 08:00'],
  },
  {
    label: 'single-reading temperature',
    deviceIndex: 1,
    metric: WEATHER_METRICS.TEMPERATURE,
    expectedDates: ['06 Oct · 11:00', '06 Oct · 11:00'],
  },
  {
    label: 'single-reading humidity',
    deviceIndex: 1,
    metric: WEATHER_METRICS.HUMIDITY,
    expectedDates: ['06 Oct · 11:00', '06 Oct · 11:00'],
  },
  {
    label: 'single-reading dew point',
    deviceIndex: 1,
    metric: WEATHER_METRICS.DEW_POINT,
    expectedDates: ['06 Oct · 11:00', '06 Oct · 11:00'],
  },
]) {
  test(`given two sensors when viewing ${label} extrema then shows that sensor's measurement dates`, async ({
    page,
  }) => {
    await mockDashboard({ page, fixture: readFixture('two-sensors-and-single-measurement') });
    await page.goto('/');
    await expect(
      getSummary({ page, deviceName: devices[deviceIndex].deviceName, metric }).locator('time'),
    ).toHaveText(expectedDates);
  });
}

test('given empty history when zooming in then shows three empty charts and placeholders without dates', async ({
  page,
}) => {
  await mockDashboard({ page, fixture: readFixture('empty-history') });
  await page.goto('/');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByText('Last day', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByText('Last 12 hours', { exact: true })).toBeVisible();
  await expect(page.getByText('No measurements in this range.')).toHaveCount(3);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByText('Last 6 hours', { exact: true })).toBeVisible();

  for (const metric of [
    WEATHER_METRICS.TEMPERATURE,
    WEATHER_METRICS.HUMIDITY,
    WEATHER_METRICS.DEW_POINT,
  ]) {
    const summary = getSummary({ page, deviceName: primaryDevice, metric });
    await expect(summary).toContainText('No measurements in this range.');
    await expect(summary.getByTestId('low-value')).toHaveText('—');
    await expect(summary.getByTestId('high-value')).toHaveText('—');
    await expect(summary.locator('time')).toHaveCount(0);
  }
});
