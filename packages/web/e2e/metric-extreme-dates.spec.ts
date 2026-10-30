// Verify dated metric extremes when loading history, changing ranges, and refreshing.
import { readFileSync } from 'node:fs';

import { expect, type Page } from '@playwright/test';
import { loadEnv } from 'vite';

import { test } from '#e2e/utils/test.ts';
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

const secondaryDevice = devices[1].deviceName;

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
    .getByLabel('Measurement history')
    .locator('section')
    .filter({
      has: page.getByRole('button', { name: deviceName, exact: true }),
    })
    .locator('section')
    .filter({
      has: page.getByText(chartMetricDetails[metric].label, { exact: true }),
    });

// JUSTIFICATION: chartMetricDetails is keyed only by WeatherMetric.
const metrics = Object.keys(chartMetricDetails) as WeatherMetric[];

test('given two sensors including a single reading when viewing extrema then shows dates for each sensor and metric', async ({
  page,
}) => {
  await mockDashboard({
    page,
    fixture: readFixture('two-sensors-and-single-measurement'),
  });
  await page.goto('/');
  await page.getByRole('button', { name: secondaryDevice, exact: true }).click();

  for (const metric of metrics) {
    await expect(
      getSummary({ page, deviceName: primaryDevice, metric }).locator('time'),
    ).toHaveText(
      metric === WEATHER_METRICS.TEMPERATURE
        ? ['06 Oct · 08:00', '06 Oct · 10:00']
        : ['06 Oct · 10:00', '06 Oct · 08:00'],
    );
    await expect(
      getSummary({ page, deviceName: secondaryDevice, metric }).locator('time'),
    ).toHaveText(['06 Oct · 11:00', '06 Oct · 11:00']);
  }
});

test('given an older daily minimum when zooming to six hours then replaces its date and value', async ({
  page,
}) => {
  await mockDashboard({ page, fixture: readFixture('range-change') });
  await page.goto('/');

  const summary = getSummary({
    page,
    deviceName: primaryDevice,
    metric: WEATHER_METRICS.TEMPERATURE,
  });

  await expect(summary.locator('time').first()).toHaveText('05 Oct · 22:00');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByText('Last 12 hours', { exact: true })).toBeVisible();
  await expect(summary.locator('time').first()).toHaveText('06 Oct · 10:00');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByText('Last 6 hours', { exact: true })).toBeVisible();
  await expect(summary.locator('time').first()).toHaveText('06 Oct · 10:00');
  await expect(summary.getByTestId('low-value')).toHaveText('18.0°C');
});

test('given newer readings and history when refreshing then updates the maximum date and value', async ({
  page,
}) => {
  await mockDashboard({ page, fixture: readFixture('before-refresh') });
  await page.goto('/');

  const summary = getSummary({
    page,
    deviceName: primaryDevice,
    metric: WEATHER_METRICS.TEMPERATURE,
  });

  await expect(summary.locator('time').last()).toHaveText('06 Oct · 12:00');
  await page.unroute('**/rest/v1/measures**');
  await page.unroute('**/rest/v1/rpc/get_chart_history');
  await mockDashboard({ page, fixture: readFixture('after-refresh') });
  await page.getByRole('button', { name: 'Refresh readings' }).click();
  await expect(summary.locator('time').last()).toHaveText('06 Oct · 14:00');
  await expect(summary.getByTestId('high-value')).toHaveText('26.0°C');
});

test('given empty history when zooming in then shows three empty charts and placeholders without dates', async ({
  page,
}) => {
  await mockDashboard({ page, fixture: readFixture('empty-history') });
  await page.goto('/');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByText('Last 12 hours', { exact: true })).toBeVisible();
  await expect(page.getByText('No measurements in this range.')).toHaveCount(3);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByText('Last 6 hours', { exact: true })).toBeVisible();

  for (const metric of metrics) {
    const summary = getSummary({ page, deviceName: primaryDevice, metric });
    await expect(summary).toContainText('No measurements in this range.');
    await expect(summary.getByTestId('low-value')).toHaveText('—');
    await expect(summary.getByTestId('high-value')).toHaveText('—');
    await expect(summary.locator('time')).toHaveCount(0);
  }
});
