// Verify fixed refresh timing, failure recovery, and request exclusion with controlled browser time.
import { readFileSync } from 'node:fs';

import { expect, type Page } from '@playwright/test';
import { loadEnv } from 'vite';

import { test } from '#e2e/utils/test.ts';

// JUSTIFICATION: environment.ts validates development device names as strings.
const devices = JSON.parse(loadEnv('development', process.cwd(), '').VITE_DEVICES ?? '[]') as {
  deviceName: string;
}[];

type Row = {
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

type Fixture = { initial: Row[]; changed: Row[] };

const fixture: Fixture = JSON.parse(
  readFileSync('tests/fixtures/weather-station/automatic-refresh.json', 'utf8'),
);

const startTime = Date.parse('2026-10-06T12:00:00Z');

const primaryDevice = devices[0].deviceName;

// Each test explicitly selects its responses and gates. No implicit setup or generated scenarios.
class DashboardScenario {
  public changed = false;
  public empty = false;
  public readingsError = false;
  public historyError = false;
  public readingsGate = Promise.resolve();
  public historyGate = Promise.resolve();
  public requestedDevices: string[] = [];
  public historyQueries: { p_start: string; p_end: string }[] = [];
  public readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  public async open() {
    await this.page.clock.install({ time: startTime });
    await this.page.clock.pauseAt(startTime);
    await this.page.route('**/rest/v1/measures**', async (route) => {
      const name = new URL(route.request().url()).searchParams.get('device_name')?.slice(3) ?? '';
      this.requestedDevices.push(name);
      await this.readingsGate;
      const index = devices.findIndex(({ deviceName }) => deviceName === name);
      const row = (this.changed ? fixture.changed : fixture.initial)[index];
      await route.fulfill({
        status: this.readingsError ? 500 : 200,
        contentType: 'application/json',
        body: JSON.stringify(
          this.readingsError
            ? { message: 'Latest readings unavailable' }
            : this.empty
              ? []
              : [{ ...row, device_name: name }],
        ),
      });
    });
    await this.page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
      this.historyQueries.push(route.request().postDataJSON());
      await this.historyGate;
      await route.fulfill({
        status: this.historyError ? 500 : 200,
        contentType: 'application/json',
        body: JSON.stringify(
          this.historyError
            ? { message: 'Chart history unavailable' }
            : Object.fromEntries(
                devices.map(({ deviceName }, index) => [
                  deviceName,
                  (this.changed
                    ? [fixture.initial[index], fixture.changed[index]]
                    : [fixture.initial[index]]
                  ).map((row) => ({ ...row, device_name: deviceName })),
                ]),
              ),
        ),
      });
    });
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  public button() {
    return this.page.getByRole('button', { name: 'Refresh readings' });
  }

  public async at(seconds: number) {
    const now = await this.page.evaluate(() => Date.now());
    await this.page.clock.runFor(startTime + seconds * 1_000 - now);
  }

  public async finish() {
    // Advance only browser time until the response and minimum display deadlines have settled.
    await expect
      .poll(async () => {
        await this.page.clock.runFor(250);

        return this.button().isEnabled();
      })
      .toBe(true);
  }

  public async assertRefreshCount(count: number) {
    await expect.poll(() => this.requestedDevices.length).toBe(count * devices.length);

    for (const { deviceName } of devices) {
      expect(this.requestedDevices.filter((name) => name === deviceName)).toHaveLength(count);
    }
  }
}

