import { expect, type Locator, type Page, test } from '@playwright/test';
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

type ChartMetric = 'temperature' | 'humidity' | 'dewPoint';

const configuredDevices = JSON.parse(
  loadEnv('development', process.cwd(), '').VITE_DEVICES ?? '[]',
) as ConfiguredDevice[];
const deviceNames = configuredDevices.map(({ deviceName }) => deviceName);

const deviceNameAt = (index: number): string => {
  const device = configuredDevices[index];
  if (device === undefined) {
    throw new Error(`No configured device exists at index ${index}.`);
  }

  return device.deviceName;
};

const initialReadings: ReadingValues[] = [
  {
    temperature: 20,
    humidity: 67,
    dew_point: 12,
    heat_index: 19.5,
    battery: 80,
    signal_power_dbm: -101,
  },
  {
    temperature: 21,
    humidity: 67,
    dew_point: 10,
    heat_index: 20.5,
    battery: 80,
    signal_power_dbm: 1,
  },
  {
    temperature: 22,
    humidity: 54,
    dew_point: 10,
    heat_index: 21.5,
    battery: 80,
    signal_power_dbm: -45,
  },
  {
    temperature: 19,
    humidity: 51,
    dew_point: 9,
    heat_index: 18.5,
    battery: 80,
    signal_power_dbm: -62,
  },
];
const changedTemperatures = [25, 24, 23, 20];

const getInitialReadings = (index: number): ReadingValues =>
  initialReadings[index] ?? {
    temperature: 20 + index,
    humidity: 50,
    dew_point: 10,
    heat_index: 20 + index,
    battery: 80,
    signal_power_dbm: -50,
  };

const createMeasure = ({
  deviceIndex,
  id,
  measuredAt = '2026-09-01T14:00:00.000Z',
  readings = getInitialReadings(deviceIndex),
}: {
  deviceIndex: number;
  id: number;
  measuredAt?: string;
  readings?: ReadingValues;
}): MeasureRow => ({
  id: `00000000-0000-0000-0000-${String(id).padStart(12, '0')}`,
  device_name: deviceNameAt(deviceIndex),
  device_type: deviceIndex === 0 ? 'outdoor' : 'indoor',
  measured_at: measuredAt,
  ...readings,
});

const createMeasureMap = (
  createRow: (deviceIndex: number) => MeasureRow,
): Record<string, MeasureRow> =>
  Object.fromEntries(
    configuredDevices.map((_, deviceIndex) => {
      const row = createRow(deviceIndex);
      return [row.device_name, row];
    }),
  );

const initialMeasures = createMeasureMap((deviceIndex) =>
  createMeasure({ deviceIndex, id: deviceIndex + 1 }),
);
const changedMeasures = createMeasureMap((deviceIndex) => {
  const readings = getInitialReadings(deviceIndex);
  return createMeasure({
    deviceIndex,
    id: deviceIndex + 5,
    measuredAt: '2026-09-01T15:00:00.000Z',
    readings: {
      ...readings,
      temperature: changedTemperatures[deviceIndex] ?? readings.temperature + 5,
    },
  });
});

const configuredHistory: Record<string, MeasureRow[]> = Object.fromEntries(
  configuredDevices.map((_, deviceIndex) => {
    const deviceName = deviceNameAt(deviceIndex);
    return [
      deviceName,
      [initialMeasures[deviceName], changedMeasures[deviceName]],
    ];
  }),
);
const history = {
  ...configuredHistory,
  'unconfigured-device': [initialMeasures[deviceNameAt(0)]],
};
const emptyHistory: Record<string, MeasureRow[]> = Object.fromEntries(
  deviceNames.map((deviceName) => [deviceName, []]),
);

const getRequestedDeviceName = (route: {
  request: () => { url: () => string };
}): string | undefined =>
  new URL(route.request().url()).searchParams
    .get('device_name')
    ?.replace(/^eq\./, '');

