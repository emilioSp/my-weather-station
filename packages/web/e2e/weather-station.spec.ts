// Verify weather dashboard behavior in browser tests with controlled API responses.

import { readFileSync } from 'node:fs';

import { expect, type Locator, type Page, type Route } from '@playwright/test';
import { METER_TYPES } from '@wx/shared';
import { loadEnv } from 'vite';

import { test } from '#e2e/utils/test.ts';
import { WEATHER_METRICS, type WeatherMetric } from '#utils/weather-metrics.ts';

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

type ChartMetric = WeatherMetric;

// JUSTIFICATION: The repository's development configuration lists devices with string deviceName fields.
const configuredDevices = JSON.parse(
  loadEnv('development', process.cwd(), '').VITE_DEVICES ?? '[]',
) as ConfiguredDevice[];

const deviceNames = configuredDevices.map(({ deviceName }) => deviceName);

const deviceNameAt = (index: number): string => configuredDevices[index].deviceName;

// Intl abbreviates September as either Sep or Sept, depending on the browser.
const septemberMeasurementTime = /01 Sept? · 17:00:00/;

type DashboardFixture = { initial: MeasureRow[]; changed: MeasureRow[] };

const fixture: DashboardFixture = JSON.parse(
  readFileSync(
    new URL(
      '../tests/fixtures/weather-station/current-and-refreshed-readings.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

// This scenario has four fixture meters; it does not generate data for additional devices.
const initialMeasures: Record<string, MeasureRow> = Object.fromEntries(
  configuredDevices.map(({ deviceName }, index) => [
    deviceName,
    { ...fixture.initial[index], device_name: deviceName },
  ]),
);

const changedMeasures: Record<string, MeasureRow> = Object.fromEntries(
  configuredDevices.map(({ deviceName }, index) => [
    deviceName,
    { ...fixture.changed[index], device_name: deviceName },
  ]),
);

const configuredHistory: Record<string, MeasureRow[]> = Object.fromEntries(
  configuredDevices.map((_, deviceIndex) => {
    const deviceName = deviceNameAt(deviceIndex);

    return [deviceName, [initialMeasures[deviceName], changedMeasures[deviceName]]];
  }),
);

const history = {
  ...configuredHistory,
  'unconfigured-device': [initialMeasures[deviceNameAt(0)]],
};

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

type GetMeasureForRequestInput = {
  route: Route;
  measures: Record<string, MeasureRow>;
};

const getMeasureForRequest = ({ route, measures }: GetMeasureForRequestInput): MeasureRow => {
  const deviceName = getRequestedDeviceName(route);
  const request = { deviceName, measure: measures[deviceName ?? ''] };
  assertMeasureFixture(request);

  return request.measure;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type PlotBox = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

function assertTouchPlotBox(box: PlotBox | null): asserts box is PlotBox {
  if (box === null) throw new Error('The configured temperature chart plot is not rendered.');
}

type GetChartInput = {
  page: Page;
  deviceName: string;
  metric?: ChartMetric;
};

const getChart = ({
  page,
  deviceName,
  metric = WEATHER_METRICS.TEMPERATURE,
}: GetChartInput): Locator => {
  const metricLabel = metric === WEATHER_METRICS.DEW_POINT ? 'dew point' : metric;

  return page.getByLabel(
    new RegExp(`Interactive ${metricLabel} chart for ${escapeRegExp(deviceName)} measurements`),
  );
};

type GetChartTestIdInput = {
  deviceName: string;
  metric: ChartMetric;
};

const getChartTestId = ({ deviceName, metric }: GetChartTestIdInput): string =>
  `${deviceName}-${metric}-chart-tooltip`;

type AssertDesktopChartReadoutInput = {
  chart: Locator;
  expectedValues: Array<string | RegExp>;
  page: Page;
  tooltipTestId: string;
};

async function assertDesktopChartReadout({
  chart,
  expectedValues,
  page,
  tooltipTestId,
}: AssertDesktopChartReadoutInput): Promise<void> {
  await chart.scrollIntoViewIfNeeded();
  const plot = chart.locator('.recharts-cartesian-grid');
  await expect(plot).toBeVisible({ timeout: 5_000 });

  const [chartBox, plotBox] = await Promise.all([chart.boundingBox(), plot.boundingBox()]);

  if (chartBox === null || plotBox === null) {
    throw new Error('The chart plot is not rendered.');
  }

  await chart.hover({
    position: {
      x: plotBox.x - chartBox.x + plotBox.width - 1,
      y: plotBox.y - chartBox.y + plotBox.height / 2,
    },
  });

  const tooltip = page.getByTestId(tooltipTestId);

  for (const expectedValue of expectedValues) {
    await expect(tooltip).toContainText(expectedValue, { timeout: 5_000 });
  }
}

test.describe('Weather station', () => {
  test('given a delayed history response when opening the dashboard then shows placeholders followed by the loaded chart', async ({
    page,
  }) => {
    const { promise: historyReady, resolve: releaseHistory } = Promise.withResolvers<void>();

    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        body: JSON.stringify([getMeasureForRequest({ route: route, measures: initialMeasures })]),
        contentType: 'application/json',
      });
    });
    await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
      await historyReady;
      await route.fulfill({
        body: JSON.stringify(history),
        contentType: 'application/json',
      });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Loading chart')).toHaveCount(configuredDevices.length * 3);
    releaseHistory();
    await expect(getChart({ page, deviceName: deviceNameAt(0) })).toBeVisible();
  });

  test('given a current-reading API error when opening the dashboard then shows the returned error', async ({
    page,
  }) => {
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        body: JSON.stringify({ message: 'Latest readings unavailable' }),
        contentType: 'application/json',
        status: 500,
      });
    });

    await page.goto('/');

    await expect(page.getByText('Latest readings unavailable')).toBeVisible();
  });

  test('given a chart-history API error when opening the dashboard then shows the returned history error', async ({
    page,
  }) => {
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        body: JSON.stringify([getMeasureForRequest({ route: route, measures: initialMeasures })]),
        contentType: 'application/json',
      });
    });
    await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
      await route.fulfill({
        body: JSON.stringify({ message: 'Chart history unavailable' }),
        contentType: 'application/json',
        status: 500,
      });
    });

    await page.goto('/');

    await expect(
      page.getByText('Unable to load chart history: Chart history unavailable', { exact: true }),
    ).toBeVisible();
  });

  test('given no stored readings when opening the dashboard then shows empty readings and no history accordions', async ({
    page,
  }) => {
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        body: JSON.stringify([]),
        contentType: 'application/json',
      });
    });

    await page.goto('/');

    await expect(page.getByText('No readings yet')).toBeVisible();
    await expect(page.getByText('No readings available.')).toHaveCount(configuredDevices.length);

    for (const deviceName of deviceNames) {
      await expect(page.getByRole('button', { name: deviceName })).toHaveCount(0);
    }
  });

  test('given updated readings when refreshing twice then shows changed values and retains them on the unchanged response', async ({
    page,
  }) => {
    const latestResponses = [initialMeasures, changedMeasures, changedMeasures];
    let latestResponseIndex = 0;
    const answeredDeviceNames = new Set<string>();
    await page.route('**/rest/v1/measures**', async (route) => {
      const response = latestResponses[Math.min(latestResponseIndex, latestResponses.length - 1)];

      const measure = getMeasureForRequest({ route: route, measures: response });
      await route.fulfill({
        body: JSON.stringify([measure]),
        contentType: 'application/json',
      });

      const deviceName = getRequestedDeviceName(route);

      if (deviceName !== undefined) {
        answeredDeviceNames.add(deviceName);
      }

      if (answeredDeviceNames.size === configuredDevices.length) {
        latestResponseIndex += 1;
        answeredDeviceNames.clear();
      }
    });
    await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
      await route.fulfill({
        body: JSON.stringify(history),
        contentType: 'application/json',
      });
    });

    await page.goto('/');
    const primaryDeviceName = deviceNameAt(0);
    const primaryInitialMeasure = initialMeasures[primaryDeviceName];
    const primaryChangedMeasure = changedMeasures[primaryDeviceName];
    const secondaryInitialMeasure = initialMeasures[deviceNameAt(1)];
    await expect(page.getByLabel('Current readings')).toContainText(
      `${primaryInitialMeasure.temperature.toFixed(1)}°C`,
    );
    await expect(page.getByLabel('Current readings')).toContainText(
      `${primaryInitialMeasure.signal_power_dbm} dBm`,
    );
    await expect(page.getByLabel('Current readings')).toContainText(
      `${secondaryInitialMeasure.signal_power_dbm} dBm`,
    );
    await assertDesktopChartReadout({
      chart: getChart({ page, deviceName: primaryDeviceName }),
      expectedValues: [
        septemberMeasurementTime,
        `${primaryChangedMeasure.temperature.toFixed(1)}°C`,
        `${primaryChangedMeasure.heat_index.toFixed(1)}°C`,
      ],
      page,
      tooltipTestId: getChartTestId({
        deviceName: primaryDeviceName,
        metric: WEATHER_METRICS.TEMPERATURE,
      }),
    });

    const refreshReadings = page.getByRole('button', {
      name: 'Refresh readings',
    });

    await refreshReadings.click();
    await expect(refreshReadings).toBeDisabled();
    await expect(page.getByLabel('Current readings')).toContainText(
      `${primaryChangedMeasure.temperature.toFixed(1)}°C`,
      { timeout: 5_000 },
    );
    await expect(page.getByText(septemberMeasurementTime)).toBeVisible();
    await expect(page.getByLabel('Current readings')).toContainText(
      `${primaryChangedMeasure.signal_power_dbm} dBm`,
    );

    await page.getByRole('button', { name: 'Refresh readings' }).click();
    await expect(page.getByLabel('Current readings')).toContainText(
      `${primaryChangedMeasure.temperature.toFixed(1)}°C`,
    );
    await expect(page.getByText(septemberMeasurementTime)).toBeVisible();
  });

  test.describe('at the smartphone viewport', () => {
    test.use({ hasTouch: true, isMobile: true });

    test('given a smartphone chart when touching and dragging then replaces the prompt with the reading time and temperatures', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.route('**/rest/v1/measures**', async (route) => {
        await route.fulfill({
          body: JSON.stringify([getMeasureForRequest({ route: route, measures: initialMeasures })]),
          contentType: 'application/json',
        });
      });
      await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
        await route.fulfill({
          body: JSON.stringify(history),
          contentType: 'application/json',
        });
      });

      await page.goto('/');

      const primaryDeviceName = deviceNameAt(0);
      const primaryChangedMeasure = changedMeasures[primaryDeviceName];
      const touchChart = getChart({ page, deviceName: primaryDeviceName });

      const touchReadout = page.getByTestId(`${primaryDeviceName}-temperature-touch-readout`);

      await expect(touchReadout.getByText('Touch and drag.')).toBeVisible();
      await touchChart.scrollIntoViewIfNeeded();
      const plot = touchChart.locator('.recharts-cartesian-grid');
      await expect(plot).toBeVisible({ timeout: 5_000 });
      const plotBox = await plot.boundingBox();

      assertTouchPlotBox(plotBox);

      const touchPosition = {
        x: plotBox.x + plotBox.width - 1,
        y: plotBox.y + plotBox.height / 2,
      };

      await touchChart.evaluate((chartWrapper, position) => {
        const dispatchTouchEvent = (type: string) => {
          const event = new Event(type, { bubbles: true });
          Object.defineProperty(event, 'touches', {
            value: [{ clientX: position.x, clientY: position.y }],
          });
          chartWrapper.parentElement?.dispatchEvent(event);
        };

        dispatchTouchEvent('touchstart');
        dispatchTouchEvent('touchmove');
      }, touchPosition);
      await expect(touchReadout.getByText('Touch and drag.')).toBeHidden();
      await expect(touchReadout).toContainText(septemberMeasurementTime);
      await expect(touchReadout).toContainText(`${primaryChangedMeasure.temperature.toFixed(1)}°C`);
      await expect(touchReadout).toContainText(`${primaryChangedMeasure.heat_index.toFixed(1)}°C`);
      await touchChart.evaluate((chartWrapper) => {
        chartWrapper.parentElement?.dispatchEvent(new Event('touchend', { bubbles: true }));
      });
    });
  });

  test('given loaded history when toggling a device and zooming to both limits then updates charts and disables the limit controls', async ({
    page,
  }) => {
    const requestedRanges: Array<{ end: string; start: string }> = [];
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        body: JSON.stringify([getMeasureForRequest({ route: route, measures: initialMeasures })]),
        contentType: 'application/json',
      });
    });
    await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
      // JUSTIFICATION: The intercepted get_chart_history request sends p_end and p_start as ISO timestamp strings.
      const parameters = route.request().postDataJSON() as {
        p_end: string;
        p_start: string;
      };

      requestedRanges.push({
        end: parameters.p_end,
        start: parameters.p_start,
      });
      await route.fulfill({
        body: JSON.stringify(history),
        contentType: 'application/json',
      });
    });

    await page.goto('/');
    const primaryDeviceName = deviceNameAt(0);
    const secondaryDeviceName = deviceNameAt(1);
    const primaryInitialMeasure = initialMeasures[primaryDeviceName];
    const primaryChangedMeasure = changedMeasures[primaryDeviceName];
    const secondaryChangedMeasure = changedMeasures[secondaryDeviceName];

    const primaryTemperatureChart = getChart({
      page,
      deviceName: primaryDeviceName,
    }).first();

    await assertDesktopChartReadout({
      chart: primaryTemperatureChart,
      expectedValues: [
        septemberMeasurementTime,
        `${primaryChangedMeasure.temperature.toFixed(1)}°C`,
        `${primaryChangedMeasure.heat_index.toFixed(1)}°C`,
      ],
      page,
      tooltipTestId: getChartTestId({
        deviceName: primaryDeviceName,
        metric: WEATHER_METRICS.TEMPERATURE,
      }),
    });

    const deviceAccordion = page.getByRole('button', {
      name: secondaryDeviceName,
    });

    await expect(deviceAccordion).toHaveAttribute('aria-expanded', 'false');
    await deviceAccordion.click();
    await expect(deviceAccordion).toHaveAttribute('aria-expanded', 'true');
    await assertDesktopChartReadout({
      chart: getChart({
        page,
        deviceName: secondaryDeviceName,
      }).first(),
      expectedValues: [
        septemberMeasurementTime,
        `${secondaryChangedMeasure.temperature.toFixed(1)}°C`,
        `${secondaryChangedMeasure.heat_index.toFixed(1)}°C`,
      ],
      page,
      tooltipTestId: getChartTestId({
        deviceName: secondaryDeviceName,
        metric: WEATHER_METRICS.TEMPERATURE,
      }),
    });
    await assertDesktopChartReadout({
      chart: getChart({
        page,
        deviceName: primaryDeviceName,
        metric: WEATHER_METRICS.HUMIDITY,
      }).first(),
      expectedValues: [septemberMeasurementTime, `${primaryInitialMeasure.humidity}%`],
      page,
      tooltipTestId: getChartTestId({
        deviceName: primaryDeviceName,
        metric: WEATHER_METRICS.HUMIDITY,
      }),
    });
    await assertDesktopChartReadout({
      chart: getChart({
        page,
        deviceName: primaryDeviceName,
        metric: WEATHER_METRICS.DEW_POINT,
      }).first(),
      expectedValues: [septemberMeasurementTime, `${primaryInitialMeasure.dew_point.toFixed(1)}°C`],
      page,
      tooltipTestId: getChartTestId({
        deviceName: primaryDeviceName,
        metric: WEATHER_METRICS.DEW_POINT,
      }),
    });
    await deviceAccordion.click();
    await expect(deviceAccordion).toHaveAttribute('aria-expanded', 'false');

    const zoomOut = page.getByRole('button', { name: 'Zoom out' });
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    await expect(page.getByText('Last day', { exact: true })).toBeVisible();

    for (const label of ['Last 3 days', 'Last week', 'Last 2 weeks', 'Last month']) {
      await zoomOut.click();
      await expect(page.getByText(label, { exact: true })).toBeVisible();
      await expect(primaryTemperatureChart).toBeVisible();
    }

    await expect(zoomOut).toBeDisabled();

    for (const label of [
      'Last 2 weeks',
      'Last week',
      'Last 3 days',
      'Last day',
      'Last 12 hours',
      'Last 6 hours',
    ]) {
      await zoomIn.click();
      await expect(page.getByText(label, { exact: true })).toBeVisible();
      await expect(primaryTemperatureChart).toBeVisible();
    }

    await expect(zoomIn).toBeDisabled();

    const lastRange = requestedRanges.at(-1);
    expect(lastRange).toBeDefined();
    expect(Date.parse(lastRange?.end ?? '') - Date.parse(lastRange?.start ?? '')).toBe(
      6 * 60 * 60 * 1_000,
    );
  });
});