test('given loaded readings when manual refresh and range changes occur between ticks then keeps the original minute boundaries and unchanged charts', async ({
  page,
}) => {
  const scenario = new DashboardScenario(page);
  scenario.changed = true;
  await scenario.open();
  await scenario.finish();
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  await scenario.at(59);
  await scenario.assertRefreshCount(1);
  await scenario.at(60);
  await scenario.finish();
  await scenario.assertRefreshCount(2);
  expect(scenario.historyQueries).toHaveLength(1);
  await expect(page.getByLabel('Current readings')).toContainText('26.0°C');
  const summary = page.locator(`[id="history-${primaryDevice}"] section`).first();
  await expect(summary.getByTestId('high-value')).toHaveText('26.0°C');
  await expect(summary.locator('time').last()).toHaveText('06 Oct · 14:00');
  await scenario.at(80);
  await scenario.button().click();
  await scenario.finish();
  await scenario.at(90);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await scenario.finish();
  await expect(page.getByText('Last day', { exact: true })).toBeVisible();
  await scenario.at(119);
  await scenario.assertRefreshCount(3);
  await scenario.at(120);
  await scenario.finish();
  await scenario.assertRefreshCount(4);
  expect(scenario.historyQueries).toHaveLength(2);
  expect(navigations).toHaveLength(0);
});

test('given a hidden dashboard when a minute passes and visibility returns then refreshes only on scheduled ticks', async ({
  page,
}) => {
  const scenario = new DashboardScenario(page);
  await scenario.open();
  await scenario.finish();
  await scenario.at(20);
  // Simulate the visibility API without freezing browser timers in a background automation tab.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await scenario.at(60);
  await scenario.finish();
  await scenario.assertRefreshCount(2);
  await scenario.at(70);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await scenario.at(119);
  await scenario.assertRefreshCount(2);
  await scenario.at(120);
  await scenario.finish();
  await scenario.assertRefreshCount(3);
});

test('given changed readings when an automatic tick runs in the six-hour range then updates all cards and plotted metric extremes', async ({
  page,
}) => {
  const scenario = new DashboardScenario(page);
  await scenario.open();
  await scenario.finish();

  for (const label of ['Last day', 'Last 12 hours', 'Last 6 hours']) {
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await scenario.finish();
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }

  scenario.changed = true;
  await scenario.at(60);
  await scenario.finish();
  await scenario.assertRefreshCount(2);

  for (const [index, { deviceName }] of devices.entries()) {
    await expect(page.getByLabel('Current readings').locator('article').nth(index)).toContainText(
      `${fixture.changed[index].temperature.toFixed(1)}°C`,
    );
    await expect(page.locator(`[id="history-${deviceName}"] .recharts-line-curve`)).toHaveCount(3);
  }

  await expect(page.locator('header strong')).toHaveText('06 Oct · 14:00:00');
  await expect(page.getByText('Last 6 hours', { exact: true })).toBeVisible();
  expect(scenario.historyQueries.at(-1)).toEqual({
    p_start: '2026-10-06T06:00:00.000Z',
    p_end: '2026-10-06T12:00:00.000Z',
  });
  const summaries = page.locator(`[id="history-${primaryDevice}"] section`);
  await expect(summaries.getByTestId('low-value')).toHaveText(['25.0°C', '70%', '12.0°C']);
  await expect(summaries.getByTestId('high-value')).toHaveText(['26.0°C', '71%', '13.0°C']);
  await expect(summaries.locator('time')).toHaveText([
    '06 Oct · 12:00',
    '06 Oct · 14:00',
    '06 Oct · 12:00',
    '06 Oct · 14:00',
    '06 Oct · 12:00',
    '06 Oct · 14:00',
  ]);

  // The plotted SVG has both history points, not only the summary extrema.
  const temperatureChart = page.getByLabel(
    `Interactive temperature chart for ${primaryDevice} measurements in last 6 hours.`,
    { exact: true },
  );

  await expect(
    temperatureChart.locator('.recharts-line').first().locator('.recharts-line-curve'),
  ).toHaveAttribute('d', /L/);
});