const getMeasureForRequest = (
  route: { request: () => { url: () => string } },
  measures: Record<string, MeasureRow>,
): MeasureRow => {
  const deviceName = getRequestedDeviceName(route);
  if (deviceName === undefined || measures[deviceName] === undefined) {
    throw new Error(`No fixture exists for requested device ${deviceName}.`);
  }

  return measures[deviceName];
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getChart = ({
  page,
  deviceName,
  metric = 'temperature',
}: {
  page: Page;
  deviceName: string;
  metric?: ChartMetric;
}): Locator => {
  const metricLabel = metric === 'dewPoint' ? 'dew point' : metric;
  return page.getByLabel(
    new RegExp(
      `Interactive ${metricLabel} chart for ${escapeRegExp(deviceName)} measurements`,
    ),
  );
};

const getChartTestId = (deviceName: string, metric: ChartMetric): string =>
  `${deviceName}-${metric}-chart-tooltip`;

const expectDesktopChartReadout = async ({
  chart,
  expectedValues,
  page,
  tooltipTestId,
}: {
  chart: Locator;
  expectedValues: string[];
  page: Page;
  tooltipTestId: string;
}): Promise<void> => {
  await chart.scrollIntoViewIfNeeded();
  const plot = chart.locator('.recharts-cartesian-grid');
  await expect(plot).toBeVisible({ timeout: 5_000 });
  const [chartBox, plotBox] = await Promise.all([
    chart.boundingBox(),
    plot.boundingBox(),
  ]);
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
};

test.describe('Weather station', () => {
  test('shows all configured names, icons, and history accordions', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        body: JSON.stringify([getMeasureForRequest(route, initialMeasures)]),
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

    const cards = page.getByLabel('Current readings').locator('article');
    await expect(cards).toHaveCount(configuredDevices.length);
    for (const deviceName of deviceNames) {
      await expect(page.getByTestId(`${deviceName}-icon`)).toBeVisible();
      await expect(
        page.getByTestId(`${deviceName}-history-icon`),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: deviceName }),
      ).toBeVisible();
    }
    await expect(getChart({ page, deviceName: deviceNameAt(0) })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
    await expect(page.getByText('Indoor', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Outdoor', { exact: true })).toHaveCount(0);
    await expect(
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).resolves.toBe(true);

    await saveCoverage({
      jsCoverage: await page.coverage.stopJSCoverage(),
      name: 'weather-station-configured-devices',
    });
  });

  test('uses distinct meter themes at every target viewport', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        body: JSON.stringify([getMeasureForRequest(route, initialMeasures)]),
        contentType: 'application/json',
      });
    });
    await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
      await route.fulfill({
        body: JSON.stringify(history),
        contentType: 'application/json',
      });
    });
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('/');

    const targetViewports = [
      { columns: configuredDevices.length, height: 700, width: 1280 },
      { columns: 2, height: 1024, width: 768 },
      { columns: 1, height: 844, width: 390 },
    ];
    const readings = page.getByLabel('Current readings');

    for (const viewport of targetViewports) {
      await page.setViewportSize({
        height: viewport.height,
        width: viewport.width,
      });
      await expect
        .poll(() =>
          readings.evaluate(
            (element) =>
              getComputedStyle(element).gridTemplateColumns.split(' ').length,
          ),
        )
        .toBe(viewport.columns);

      const cardDetails = await readings
        .locator('article')
        .evaluateAll((cards) =>
          cards.map((card) => ({
            accent: getComputedStyle(card)
              .getPropertyValue('--meter-accent')
              .trim(),
            heading: Array.from(card.firstElementChild?.children ?? []).map(
              (child) => ({
                testId: child.getAttribute('data-testid'),
                text: child.textContent?.trim(),
              }),
            ),
          })),
        );
      expect(new Set(cardDetails.map(({ accent }) => accent)).size).toBe(
        configuredDevices.length,
      );
      expect(cardDetails.map(({ heading }) => heading)).toEqual(
        deviceNames.map((deviceName) => [
          { testId: `${deviceName}-indicator`, text: '' },
          { testId: null, text: deviceName },
          { testId: `${deviceName}-icon`, text: '' },
        ]),
      );

      const historyHeadingDetails = await page
        .getByLabel('Measurement history')
        .locator('section > button')
        .evaluateAll((buttons) =>
          buttons.map((button) =>
            Array.from(button.firstElementChild?.children ?? []).map(
              (child) => ({
                testId: child.getAttribute('data-testid'),
                text: child.textContent?.trim(),
              }),
            ),
          ),
        );
      expect(historyHeadingDetails).toEqual(
        deviceNames.map((deviceName) => [
          { testId: `${deviceName}-history-indicator`, text: '' },
          { testId: null, text: deviceName },
          { testId: `${deviceName}-history-icon`, text: '' },
        ]),
      );
      await expect(
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).resolves.toBe(true);
    }

    await expect
      .poll(() =>
        page
          .getByTestId(`${deviceNameAt(0)}-indicator`)
          .evaluate((indicator) => getComputedStyle(indicator).animationName),
      )
      .not.toBe('none');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect
      .poll(() =>
        page
          .getByTestId(`${deviceNameAt(0)}-indicator`)
          .evaluate((indicator) => getComputedStyle(indicator).animationName),
      )
      .toBe('none');

    await saveCoverage({
      jsCoverage: await page.coverage.stopJSCoverage(),
      name: 'weather-station-meter-themes',
    });
  });

  test('shows chart placeholders while named history is loading', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();
    let releaseHistory!: () => void;
    const historyReady = new Promise<void>((resolve) => {
      releaseHistory = resolve;
    });
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        body: JSON.stringify([getMeasureForRequest(route, initialMeasures)]),
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
    await expect(page.getByLabel('Loading chart')).toHaveCount(
      configuredDevices.length * 3,
    );
    releaseHistory();
    await expect(getChart({ page, deviceName: deviceNameAt(0) })).toBeVisible();

    await saveCoverage({
      jsCoverage: await page.coverage.stopJSCoverage(),
      name: 'weather-station-history-loading',
    });
  });

  test('shows empty charts for configured history keys without measures', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        body: JSON.stringify([getMeasureForRequest(route, initialMeasures)]),
        contentType: 'application/json',
      });
    });
    await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
      await route.fulfill({
        body: JSON.stringify(emptyHistory),
        contentType: 'application/json',
      });
    });

    await page.goto('/');
    await expect(page.getByText('No measurements in this range.')).toHaveCount(
      configuredDevices.length * 3,
    );

    await saveCoverage({
      jsCoverage: await page.coverage.stopJSCoverage(),
      name: 'weather-station-empty-history',
    });
  });

  test('shows the current-reading error returned by the API', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        body: JSON.stringify({ message: 'Latest readings unavailable' }),
        contentType: 'application/json',
        status: 500,
      });
    });

    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Unable to load weather station' }),
    ).toBeVisible();
    await expect(page.getByText('Latest readings unavailable')).toBeVisible();

    await saveCoverage({
      jsCoverage: await page.coverage.stopJSCoverage(),
      name: 'weather-station-current-error',
    });
  });

  test('shows the chart-history error returned by the API', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        body: JSON.stringify([getMeasureForRequest(route, initialMeasures)]),
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

    await expect(page.getByLabel('Measurement history')).toContainText(
      'Unable to load chart history: Chart history unavailable',
      { timeout: 5_000 },
    );

    await saveCoverage({
      jsCoverage: await page.coverage.stopJSCoverage(),
      name: 'weather-station-history-error',
    });
  });

  test('shows empty current-reading and chart states when no readings exist', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        body: JSON.stringify([]),
        contentType: 'application/json',
      });
    });

    await page.goto('/');

    await expect(page.getByText('No readings yet')).toBeVisible();
    await expect(page.getByText('No readings available.')).toHaveCount(
      configuredDevices.length,
    );
    for (const deviceName of deviceNames) {
      await expect(page.getByRole('button', { name: deviceName })).toHaveCount(
        0,
      );
    }

    await saveCoverage({
      jsCoverage: await page.coverage.stopJSCoverage(),
      name: 'weather-station-empty-readings',
    });
  });

  test('refreshes changed readings but retains unchanged readings', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();
    const latestResponses = [initialMeasures, changedMeasures, changedMeasures];
    let latestResponseIndex = 0;
    const answeredDeviceNames = new Set<string>();
    await page.route('**/rest/v1/measures**', async (route) => {
      const response =
        latestResponses[
          Math.min(latestResponseIndex, latestResponses.length - 1)
        ];
      const measure = getMeasureForRequest(route, response);
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
    await expectDesktopChartReadout({
      chart: getChart({ page, deviceName: primaryDeviceName }),
      expectedValues: [
        '01 Sept · 17:00:00',
        `${primaryChangedMeasure.temperature.toFixed(1)}°C`,
        `${primaryChangedMeasure.heat_index.toFixed(1)}°C`,
      ],
      page,
      tooltipTestId: getChartTestId(primaryDeviceName, 'temperature'),
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
    await expect(page.getByText('01 Sept · 17:00:00')).toBeVisible();

    await page.getByRole('button', { name: 'Refresh readings' }).click();
    await expect(page.getByLabel('Current readings')).toContainText(
      `${primaryChangedMeasure.temperature.toFixed(1)}°C`,
    );
    await expect(page.getByText('01 Sept · 17:00:00')).toBeVisible();

    await saveCoverage({
      jsCoverage: await page.coverage.stopJSCoverage(),
      name: 'weather-station-refresh',
    });
  });

  test('shows an error when a refresh cannot load current readings', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();
    let failRefresh = false;
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill(
        failRefresh
          ? {
              body: JSON.stringify({ message: 'Refresh unavailable' }),
              contentType: 'application/json',
              status: 500,
            }
          : {
              body: JSON.stringify([
                getMeasureForRequest(route, initialMeasures),
              ]),
              contentType: 'application/json',
            },
      );
    });
    await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
      await route.fulfill({
        body: JSON.stringify(history),
        contentType: 'application/json',
      });
    });

    await page.goto('/');
    await expect(page.getByLabel('Current readings')).toContainText(
      `${initialMeasures[deviceNameAt(0)].temperature.toFixed(1)}°C`,
    );
    failRefresh = true;
    await page.getByRole('button', { name: 'Refresh readings' }).click();
    await expect(
      page.getByRole('heading', { name: 'Unable to load weather station' }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Refresh unavailable')).toBeVisible();

    await saveCoverage({
      jsCoverage: await page.coverage.stopJSCoverage(),
      name: 'weather-station-refresh-error',
    });
  });

  test('shows weak, medium, and strong signal readings', async ({ page }) => {
    await page.coverage.startJSCoverage();
    const firstDeviceName = deviceNameAt(0);
    const secondDeviceName = deviceNameAt(1);
    const weakMeasures = {
      ...initialMeasures,
      [firstDeviceName]: {
        ...initialMeasures[firstDeviceName],
        signal_power_dbm: -125,
      },
      [secondDeviceName]: {
        ...initialMeasures[secondDeviceName],
        signal_power_dbm: -75,
      },
    };
    const strongMeasures = {
      ...changedMeasures,
      [firstDeviceName]: {
        ...changedMeasures[firstDeviceName],
        signal_power_dbm: -10,
      },
      [secondDeviceName]: {
        ...changedMeasures[secondDeviceName],
        signal_power_dbm: -75,
      },
    };
    const latestResponses = [weakMeasures, strongMeasures, strongMeasures];
    let latestResponseIndex = 0;
    const answeredDeviceNames = new Set<string>();
    await page.route('**/rest/v1/measures**', async (route) => {
      const response =
        latestResponses[
          Math.min(latestResponseIndex, latestResponses.length - 1)
        ];
      const measure = getMeasureForRequest(route, response);
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
    const readings = page.getByLabel('Current readings');
    await expect(readings).toContainText('-125 dBm');
    await expect(readings).toContainText('-75 dBm');

    await page.getByRole('button', { name: 'Refresh readings' }).click();
    await expect(readings).toContainText('-10 dBm');

    await saveCoverage({
      jsCoverage: await page.coverage.stopJSCoverage(),
      name: 'weather-station-signal-strengths',
    });
  });

  test.describe('at the smartphone viewport', () => {
    test.use({ hasTouch: true, isMobile: true });

    test('shows the smartphone touch chart readout', async ({ page }) => {
      await page.coverage.startJSCoverage();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.route('**/rest/v1/measures**', async (route) => {
        await route.fulfill({
          body: JSON.stringify([getMeasureForRequest(route, initialMeasures)]),
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
      const touchReadout = page.getByTestId(
        `${primaryDeviceName}-temperature-touch-readout`,
      );
      await expect(touchReadout.getByText('Touch and drag.')).toBeVisible();
      await touchChart.scrollIntoViewIfNeeded();
      const plot = touchChart.locator('.recharts-cartesian-grid');
      await expect(plot).toBeVisible({ timeout: 5_000 });
      const plotBox = await plot.boundingBox();
      if (plotBox === null) {
        throw new Error(
          'The configured temperature chart plot is not rendered.',
        );
      }
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
      await expect(touchReadout).toContainText('01 Sept · 17:00:00');
      await expect(touchReadout).toContainText(
        `${primaryChangedMeasure.temperature.toFixed(1)}°C`,
      );
      await expect(touchReadout).toContainText(
        `${primaryChangedMeasure.heat_index.toFixed(1)}°C`,
      );
      await touchChart.evaluate((chartWrapper) => {
        chartWrapper.parentElement?.dispatchEvent(
          new Event('touchend', { bubbles: true }),
        );
      });

      await saveCoverage({
        jsCoverage: await page.coverage.stopJSCoverage(),
        name: 'weather-station-touch-chart',
      });
    });
  });

  test('changes chart ranges at both limits and toggles a device accordion', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();
    const requestedRanges: Array<{ end: string; start: string }> = [];
    await page.route('**/rest/v1/measures**', async (route) => {
      await route.fulfill({
        body: JSON.stringify([getMeasureForRequest(route, initialMeasures)]),
        contentType: 'application/json',
      });
    });
    await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
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
    await expectDesktopChartReadout({
      chart: primaryTemperatureChart,
      expectedValues: [
        '01 Sept · 17:00:00',
        `${primaryChangedMeasure.temperature.toFixed(1)}°C`,
        `${primaryChangedMeasure.heat_index.toFixed(1)}°C`,
      ],
      page,
      tooltipTestId: getChartTestId(primaryDeviceName, 'temperature'),
    });

    const deviceAccordion = page.getByRole('button', {
      name: secondaryDeviceName,
    });
    await expect(deviceAccordion).toHaveAttribute('aria-expanded', 'false');
    await deviceAccordion.click();
    await expect(deviceAccordion).toHaveAttribute('aria-expanded', 'true');
    await expectDesktopChartReadout({
      chart: getChart({
        page,
        deviceName: secondaryDeviceName,
      }).first(),
      expectedValues: [
        '01 Sept · 17:00:00',
        `${secondaryChangedMeasure.temperature.toFixed(1)}°C`,
        `${secondaryChangedMeasure.heat_index.toFixed(1)}°C`,
      ],
      page,
      tooltipTestId: getChartTestId(secondaryDeviceName, 'temperature'),
    });
    await expectDesktopChartReadout({
      chart: getChart({
        page,
        deviceName: primaryDeviceName,
        metric: 'humidity',
      }).first(),
      expectedValues: [
        '01 Sept · 17:00:00',
        `${primaryInitialMeasure.humidity}%`,
      ],
      page,
      tooltipTestId: getChartTestId(primaryDeviceName, 'humidity'),
    });
    await expectDesktopChartReadout({
      chart: getChart({
        page,
        deviceName: primaryDeviceName,
        metric: 'dewPoint',
      }).first(),
      expectedValues: [
        '01 Sept · 17:00:00',
        `${primaryInitialMeasure.dew_point.toFixed(1)}°C`,
      ],
      page,
      tooltipTestId: getChartTestId(primaryDeviceName, 'dewPoint'),
    });
    await deviceAccordion.click();
    await expect(deviceAccordion).toHaveAttribute('aria-expanded', 'false');

    const zoomOut = page.getByRole('button', { name: 'Zoom out' });
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    await expect(page.getByText('Last day', { exact: true })).toBeVisible();

    for (const label of [
      'Last 3 days',
      'Last week',
      'Last 2 weeks',
      'Last month',
    ]) {
      await zoomOut.click();
      await expect(page.getByText(label, { exact: true })).toBeVisible();
      await expectDesktopChartReadout({
        chart: primaryTemperatureChart,
        expectedValues: [
          '01 Sept · 17:00:00',
          `${primaryChangedMeasure.temperature.toFixed(1)}°C`,
          `${primaryChangedMeasure.heat_index.toFixed(1)}°C`,
        ],
        page,
        tooltipTestId: getChartTestId(primaryDeviceName, 'temperature'),
      });
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
      await expectDesktopChartReadout({
        chart: primaryTemperatureChart,
        expectedValues: [
          '01 Sept · 17:00:00',
          `${primaryChangedMeasure.temperature.toFixed(1)}°C`,
          `${primaryChangedMeasure.heat_index.toFixed(1)}°C`,
        ],
        page,
        tooltipTestId: getChartTestId(primaryDeviceName, 'temperature'),
      });
    }
    await expect(zoomIn).toBeDisabled();

    const lastRange = requestedRanges.at(-1);
    expect(lastRange).toBeDefined();
    expect(
      new Date(lastRange?.end ?? '').getTime() -
        new Date(lastRange?.start ?? '').getTime(),
    ).toBe(6 * 60 * 60 * 1_000);

    await saveCoverage({
      jsCoverage: await page.coverage.stopJSCoverage(),
      name: 'weather-station-ranges-and-accordion',
    });
  });
});
