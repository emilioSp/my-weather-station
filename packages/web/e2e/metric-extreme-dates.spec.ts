// Verify metric extreme dates using controlled history rows and the approved viewport sizes.
import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';
import { loadEnv } from 'vite';
import { saveCoverage } from '#e2e/utils/save-coverage.ts';
import {
  chartMetricDetails,
  type WeatherMetric,
} from '#weather-dashboard.util.ts';

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
const devices = JSON.parse(
  loadEnv('development', process.cwd(), '').VITE_DEVICES ?? '[]',
) as { deviceName: string }[];

const primaryDevice = devices[0].deviceName;

const secondaryDevice = devices[1].deviceName;

const readFixture = (name: string): Fixture =>
  JSON.parse(
    readFileSync(`tests/fixtures/metric-extreme-dates/${name}.json`, 'utf8'),
  );

type MockDashboardInput = {
  page: Page;
  fixture: Fixture;
};

const mockDashboard = async ({ page, fixture }: MockDashboardInput) => {
  await page.route('**/rest/v1/measures**', async (route) => {
    const requestedName = new URL(route.request().url()).searchParams
      .get('device_name')
      ?.replace(/^eq\./, '');

    const deviceIndex = devices.findIndex(
      ({ deviceName }) => deviceName === requestedName,
    );

    const row = fixture.latest[deviceIndex];

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        row === undefined ? [] : [{ ...row, device_name: requestedName }],
      ),
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

for (const viewport of [
  { width: 1280, height: 700 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]) {
  test(`AC1 AC9: dates are visible, unclipped, and 13px at ${viewport.width} × ${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.coverage.startJSCoverage();
    await page.setViewportSize(viewport);
    await mockDashboard({ page, fixture: readFixture('visible-dates') });
    await page.goto('/');
    await expect(page.locator('header strong')).toHaveText('06 Oct · 14:35:20');
    await expect(page.locator('header strong')).toHaveCSS('font-size', '13px');

    for (const metric of metrics) {
      const summary = getSummary({ page, deviceName: primaryDevice, metric });
      const dates = summary.locator('time');
      await expect(dates).toHaveText(
        metric === 'temperature'
          ? ['06 Oct · 08:15', '06 Oct · 14:35']
          : ['06 Oct · 14:35', '06 Oct · 08:15'],
      );

      for (const date of await dates.all()) {
        await date.evaluate((element) =>
          element.scrollIntoView({ block: 'center' }),
        );
        await expect(date).toBeVisible();
        await expect(date).toHaveCSS('font-size', '13px');
        expect(
          await date.evaluate((element) => {
            const box = element.getBoundingClientRect();

            const valueBox =
              element.previousElementSibling?.getBoundingClientRect();

            const ancestors = [];

            for (
              let parent = element.parentElement;
              parent !== null;
              parent = parent.parentElement
            ) {
              const style = getComputedStyle(parent);

              if (
                [style.overflowX, style.overflowY].some((overflow) =>
                  ['hidden', 'clip', 'auto', 'scroll'].includes(overflow),
                )
              ) {
                ancestors.push(parent.getBoundingClientRect());
              }
            }

            return (
              box.width > 0 &&
              box.height > 0 &&
              box.left >= 0 &&
              box.right <= window.innerWidth &&
              box.top >= 0 &&
              box.bottom <= window.innerHeight &&
              valueBox !== undefined &&
              box.top >= valueBox.bottom &&
              element.scrollWidth <= element.clientWidth &&
              ancestors.every(
                (parent) =>
                  box.left >= parent.left &&
                  box.right <= parent.right &&
                  box.top >= parent.top &&
                  box.bottom <= parent.bottom,
              )
            );
          }),
        ).toBe(true);
      }
    }

    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.getByLabel('Measurement history').screenshot({
      path: testInfo.outputPath(`history-${viewport.width}.png`),
    });
    await saveCoverage({
      jsCoverage: await page.coverage.stopJSCoverage(),
      name: `extreme-dates-viewport-${viewport.width}`,
    });
  });
}

for (const scenario of [
  { fixture: 'winter-midnight', date: '07 Jan · 00:35' },
  { fixture: 'summer-midnight', date: '07 Jul · 01:35' },
]) {
  test(`AC2: ${scenario.fixture} uses Rome time without seconds or year`, async ({
    page,
  }) => {
    await mockDashboard({ page, fixture: readFixture(scenario.fixture) });
    await page.goto('/');

    for (const metric of metrics) {
      await expect(
        getSummary({ page, deviceName: primaryDevice, metric }).locator('time'),
      ).toHaveText([scenario.date, scenario.date]);
    }
  });
}

test('AC3: each sensor and metric uses its own extreme row, including a single measurement', async ({
  page,
}) => {
  await mockDashboard({
    page,
    fixture: readFixture('two-sensors-and-single-measurement'),
  });
  await page.goto('/');
  await page
    .getByRole('button', { name: secondaryDevice, exact: true })
    .click();

  for (const metric of metrics) {
    await expect(
      getSummary({ page, deviceName: primaryDevice, metric }).locator('time'),
    ).toHaveText(
      metric === 'temperature'
        ? ['06 Oct · 08:00', '06 Oct · 10:00']
        : ['06 Oct · 10:00', '06 Oct · 08:00'],
    );
    await expect(
      getSummary({ page, deviceName: secondaryDevice, metric }).locator('time'),
    ).toHaveText(['06 Oct · 11:00', '06 Oct · 11:00']);
  }
});

test('AC4: unordered repeated extremes use the earliest available row for every metric', async ({
  page,
}) => {
  await mockDashboard({ page, fixture: readFixture('unordered-ties') });
  await page.goto('/');

  for (const metric of metrics) {
    await expect(
      getSummary({ page, deviceName: primaryDevice, metric }).locator('time'),
    ).toHaveText(['06 Oct · 08:00', '06 Oct · 11:00']);
  }
});

test('AC5: changing from Last day to Last 6 hours replaces the older minimum date', async ({
  page,
}) => {
  await mockDashboard({ page, fixture: readFixture('range-change') });
  await page.goto('/');

  const summary = getSummary({
    page,
    deviceName: primaryDevice,
    metric: 'temperature',
  });

  await expect(summary.locator('time').first()).toHaveText('05 Oct · 22:00');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByText('Last 12 hours', { exact: true })).toBeVisible();
  await expect(summary.locator('time').first()).toHaveText('06 Oct · 10:00');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByText('Last 6 hours', { exact: true })).toBeVisible();
  await expect(summary.locator('time').first()).toHaveText('06 Oct · 10:00');
  await expect(summary.locator('b').first()).toHaveText('18.0°C');
});

test('AC6: refreshing changed latest readings and history replaces the high date', async ({
  page,
}) => {
  await mockDashboard({ page, fixture: readFixture('before-refresh') });
  await page.goto('/');

  const summary = getSummary({
    page,
    deviceName: primaryDevice,
    metric: 'temperature',
  });

  await expect(summary.locator('time').last()).toHaveText('06 Oct · 12:00');
  await page.unroute('**/rest/v1/measures**');
  await page.unroute('**/rest/v1/rpc/get_chart_history');
  await mockDashboard({ page, fixture: readFixture('after-refresh') });
  await page.getByRole('button', { name: 'Refresh readings' }).click();
  await expect(summary.locator('time').last()).toHaveText('06 Oct · 14:00');
  await expect(summary.locator('b').last()).toHaveText('26.0°C');
});

test('AC7: switching to Fahrenheit changes values but preserves all six dates', async ({
  page,
}) => {
  await mockDashboard({ page, fixture: readFixture('unit-change') });
  await page.goto('/');

  for (const metric of metrics) {
    await expect(
      getSummary({ page, deviceName: primaryDevice, metric }).locator('time'),
    ).toHaveText(['06 Oct · 08:00', '06 Oct · 12:00']);
  }

  await expect(
    getSummary({ page, deviceName: primaryDevice, metric: 'temperature' })
      .locator('b')
      .first(),
  ).toHaveText('18.0°C');
  await expect(
    getSummary({ page, deviceName: primaryDevice, metric: 'dewPoint' })
      .locator('b')
      .first(),
  ).toHaveText('8.0°C');
  await page.getByLabel('Temperature unit').getByText('°F').click();

  for (const metric of metrics) {
    const summary = getSummary({ page, deviceName: primaryDevice, metric });
    await expect(summary.locator('time')).toHaveText([
      '06 Oct · 08:00',
      '06 Oct · 12:00',
    ]);
    await expect(summary.locator('b').first()).toHaveText(
      { temperature: '64.4°F', dewPoint: '46.4°F', humidity: '40%' }[metric],
    );
  }
});

test('AC8: empty history keeps all three empty charts and placeholders without dates', async ({
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
    await expect(summary.locator('b')).toHaveText(['—', '—']);
    await expect(summary.locator('time')).toHaveCount(0);
  }
});
