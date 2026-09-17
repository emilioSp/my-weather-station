import { expect, type Page, test } from '@playwright/test';
import { loadEnv } from 'vite';
import { saveCoverage } from './utils/save-coverage';

type ConfiguredDevice = {
  deviceName: string;
};

type MeasureRow = {
  id: string;
  device_name: string;
  device_type: 'outdoor' | 'indoor';
  measured_at: string;
  temperature: number;
  humidity: number;
  dew_point: number;
  heat_index: number;
  battery: number;
  signal_power_dbm: number;
};

type ReadingValues = Omit<
  MeasureRow,
  'id' | 'device_name' | 'device_type' | 'measured_at'
>;

const configuredDevices = JSON.parse(
  loadEnv('development', process.cwd(), '').VITE_DEVICES ?? '[]',
) as ConfiguredDevice[];
const deviceNameAt = (index: number): string => {
  const device = configuredDevices[index];
  if (device === undefined) {
    throw new Error(`No configured device exists at index ${index}.`);
  }

  return device.deviceName;
};

const latestReadings: ReadingValues[] = [
  {
    temperature: 20,
    humidity: 67,
    dew_point: 12,
    heat_index: 19.5,
    battery: 80,
    signal_power_dbm: -55,
  },
  {
    temperature: 21,
    humidity: 49,
    dew_point: 10,
    heat_index: 21.2,
    battery: 80,
    signal_power_dbm: -55,
  },
  {
    temperature: 22,
    humidity: 46,
    dew_point: 10,
    heat_index: 22.1,
    battery: 80,
    signal_power_dbm: -55,
  },
  {
    temperature: 19,
    humidity: 51,
    dew_point: 9,
    heat_index: 19.2,
    battery: 80,
    signal_power_dbm: -55,
  },
];
const historyTemperatures = [18, 19, 20, 17];
const historyHeatIndices = [17.7, 18.7, 19.8, 16.8];

const getLatestReadings = (index: number): ReadingValues =>
  latestReadings[index] ?? {
    temperature: 20 + index,
    humidity: 50,
    dew_point: 10,
    heat_index: 20 + index,
    battery: 80,
    signal_power_dbm: -55,
  };

const createMeasure = ({
  deviceIndex,
  id,
  readings = getLatestReadings(deviceIndex),
}: {
  deviceIndex: number;
  id: number;
  readings?: ReadingValues;
}): MeasureRow => ({
  id: `00000000-0000-0000-0000-${String(id).padStart(12, '0')}`,
  device_name: deviceNameAt(deviceIndex),
  device_type: deviceIndex === 0 ? 'outdoor' : 'indoor',
  measured_at: '2026-09-01T14:00:00.000Z',
  ...readings,
});

const latestMeasures: Record<string, MeasureRow> = Object.fromEntries(
  configuredDevices.map((_, deviceIndex) => {
    const measure = createMeasure({ deviceIndex, id: deviceIndex + 1 });
    return [measure.device_name, measure];
  }),
);
const history: Record<string, MeasureRow[]> = Object.fromEntries(
  configuredDevices.map((_, deviceIndex) => {
    const deviceName = deviceNameAt(deviceIndex);
    const latestMeasure = latestMeasures[deviceName];
    return [
      deviceName,
      [
        {
          ...latestMeasure,
          id: `00000000-0000-0000-0000-${String(deviceIndex + 5).padStart(12, '0')}`,
          temperature:
            historyTemperatures[deviceIndex] ?? latestMeasure.temperature - 2,
          heat_index:
            historyHeatIndices[deviceIndex] ?? latestMeasure.heat_index - 2,
        },
        latestMeasure,
      ],
    ];
  }),
);

const getRequestedDeviceName = (route: {
  request: () => { url: () => string };
}): string | undefined =>
  new URL(route.request().url()).searchParams
    .get('device_name')
    ?.replace(/^eq\./, '');

const getLatestMeasureForRequest = (route: {
  request: () => { url: () => string };
}): MeasureRow => {
  const deviceName = getRequestedDeviceName(route);
  if (deviceName === undefined || latestMeasures[deviceName] === undefined) {
    throw new Error(`No fixture exists for requested device ${deviceName}.`);
  }

  return latestMeasures[deviceName];
};

const toFahrenheit = (celsius: number): string =>
  `${((celsius * 9) / 5 + 32).toFixed(1)}°F`;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getTemperatureChart = (page: Page, deviceName: string) =>
  page.getByLabel(
    new RegExp(
      `Interactive temperature chart for ${escapeRegExp(deviceName)} measurements`,
    ),
  );

test.describe('Temperature units', () => {
  test('switches current readings and chart temperature displays to Fahrenheit', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();
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
    const temperatureChart = getTemperatureChart(page, primaryDeviceName);
    await temperatureChart.hover({ position: { x: 200, y: 200 } });
    await expect(
      page.getByTestId(`${primaryDeviceName}-temperature-chart-tooltip`),
    ).toContainText(toFahrenheit(primaryHistory[0].heat_index));
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
    await page.reload();

    await expect(page.getByRole('radio', { name: '°F' })).toBeChecked();
    await expect(page.getByLabel('Current readings')).toContainText(
      toFahrenheit(latestMeasures[deviceNameAt(0)].temperature),
    );
    await expect(page.getByLabel('Measurement history')).toContainText(
      toFahrenheit(history[deviceNameAt(0)][0].temperature),
      { timeout: 5_000 },
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
    await expect(page.getByLabel('Current readings')).toContainText(
      `${latestMeasures[deviceNameAt(0)].temperature.toFixed(1)}°C`,
    );

    const jsCoverage = await page.coverage.stopJSCoverage();
    await saveCoverage({
      jsCoverage,
      name: 'temperature-units-storage',
    });
  });
});
