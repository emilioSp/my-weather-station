import { expect, type Locator, type Page, test } from '@playwright/test';
import { saveCoverage } from './utils/save-coverage';

const initialGardenMeasure = {
  id: '00000000-0000-0000-0000-000000000001',
  device_name: 'garden',
  device_type: 'outdoor',
  measured_at: '2026-09-01T14:00:00.000Z',
  temperature: 20,
  humidity: 67,
  dew_point: 12,
  heat_index: 19.5,
  battery: 80,
  signal_power_dbm: -101,
};

const initialKitchenMeasure = {
  ...initialGardenMeasure,
  id: '00000000-0000-0000-0000-000000000002',
  device_name: 'kitchen',
  device_type: 'indoor',
  temperature: 21,
  signal_power_dbm: 1,
};

const initialLivingRoomMeasure = {
  ...initialGardenMeasure,
  id: '00000000-0000-0000-0000-000000000003',
  device_name: 'living room',
  device_type: 'indoor',
  temperature: 22,
  humidity: 54,
  signal_power_dbm: -45,
};

const initialBedroomMeasure = {
  ...initialGardenMeasure,
  id: '00000000-0000-0000-0000-000000000004',
  device_name: 'bedroom',
  device_type: 'indoor',
  temperature: 19,
  humidity: 51,
  signal_power_dbm: -62,
};

const changedGardenMeasure = {
  ...initialGardenMeasure,
  id: '00000000-0000-0000-0000-000000000005',
  measured_at: '2026-09-01T15:00:00.000Z',
  temperature: 25,
};

const changedKitchenMeasure = {
  ...initialKitchenMeasure,
  id: '00000000-0000-0000-0000-000000000006',
  measured_at: '2026-09-01T15:00:00.000Z',
  temperature: 24,
};

const changedLivingRoomMeasure = {
  ...initialLivingRoomMeasure,
  id: '00000000-0000-0000-0000-000000000007',
  measured_at: '2026-09-01T15:00:00.000Z',
  temperature: 23,
};

const changedBedroomMeasure = {
  ...initialBedroomMeasure,
  id: '00000000-0000-0000-0000-000000000008',
  measured_at: '2026-09-01T15:00:00.000Z',
  temperature: 20,
};

const initialMeasures: Record<string, object> = {
  garden: initialGardenMeasure,
  kitchen: initialKitchenMeasure,
  'living room': initialLivingRoomMeasure,
  bedroom: initialBedroomMeasure,
};

const changedMeasures: Record<string, object> = {
  garden: changedGardenMeasure,
  kitchen: changedKitchenMeasure,
  'living room': changedLivingRoomMeasure,
  bedroom: changedBedroomMeasure,
};

const history = {
  garden: [initialGardenMeasure, changedGardenMeasure],
  kitchen: [initialKitchenMeasure, changedKitchenMeasure],
  'living room': [initialLivingRoomMeasure, changedLivingRoomMeasure],
  bedroom: [initialBedroomMeasure, changedBedroomMeasure],
  unconfigured: [initialGardenMeasure],
};

const mockLatestMeasures = async ({
  page,
  rows = [initialGardenMeasure],
}: {
  page: Page;
  rows?: object[];
}): Promise<void> => {
  await page.route('**/rest/v1/measures**', async (route) => {
    await route.fulfill({
      body: JSON.stringify(rows),
      contentType: 'application/json',
    });
  });
};

const mockHistory = async ({
  page,
  response,
  status = 200,
}: {
  page: Page;
  response: object;
  status?: number;
}): Promise<void> => {
  await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
    await route.fulfill({
      body: JSON.stringify(response),
      contentType: 'application/json',
      status,
    });
  });
};

const getRequestedDeviceName = (route: {
  request: () => { url: () => string };
}) =>
  new URL(route.request().url()).searchParams
    .get('device_name')
    ?.replace(/^eq\./, '');