test('given pending initial readings when errors and empty and populated responses follow then keeps the refresh control visible', async ({
  page,
}) => {
  const scenario = new DashboardScenario(page);
  const pending = Promise.withResolvers<void>();
  scenario.readingsGate = pending.promise;
  scenario.readingsError = true;
  await scenario.open();
  await expect(page.getByText('Loading current readings...')).toBeVisible();
  await expect(scenario.button()).toBeVisible();
  await expect(scenario.button()).toBeDisabled();
  pending.resolve();
  await scenario.finish();
  await expect(page.getByText('Latest readings unavailable')).toBeVisible();
  await expect(scenario.button()).toBeVisible();
  scenario.readingsError = false;
  scenario.empty = true;
  await scenario.button().click();
  await scenario.finish();
  await expect(page.getByText('No readings yet')).toBeVisible();
  await expect(page.getByText('No readings available.')).toHaveCount(devices.length);
  await expect(page.locator('[id^="history-"]')).toHaveCount(0);
  await expect(scenario.button()).toBeVisible();
  scenario.empty = false;
  scenario.changed = true;
  await scenario.button().click();
  await scenario.finish();
  await expect(page.getByLabel('Current readings')).toContainText('26.0°C');
  await expect(scenario.button()).toBeVisible();
  scenario.readingsError = true;
  await scenario.button().click();
  await scenario.finish();
  await expect(page.getByText('Latest readings unavailable')).toBeVisible();
  await expect(scenario.button()).toBeVisible();
});

