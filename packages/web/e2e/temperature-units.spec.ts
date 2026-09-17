import { expect, type Page, test } from '@playwright/test';
import { saveCoverage } from './utils/save-coverage';

const latestGardenMeasure = {
  id: '00000000-0000-0000-0000-000000000001',
  device_name: 'garden',
  device_type: 'outdoor',
  measured_at: '2026-09-01T14:00:00.000Z',
  temperature: 20,
  humidity: 67,
  dew_point: 12,
  heat_index: 19.5,
  battery: 80,
  signal_power_dbm: -55,
};

const latestKitchenMeasure = {
  ...latestGardenMeasure,
  id: '00000000-0000-0000-0000-000000000002',
  device_name: 'kitchen',
  device_type: 'indoor',
  temperature: 21,
  humidity: 49,
  dew_point: 10,
  heat_index: 21.2,
};

const history = {
  garden: [
    { ...latestGardenMeasure, temperature: 18, heat_index: 17.7 },
    latestGardenMeasure,
  ],
  kitchen: [
    { ...latestKitchenMeasure, temperature: 19, heat_index: 18.7 },
    latestKitchenMeasure,
  ],
};

const mockMeasurements = async (page: Page): Promise<void> => {
  await page.route('**/rest/v1/measures**', async (route) => {
    const deviceName = new URL(route.request().url()).searchParams
      .get('device_name')
      ?.replace(/^eq\./, '');
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        deviceName === 'kitchen' ? latestKitchenMeasure : latestGardenMeasure,
      ]),
    });
  });
  await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(history),
    });
  });
};

test.describe('Temperature units', () => {
  test('switches current readings and chart temperature displays to Fahrenheit', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();

    await mockMeasurements(page);
    await page.goto('/');
    await page.getByLabel('Temperature unit').getByText('°F').click();

    await expect(page.getByLabel('Current readings')).toContainText('68.0°F');
    await expect(page.getByLabel('Current readings')).toContainText('53.6°F');
    await expect(page.getByLabel('Current readings')).toContainText('67.1°F');
    await expect(page.getByLabel('Measurement history')).toContainText(
      '64.4°F',
      {
        timeout: 5_000,
      },
    );
    await expect(page.getByLabel('Measurement history')).toContainText(
      '68.0°F',
    );

    const temperatureChart = page.getByLabel(
      /Interactive temperature chart for garden measurements/,
    );
    await temperatureChart.hover({ position: { x: 200, y: 200 } });
    await expect(
      page.getByTestId('garden-temperature-chart-tooltip'),
    ).toContainText('63.9°F');
    await expect(page.getByLabel('Measurement history')).not.toContainText(
      '20.0°C',
    );

    const jsCoverage = await page.coverage.stopJSCoverage();
    await saveCoverage({
      jsCoverage,
      name: 'temperature-units-fahrenheit',
    });
  });

  test('persists Fahrenheit after reload', async ({ page }) => {
    await page.coverage.startJSCoverage();

    await mockMeasurements(page);
    await page.goto('/');
    await page.getByLabel('Temperature unit').getByText('°F').click();
    await page.reload();

    await expect(page.getByRole('radio', { name: '°F' })).toBeChecked();
    await expect(page.getByLabel('Current readings')).toContainText('68.0°F');
    await expect(page.getByLabel('Measurement history')).toContainText(
      '64.4°F',
      {
        timeout: 5_000,
      },
    );
    await expect(
      page.evaluate(() => window.localStorage.getItem('temperature-unit')),
    ).resolves.toBe('fahrenheit');

    const jsCoverage = await page.coverage.stopJSCoverage();
    await saveCoverage({
      jsCoverage,
      name: 'temperature-units-reload',
    });
  });

  test('defaults safely to Celsius without valid browser storage', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();

    await mockMeasurements(page);
    await page.goto('/');
    await expect(page.getByRole('radio', { name: '°C' })).toBeChecked();
    await expect(page.getByLabel('Current readings')).toContainText('20.0°C');

    await page.evaluate(() =>
      window.localStorage.setItem('temperature-unit', 'kelvin'),
    );
    await page.reload();
    await expect(page.getByRole('radio', { name: '°C' })).toBeChecked();

    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('Storage unavailable');
        },
      });
    });
    await page.reload();
    await expect(page.getByRole('radio', { name: '°C' })).toBeChecked();
    await expect(page.getByLabel('Current readings')).toContainText('20.0°C');

    const jsCoverage = await page.coverage.stopJSCoverage();
    await saveCoverage({
      jsCoverage,
      name: 'temperature-units-storage',
    });
  });
});