const mockWeatherStation = async ({
  page,
  latestResponses,
  requestedRanges,
}: {
  page: Page;
  latestResponses: Array<Record<string, object>>;
  requestedRanges?: Array<{ end: string; start: string }>;
}): Promise<void> => {
  let latestResponseIndex = 0;
  const answeredDeviceNames = new Set<string>();

  await page.route('**/rest/v1/measures**', async (route) => {
    const response =
      latestResponses[
        Math.min(latestResponseIndex, latestResponses.length - 1)
      ];
    const deviceName = getRequestedDeviceName(route);
    const measure = response[deviceName ?? 'garden'] ?? response.garden;

    await route.fulfill({
      body: JSON.stringify([measure]),
      contentType: 'application/json',
    });

    answeredDeviceNames.add(deviceName ?? '');
    if (answeredDeviceNames.size === 4) {
      latestResponseIndex += 1;
      answeredDeviceNames.clear();
    }
  });
  await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
    const parameters = route.request().postDataJSON() as {
      p_end: string;
      p_start: string;
    };
    requestedRanges?.push({ end: parameters.p_end, start: parameters.p_start });
    await route.fulfill({
      body: JSON.stringify(history),
      contentType: 'application/json',
    });
  });
};

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
    await mockWeatherStation({
      page,
      latestResponses: [initialMeasures],
    });

    await page.goto('/');

    const cards = page.getByLabel('Current readings').locator('article');
    await expect(cards).toHaveCount(4);
    for (const deviceName of ['garden', 'kitchen', 'living room', 'bedroom']) {
      await expect(page.getByTestId(`${deviceName}-icon`)).toBeVisible();
      await expect(
        page.getByTestId(`${deviceName}-history-icon`),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: deviceName }),
      ).toBeVisible();
    }
    await expect(
      page.getByLabel(/Interactive temperature chart for garden measurements/),
    ).toBeVisible();
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
    await mockWeatherStation({
      page,
      latestResponses: [initialMeasures],
    });
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('/');

    const targetViewports = [
      { columns: 4, height: 700, width: 1280 },
      { columns: 2, height: 1024, width: 768 },
      { columns: 1, height: 844, width: 390 },
    ];
    const deviceNames = ['garden', 'kitchen', 'living room', 'bedroom'];
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
      expect(new Set(cardDetails.map(({ accent }) => accent)).size).toBe(4);
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
          .getByTestId('garden-indicator')
          .evaluate((indicator) => getComputedStyle(indicator).animationName),
      )
      .not.toBe('none');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect
      .poll(() =>
        page
          .getByTestId('garden-indicator')
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
      const deviceName = getRequestedDeviceName(route);
      await route.fulfill({
        body: JSON.stringify([initialMeasures[deviceName ?? 'garden']]),
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
    await expect(page.getByLabel('Loading chart')).toHaveCount(12);
    releaseHistory();
    await expect(
      page.getByLabel(/Interactive temperature chart for garden measurements/),
    ).toBeVisible();

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
      const deviceName = getRequestedDeviceName(route);
      await route.fulfill({
        body: JSON.stringify([initialMeasures[deviceName ?? 'garden']]),
        contentType: 'application/json',
      });
    });
    await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          garden: [],
          kitchen: [],
          'living room': [],
          bedroom: [],
        }),
        contentType: 'application/json',
      });
    });

    await page.goto('/');
    await expect(page.getByText('No measurements in this range.')).toHaveCount(
      12,
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
    await mockLatestMeasures({ page });
    await mockHistory({
      page,
      response: { message: 'Chart history unavailable' },
      status: 500,
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
    await mockLatestMeasures({ page, rows: [] });

    await page.goto('/');

    await expect(page.getByText('No readings yet')).toBeVisible();
    await expect(page.getByText('No readings available.')).toHaveCount(4);
    for (const deviceName of ['garden', 'kitchen', 'living room', 'bedroom']) {
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
    await mockWeatherStation({
      page,
      latestResponses: [initialMeasures, changedMeasures, changedMeasures],
    });

    await page.goto('/');
    await expect(page.getByLabel('Current readings')).toContainText('20.0°C');
    await expect(page.getByLabel('Current readings')).toContainText('-101 dBm');
    await expect(page.getByLabel('Current readings')).toContainText('1 dBm');
    await expectDesktopChartReadout({
      chart: page
        .getByLabel(/Interactive temperature chart for garden measurements/)
        .first(),
      expectedValues: ['01 Sept · 17:00:00', '25.0°C', '19.5°C'],
      page,
      tooltipTestId: 'garden-temperature-chart-tooltip',
    });

    const refreshReadings = page.getByRole('button', {
      name: 'Refresh readings',
    });
    await refreshReadings.click();
    await expect(refreshReadings).toBeDisabled();
    await expect(page.getByLabel('Current readings')).toContainText('25.0°C', {
      timeout: 5_000,
    });
    await expect(page.getByText('01 Sept · 17:00:00')).toBeVisible();

    await page.getByRole('button', { name: 'Refresh readings' }).click();
    await expect(page.getByLabel('Current readings')).toContainText('25.0°C');
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
                initialMeasures[getRequestedDeviceName(route) ?? 'garden'],
              ]),
              contentType: 'application/json',
            },
      );
    });
    await mockHistory({ page, response: history });

    await page.goto('/');
    await expect(page.getByLabel('Current readings')).toContainText('20.0°C');
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
    await mockWeatherStation({
      page,
      latestResponses: [
        {
          ...initialMeasures,
          garden: { ...initialGardenMeasure, signal_power_dbm: -125 },
          kitchen: { ...initialKitchenMeasure, signal_power_dbm: -75 },
        },
        {
          ...changedMeasures,
          kitchen: { ...changedKitchenMeasure, signal_power_dbm: -75 },
          garden: { ...changedGardenMeasure, signal_power_dbm: -10 },
        },
        {
          ...changedMeasures,
          kitchen: { ...changedKitchenMeasure, signal_power_dbm: -75 },
          garden: { ...changedGardenMeasure, signal_power_dbm: -10 },
        },
      ],
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
      await mockWeatherStation({
        page,
        latestResponses: [initialMeasures],
      });

      await page.goto('/');

      const chart = page
        .getByLabel(/Interactive temperature chart for garden measurements/)
        .first();
      const touchReadout = page.getByTestId('garden-temperature-touch-readout');
      await expect(touchReadout.getByText('Touch and drag.')).toBeVisible();
      await chart.scrollIntoViewIfNeeded();
      const plot = chart.locator('.recharts-cartesian-grid');
      await expect(plot).toBeVisible({ timeout: 5_000 });
      const plotBox = await plot.boundingBox();
      if (plotBox === null) {
        throw new Error('The garden temperature chart plot is not rendered.');
      }
      const touchPosition = {
        x: plotBox.x + plotBox.width - 1,
        y: plotBox.y + plotBox.height / 2,
      };
      await chart.evaluate((chartWrapper, position) => {
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
      await expect(touchReadout).toContainText('25.0°C');
      await expect(touchReadout).toContainText('19.5°C');
      await chart.evaluate((chartWrapper) => {
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

  test('changes chart ranges at both limits and toggles the kitchen accordion', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();
    const requestedRanges: Array<{ end: string; start: string }> = [];
    await mockWeatherStation({
      page,
      latestResponses: [initialMeasures],
      requestedRanges,
    });

    await page.goto('/');
    const gardenTemperatureChart = page
      .getByLabel(/Interactive temperature chart for garden measurements/)
      .first();
    await expectDesktopChartReadout({
      chart: gardenTemperatureChart,
      expectedValues: ['01 Sept · 17:00:00', '25.0°C', '19.5°C'],
      page,
      tooltipTestId: 'garden-temperature-chart-tooltip',
    });

    const kitchenAccordion = page.getByRole('button', { name: 'kitchen' });
    await expect(kitchenAccordion).toHaveAttribute('aria-expanded', 'false');
    await kitchenAccordion.click();
    await expect(kitchenAccordion).toHaveAttribute('aria-expanded', 'true');
    await expectDesktopChartReadout({
      chart: page
        .getByLabel(/Interactive temperature chart for kitchen measurements/)
        .first(),
      expectedValues: ['01 Sept · 17:00:00', '24.0°C', '19.5°C'],
      page,
      tooltipTestId: 'kitchen-temperature-chart-tooltip',
    });
    await expectDesktopChartReadout({
      chart: page
        .getByLabel(/Interactive humidity chart for garden measurements/)
        .first(),
      expectedValues: ['01 Sept · 17:00:00', '67%'],
      page,
      tooltipTestId: 'garden-humidity-chart-tooltip',
    });
    await expectDesktopChartReadout({
      chart: page
        .getByLabel(/Interactive dew point chart for garden measurements/)
        .first(),
      expectedValues: ['01 Sept · 17:00:00', '12.0°C'],
      page,
      tooltipTestId: 'garden-dewPoint-chart-tooltip',
    });
    await kitchenAccordion.click();
    await expect(kitchenAccordion).toHaveAttribute('aria-expanded', 'false');

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
        chart: gardenTemperatureChart,
        expectedValues: ['01 Sept · 17:00:00', '25.0°C', '19.5°C'],
        page,
        tooltipTestId: 'garden-temperature-chart-tooltip',
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
        chart: gardenTemperatureChart,
        expectedValues: ['01 Sept · 17:00:00', '25.0°C', '19.5°C'],
        page,
        tooltipTestId: 'garden-temperature-chart-tooltip',
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
