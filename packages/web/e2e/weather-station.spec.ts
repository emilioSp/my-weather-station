import { expect, type Page, test } from '@playwright/test';
import { saveCoverage } from './utils/save-coverage';

const initialOutdoorMeasure = {
  id: '00000000-0000-0000-0000-000000000001',
  device_type: 'outdoor',
  measured_at: '2026-09-01T14:00:00.000Z',
  temperature: 20,
  humidity: 67,
  dew_point: 12,
  heat_index: 19.5,
  battery: 80,
  signal_power_dbm: -101,
};

const initialIndoorMeasure = {
  ...initialOutdoorMeasure,
  id: '00000000-0000-0000-0000-000000000002',
  device_type: 'indoor',
  temperature: 21,
  signal_power_dbm: 1,
};

const changedOutdoorMeasure = {
  ...initialOutdoorMeasure,
  id: '00000000-0000-0000-0000-000000000003',
  measured_at: '2026-09-01T15:00:00.000Z',
  temperature: 25,
};

const changedIndoorMeasure = {
  ...initialIndoorMeasure,
  id: '00000000-0000-0000-0000-000000000004',
  measured_at: '2026-09-01T15:00:00.000Z',
  temperature: 24,
};

const history = {
  indoor: [initialIndoorMeasure, changedIndoorMeasure],
  outdoor: [initialOutdoorMeasure, changedOutdoorMeasure],
};