for (const action of ['manual', 'automatic']) {
  for (const failure of ['readings', 'history']) {
    test(`given loaded data when ${action} refresh fails ${failure} then replaces the failed section and recovers on the next tick`, async ({
      page,
    }) => {
      const scenario = new DashboardScenario(page);
      await scenario.open();
      await scenario.finish();
      await expect(
        page.locator(`[id="history-${primaryDevice}"]`).getByTestId('high-value').first(),
      ).toHaveText('25.0°C');
      scenario.changed = true;
      scenario.readingsError = failure === 'readings';
      scenario.historyError = failure === 'history';

      if (action === 'manual') {
        await scenario.at(55);
        await scenario.button().click();
      } else {
        await scenario.at(60);
      }

      await scenario.finish();

      const message =
        failure === 'readings'
          ? 'Latest readings unavailable'
          : 'Unable to load chart history: Chart history unavailable';

      await expect(page.getByText(message, { exact: true })).toBeVisible();
      await expect(page.locator('.recharts-wrapper')).toHaveCount(0);
      await expect(page.getByLabel('Current readings')).toHaveCount(failure === 'readings' ? 0 : 1);

      if (failure === 'history') {
        await expect(page.getByLabel('Current readings')).toContainText('26.0°C');
      }

      await expect(scenario.button()).toBeVisible();
      await expect(scenario.button()).toBeEnabled();
      scenario.readingsError = false;
      scenario.historyError = false;
      const historyCount = scenario.historyQueries.length;
      await scenario.at(action === 'manual' ? 60 : 120);
      await scenario.finish();
      await expect(page.getByText(message, { exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Current readings')).toContainText('26.0°C');
      await expect(
        page.locator(`[id="history-${primaryDevice}"]`).getByTestId('high-value').first(),
      ).toHaveText('26.0°C');
      expect(scenario.historyQueries).toHaveLength(historyCount + 1);
    });
  }
}

// Manual retry is covered by the scheduled-error tests and the refresh-control state sequence.
for (const failure of ['readings', 'history']) {
  test(`given an initial ${failure} error when the next tick succeeds then clears the error and displays readings and history`, async ({
    page,
  }) => {
    const scenario = new DashboardScenario(page);
    scenario.changed = true;
    scenario.readingsError = failure === 'readings';
    scenario.historyError = failure === 'history';
    await scenario.open();
    await scenario.finish();

    const message =
      failure === 'readings'
        ? 'Latest readings unavailable'
        : 'Unable to load chart history: Chart history unavailable';

    await expect(page.getByText(message, { exact: true })).toBeVisible();
    scenario.readingsError = false;
    scenario.historyError = false;

    await scenario.at(60);

    await scenario.finish();
    await expect(page.getByText(message, { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Current readings')).toContainText('26.0°C');
    const summary = page.locator(`[id="history-${primaryDevice}"] section`).first();
    await expect(summary.getByTestId('high-value')).toHaveText('26.0°C');
    await expect(summary.locator('time').last()).toHaveText('06 Oct · 14:00');
    await scenario.assertRefreshCount(2);
  });
}

// All origins share refreshMeasures; cover each origin and both history outcomes without a full matrix.
for (const { origin, historyFails } of [
  { origin: 'initial', historyFails: false },
  { origin: 'manual', historyFails: false },
  { origin: 'automatic', historyFails: true },
]) {
  test(`given pending ${origin} requests when ticks pass before history ${historyFails ? 'fails' : 'succeeds'} then skips busy ticks and disables refresh until completion`, async ({
    page,
  }) => {
    const scenario = new DashboardScenario(page);
    const readings = Promise.withResolvers<void>();
    const history = Promise.withResolvers<void>();

    if (origin === 'initial') {
      scenario.readingsGate = readings.promise;
      scenario.historyGate = history.promise;
    }

    await scenario.open();

    if (origin !== 'initial') {
      await scenario.finish();
      scenario.changed = true;
      scenario.readingsGate = readings.promise;
      scenario.historyGate = history.promise;
      await scenario.at(origin === 'manual' ? 55 : 60);

      if (origin === 'manual') await scenario.button().click();
    }

    const refreshCount = origin === 'initial' ? 1 : 2;
    const firstBusyTick = origin === 'automatic' ? 120 : 60;
    await scenario.assertRefreshCount(refreshCount);
    await expect(scenario.button()).toBeVisible();
    await expect(scenario.button()).toBeDisabled();
    await scenario.at(firstBusyTick);
    await scenario.assertRefreshCount(refreshCount);
    await scenario.at(firstBusyTick + 5);
    readings.resolve();
    await expect.poll(() => scenario.historyQueries.length).toBe(origin === 'initial' ? 1 : 2);
    await expect(page.getByLabel('Current readings')).toContainText(
      origin === 'initial' ? '25.0°C' : '26.0°C',
    );
    await expect(scenario.button()).toBeDisabled();
    await scenario.at(firstBusyTick + 60);
    await scenario.assertRefreshCount(refreshCount);
    await scenario.at(firstBusyTick + 75);
    scenario.historyError = historyFails;
    history.resolve();
    await scenario.finish();
    await expect(scenario.button()).toBeEnabled();

    if (historyFails) {
      await expect(
        page.getByText('Unable to load chart history: Chart history unavailable', {
          exact: true,
        }),
      ).toBeVisible();
    } else {
      await expect(
        page.locator(`[id="history-${primaryDevice}"]`).getByTestId('high-value').first(),
      ).toHaveText(origin === 'initial' ? '25.0°C' : '26.0°C');
    }

    await scenario.at(firstBusyTick + 119);
    await scenario.assertRefreshCount(refreshCount);
    await scenario.at(firstBusyTick + 120);
    await scenario.finish();
    await scenario.assertRefreshCount(refreshCount + 1);
  });
}

for (const failure of ['readings', 'history']) {
  test(`given a scheduled ${failure} error when manually retrying before the next tick then immediately restores the failed section`, async ({
    page,
  }) => {
    const scenario = new DashboardScenario(page);
    await scenario.open();
    await scenario.finish();
    scenario.changed = true;
    scenario.readingsError = failure === 'readings';
    scenario.historyError = failure === 'history';
    await scenario.at(60);
    await scenario.finish();

    const message =
      failure === 'readings'
        ? 'Latest readings unavailable'
        : 'Unable to load chart history: Chart history unavailable';

    await expect(page.getByText(message, { exact: true })).toBeVisible();
    scenario.readingsError = false;
    scenario.historyError = false;
    await scenario.at(75);
    await scenario.button().click();
    await scenario.finish();
    await expect(page.getByText(message, { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Current readings')).toContainText('26.0°C');
    const summary = page.locator(`[id="history-${primaryDevice}"] section`).first();
    await expect(summary.getByTestId('high-value')).toHaveText('26.0°C');
    await expect(summary.locator('time').last()).toHaveText('06 Oct · 14:00');
    await scenario.assertRefreshCount(3);
    expect(await page.evaluate(() => Date.now())).toBeLessThan(startTime + 120_000);
  });
}
