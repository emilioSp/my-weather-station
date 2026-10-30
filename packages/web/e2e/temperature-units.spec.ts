// Verify temperature unit selection and persistence in browser tests.

import { readFileSync } from 'node:fs';

import { expect, type Page, type Route } from '@playwright/test';
import { METER_TYPES } from '@wx/shared';
import { loadEnv } from 'vite';

import { test } from '#e2e/utils/test.ts';
import { TEMPERATURE_UNITS } from '#utils/temperature-unit.util.ts';

type ConfiguredDevice = {
  deviceName: string;
};

type MeasureRow = {
  id: string;
  device_name: string;
  device_type: typeof METER_TYPES.OUTDOOR | typeof METER_TYPES.INDOOR;
  measured_at: string;
  temperature: number;
  humidity: number;
  dew_point: number;
  heat_index: number;
  battery: number;
  signal_power_dbm: number;
};

// JUSTIFICATION: The repository's development configuration lists devices with string deviceName fields.
const configuredDevices = JSON.parse(
  loadEnv('development', process.cwd(), '').VITE_DEVICES ?? '[]',
) as ConfiguredDevice[];

const deviceNameAt = (index: number): string => configuredDevices[index].deviceName;

type TemperatureFixture = { latest: MeasureRow[]; history: MeasureRow[][] };

const fixture: TemperatureFixture = JSON.parse(
  readFileSync(
    new URL(
      '../tests/fixtures/temperature-units/celsius-readings-with-history.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

// This scenario has four fixture meters; it does not generate data for additional devices.
const latestMeasures: Record<string, MeasureRow> = Object.fromEntries(
  configuredDevices.map(({ deviceName }, index) => [
    deviceName,
    { ...fixture.latest[index], device_name: deviceName },
  ]),
);

const history: Record<string, MeasureRow[]> = Object.fromEntries(
  configuredDevices.map(({ deviceName }, index) => [
    deviceName,
    fixture.history[index].map((row) => ({ ...row, device_name: deviceName })),
  ]),
);

const getRequestedDeviceName = (route: Route): string | undefined =>
  new URL(route.request().url()).searchParams.get('device_name')?.replace(/^eq\./, '');

type MeasureFixtureRequest = {
  deviceName: string | undefined;
  measure: MeasureRow | undefined;
};

function assertMeasureFixture(
  request: MeasureFixtureRequest,
): asserts request is MeasureFixtureRequest & { measure: MeasureRow } {
  if (request.deviceName === undefined || request.measure === undefined) {
    throw new Error(`No fixture exists for requested device ${request.deviceName}.`);
  }
}

const getLatestMeasureForRequest = (route: Route): MeasureRow => {
  const deviceName = getRequestedDeviceName(route);
  const request = { deviceName, measure: latestMeasures[deviceName ?? ''] };
  assertMeasureFixture(request);

  return request.measure;
};

const toFahrenheit = (celsius: number): string => `${((celsius * 9) / 5 + 32).toFixed(1)}°F`;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type GetTemperatureChartInput = {
  page: Page;
  deviceName: string;
};

const getTemperatureChart = ({ page, deviceName }: GetTemperatureChartInput) =>
  page.getByLabel(
    new RegExp(`Interactive temperature chart for ${escapeRegExp(deviceName)} measurements`),
  );

test.describe('Temperature units', () => {
  test('given Celsius readings when selecting Fahrenheit and reloading then converts readings charts and tooltips and preserves the selection', async ({
    page,
  }) => {
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([getLatestMeasureForRequest(route)]),
      });
    });
    await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(history),
      });
    });

    await page.goto('/');
    await page.getByLabel('Temperature unit').getByText('°F').click();

    for (const measure of Object.values(latestMeasures)) {
      await expect(page.getByLabel('Current readings')).toContainText(
        toFahrenheit(measure.temperature),
      );
    }

    for (const measures of Object.values(history)) {
      for (const measure of measures) {
        await expect(page.getByLabel('Measurement history')).toContainText(
          toFahrenheit(measure.temperature),
          { timeout: 5_000 },
        );
      }
    }

    const primaryDeviceName = deviceNameAt(0);
    const primaryHistory = history[primaryDeviceName];
    const temperatureChart = getTemperatureChart({ page: page, deviceName: primaryDeviceName });
    await temperatureChart.hover({ position: { x: 200, y: 200 } });
    await expect(page.getByTestId(`${primaryDeviceName}-temperature-chart-tooltip`)).toContainText(
      toFahrenheit(primaryHistory[0].heat_index),
    );
    await expect(page.getByLabel('Measurement history')).not.toContainText('20.0°C');

    await page.reload();
    await expect(page.getByRole('radio', { name: '°F' })).toBeChecked();
    await expect(page.getByLabel('Current readings')).toContainText(
      toFahrenheit(latestMeasures[primaryDeviceName].temperature),
    );
    await expect(page.getByLabel('Measurement history')).toContainText(
      toFahrenheit(primaryHistory[0].temperature),
    );
    await expect(
      page.evaluate(() => window.localStorage.getItem('temperature-unit')),
    ).resolves.toBe(TEMPERATURE_UNITS.FAHRENHEIT);
  });

  test('given missing invalid or unavailable browser storage when loading then selects Celsius and displays Celsius readings', async ({
    page,
  }) => {
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([getLatestMeasureForRequest(route)]),
      });
    });
    await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(history),
      });
    });

    await page.goto('/');
    await expect(page.getByRole('radio', { name: '°C' })).toBeChecked();
    await expect(page.getByLabel('Current readings')).toContainText(
      `${latestMeasures[deviceNameAt(0)].temperature.toFixed(1)}°C`,
    );

    await page.evaluate(() => window.localStorage.setItem('temperature-unit', 'kelvin'));
    await page.reload();
    await expect(page.getByRole('radio', { name: '°C' })).toBeChecked();

    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { value: undefined });
    });
    await page.reload();
    await expect(page.getByRole('radio', { name: '°C' })).toBeChecked();
    await expect(page.getByLabel('Current readings')).toContainText(
      `${latestMeasures[deviceNameAt(0)].temperature.toFixed(1)}°C`,
    );
  });
});