const mockLatestMeasures = async ({
  page,
  rows = [initialOutdoorMeasure],
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

const mockWeatherStation = async ({
  page,
  latestResponses,
  requestedRanges,
}: {
  page: Page;
  latestResponses: Array<{ indoor: object; outdoor: object }>;
  requestedRanges?: Array<{ end: string; start: string }>;
}): Promise<void> => {
  let latestResponseIndex = 0;

  await page.route('**/rest/v1/measures**', async (route) => {
    const response =
      latestResponses[
        Math.min(latestResponseIndex, latestResponses.length - 1)
      ];
    const isOutdoor = route.request().url().includes('device_type=eq.outdoor');

    await route.fulfill({
      body: JSON.stringify([isOutdoor ? response.outdoor : response.indoor]),
      contentType: 'application/json',
    });

    if (!isOutdoor) {
      latestResponseIndex += 1;
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

const waitForCharts = async (page: Page): Promise<void> => {
  await expect(page.getByRole('status')).toBeHidden({ timeout: 5_000 });
};

test.describe('Weather station', () => {
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
    await expect(page.getByText('No readings available.')).toHaveCount(2);
    await expect(
      page.getByText('No measurements in this range.').first(),
    ).toBeVisible();

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
      latestResponses: [
        { indoor: initialIndoorMeasure, outdoor: initialOutdoorMeasure },
        { indoor: changedIndoorMeasure, outdoor: changedOutdoorMeasure },
        { indoor: changedIndoorMeasure, outdoor: changedOutdoorMeasure },
      ],
    });

    await page.goto('/');
    await expect(page.getByLabel('Current readings')).toContainText('20.0°C');
    await expect(page.getByLabel('Current readings')).toContainText('-101 dBm');
    await expect(page.getByLabel('Current readings')).toContainText('1 dBm');
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByLabel('Loading chart')).toHaveCount(6);
    await expect(page.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    await waitForCharts(page);

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
      const isOutdoor = route
        .request()
        .url()
        .includes('device_type=eq.outdoor');

      await route.fulfill(
        failRefresh
          ? {
              body: JSON.stringify({ message: 'Refresh unavailable' }),
              contentType: 'application/json',
              status: 500,
            }
          : {
              body: JSON.stringify([
                isOutdoor ? initialOutdoorMeasure : initialIndoorMeasure,
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
          indoor: { ...initialIndoorMeasure, signal_power_dbm: -75 },
          outdoor: { ...initialOutdoorMeasure, signal_power_dbm: -125 },
        },
        {
          indoor: {
            ...initialIndoorMeasure,
            id: changedIndoorMeasure.id,
            signal_power_dbm: -75,
          },
          outdoor: {
            ...initialOutdoorMeasure,
            id: changedOutdoorMeasure.id,
            signal_power_dbm: -10,
          },
        },
        {
          indoor: {
            ...initialIndoorMeasure,
            id: changedIndoorMeasure.id,
            signal_power_dbm: -75,
          },
          outdoor: {
            ...initialOutdoorMeasure,
            id: changedOutdoorMeasure.id,
            signal_power_dbm: -10,
          },
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
        latestResponses: [
          { indoor: initialIndoorMeasure, outdoor: initialOutdoorMeasure },
        ],
      });

      await page.goto('/');
      await waitForCharts(page);

      const chart = page
        .getByLabel(/Interactive temperature chart for outdoor measurements/)
        .first();
      const touchReadout = chart.locator(
        'xpath=../../../../preceding-sibling::div',
      );
      await expect(touchReadout.getByText('Touch and drag.')).toBeVisible();
      await chart.scrollIntoViewIfNeeded();
      const box = await chart.boundingBox();
      if (box === null) {
        throw new Error('The outdoor temperature chart is not rendered.');
      }
      await page.evaluate(
        ({ x, y }) => {
          const chartWrapper = document.querySelector(
            '[aria-label^="Interactive temperature chart for outdoor measurements"]',
          )?.parentElement;
          const dispatchTouchEvent = (type: string) => {
            const event = new Event(type, { bubbles: true });
            Object.defineProperty(event, 'touches', {
              value: [{ clientX: x, clientY: y }],
            });
            chartWrapper?.dispatchEvent(event);
          };
          dispatchTouchEvent('touchstart');
          dispatchTouchEvent('touchmove');
        },
        { x: box.x + 200, y: box.y + 200 },
      );
      await expect(touchReadout.getByText('Touch and drag.')).toBeHidden();
      await expect(touchReadout.getByText('Heat index')).toBeVisible();
      await page.evaluate(() => {
        const chartWrapper = document.querySelector(
          '[aria-label^="Interactive temperature chart for outdoor measurements"]',
        )?.parentElement;
        chartWrapper?.dispatchEvent(new Event('touchend', { bubbles: true }));
      });

      await saveCoverage({
        jsCoverage: await page.coverage.stopJSCoverage(),
        name: 'weather-station-touch-chart',
      });
    });
  });

  test('changes chart ranges at both limits and toggles the Indoor accordion', async ({
    page,
  }) => {
    await page.coverage.startJSCoverage();
    const requestedRanges: Array<{ end: string; start: string }> = [];
    await mockWeatherStation({
      page,
      latestResponses: [
        { indoor: initialIndoorMeasure, outdoor: initialOutdoorMeasure },
      ],
      requestedRanges,
    });

    await page.goto('/');
    await waitForCharts(page);

    const indoorAccordion = page.getByRole('button', { name: 'Indoor' });
    await expect(indoorAccordion).toHaveAttribute('aria-expanded', 'false');
    await indoorAccordion.click();
    await expect(indoorAccordion).toHaveAttribute('aria-expanded', 'true');
    const indoorTemperatureChart = page
      .getByLabel(/Interactive temperature chart for indoor measurements/)
      .first();
    await indoorTemperatureChart.hover({ position: { x: 200, y: 200 } });
    await expect(
      indoorTemperatureChart
        .locator('xpath=..')
        .locator('.recharts-tooltip-wrapper'),
    ).toContainText('Temperature');
    const outdoorHumidityChart = page
      .getByLabel(/Interactive humidity chart for outdoor measurements/)
      .first();
    await outdoorHumidityChart.hover({ position: { x: 200, y: 200 } });
    await expect(
      outdoorHumidityChart
        .locator('xpath=..')
        .locator('.recharts-tooltip-wrapper'),
    ).toContainText('Humidity');
    const outdoorDewPointChart = page
      .getByLabel(/Interactive dew point chart for outdoor measurements/)
      .first();
    await outdoorDewPointChart.hover({ position: { x: 200, y: 200 } });
    await expect(
      outdoorDewPointChart
        .locator('xpath=..')
        .locator('.recharts-tooltip-wrapper'),
    ).toContainText('Dew point');
    await indoorAccordion.click();
    await expect(indoorAccordion).toHaveAttribute('aria-expanded', 'false');

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
      await waitForCharts(page);
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
      await waitForCharts(page);
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
