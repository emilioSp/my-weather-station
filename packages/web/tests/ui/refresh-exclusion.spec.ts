// Verify dashboard refresh behavior with explicit responses and browser clock changes.
import { expect } from '@playwright/test';

import {
  DashboardScenario,
  type DashboardResponses,
  startTime,
  primaryDevice,
  initialReadings,
  changedReadings,
  initialHistory,
  changedHistory,
} from '#tests/utils/dashboard-scenario.ts';
import { test } from '#tests/utils/test.ts';

test(`given pending initial requests when ticks pass before history succeeds then skips busy ticks and disables refresh until completion`, async ({
  page,
}) => {
  const scenario = new DashboardScenario(page);

  const responses: DashboardResponses = {
    readings: { status: 200, json: initialReadings },
    history: { status: 200, json: initialHistory },
  };

  const readings = Promise.withResolvers<void>();
  const history = Promise.withResolvers<void>();

  const gates = {
    readings: readings.promise,
    history: history.promise,
  };

  await page.route('**/rest/v1/measures**', async (route) => {
    const name = new URL(route.request().url()).searchParams.get('device_name')?.slice(3) ?? '';
    scenario.requestedDevices.push(name);
    await gates.readings;
    const response = responses.readings;
    await route.fulfill({
      ...response,
      json: Array.isArray(response.json)
        ? response.json.filter((row) => row.device_name === name)
        : response.json,
    });
  });
  await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
    scenario.historyQueries.push(route.request().postDataJSON());
    await gates.history;
    await route.fulfill(responses.history);
  });
  await page.clock.install({ time: startTime });
  await page.clock.pauseAt(startTime);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const refreshCount = 1;
  const firstBusyTick = 60;
  await scenario.assertRefreshCount(refreshCount);
  await expect(scenario.button()).toBeVisible();
  await expect(scenario.button()).toBeDisabled();
  await scenario.advanceClockToSecond(firstBusyTick);
  await scenario.assertRefreshCount(refreshCount);
  await scenario.advanceClockToSecond(firstBusyTick + 5);
  readings.resolve();
  await expect.poll(() => scenario.historyQueries.length).toBe(1);
  await expect(page.getByLabel('Current readings')).toContainText('25.0°C');
  await expect(scenario.button()).toBeDisabled();
  await scenario.advanceClockToSecond(firstBusyTick + 60);
  await scenario.assertRefreshCount(refreshCount);
  await scenario.advanceClockToSecond(firstBusyTick + 75);

  history.resolve();
  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  await expect(scenario.button()).toBeEnabled();

  await expect(
    page.locator(`[id="history-${primaryDevice}"]`).getByTestId('high-value').first(),
  ).toHaveText('25.0°C');

  await scenario.advanceClockToSecond(firstBusyTick + 119);
  await scenario.assertRefreshCount(refreshCount);
  await scenario.advanceClockToSecond(firstBusyTick + 120);
  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  await scenario.assertRefreshCount(refreshCount + 1);
});

test(`given pending manual requests when ticks pass before history succeeds then skips busy ticks and disables refresh until completion`, async ({
  page,
}) => {
  const scenario = new DashboardScenario(page);

  const responses: DashboardResponses = {
    readings: { status: 200, json: initialReadings },
    history: { status: 200, json: initialHistory },
  };

  const readings = Promise.withResolvers<void>();
  const history = Promise.withResolvers<void>();

  const gates = {
    readings: Promise.resolve(),
    history: Promise.resolve(),
  };

  await page.route('**/rest/v1/measures**', async (route) => {
    const name = new URL(route.request().url()).searchParams.get('device_name')?.slice(3) ?? '';
    scenario.requestedDevices.push(name);
    await gates.readings;
    const response = responses.readings;
    await route.fulfill({
      ...response,
      json: Array.isArray(response.json)
        ? response.json.filter((row) => row.device_name === name)
        : response.json,
    });
  });
  await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
    scenario.historyQueries.push(route.request().postDataJSON());
    await gates.history;
    await route.fulfill(responses.history);
  });
  await page.clock.install({ time: startTime });
  await page.clock.pauseAt(startTime);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  responses.readings = { status: 200, json: changedReadings };
  responses.history = { status: 200, json: changedHistory };
  gates.readings = readings.promise;
  gates.history = history.promise;
  await scenario.advanceClockToSecond(55);

  await scenario.button().click();

  const refreshCount = 2;
  const firstBusyTick = 60;
  await scenario.assertRefreshCount(refreshCount);
  await expect(scenario.button()).toBeVisible();
  await expect(scenario.button()).toBeDisabled();
  await scenario.advanceClockToSecond(firstBusyTick);
  await scenario.assertRefreshCount(refreshCount);
  await scenario.advanceClockToSecond(firstBusyTick + 5);
  readings.resolve();
  await expect.poll(() => scenario.historyQueries.length).toBe(2);
  await expect(page.getByLabel('Current readings')).toContainText('26.0°C');
  await expect(scenario.button()).toBeDisabled();
  await scenario.advanceClockToSecond(firstBusyTick + 60);
  await scenario.assertRefreshCount(refreshCount);
  await scenario.advanceClockToSecond(firstBusyTick + 75);

  history.resolve();
  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  await expect(scenario.button()).toBeEnabled();

  await expect(
    page.locator(`[id="history-${primaryDevice}"]`).getByTestId('high-value').first(),
  ).toHaveText('26.0°C');

  await scenario.advanceClockToSecond(firstBusyTick + 119);
  await scenario.assertRefreshCount(refreshCount);
  await scenario.advanceClockToSecond(firstBusyTick + 120);
  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  await scenario.assertRefreshCount(refreshCount + 1);
});

test(`given pending automatic requests when ticks pass before history fails then skips busy ticks and disables refresh until completion`, async ({
  page,
}) => {
  const scenario = new DashboardScenario(page);

  const responses: DashboardResponses = {
    readings: { status: 200, json: initialReadings },
    history: { status: 200, json: initialHistory },
  };

  const readings = Promise.withResolvers<void>();
  const history = Promise.withResolvers<void>();

  const gates = {
    readings: Promise.resolve(),
    history: Promise.resolve(),
  };

  await page.route('**/rest/v1/measures**', async (route) => {
    const name = new URL(route.request().url()).searchParams.get('device_name')?.slice(3) ?? '';
    scenario.requestedDevices.push(name);
    await gates.readings;
    const response = responses.readings;
    await route.fulfill({
      ...response,
      json: Array.isArray(response.json)
        ? response.json.filter((row) => row.device_name === name)
        : response.json,
    });
  });
  await page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
    scenario.historyQueries.push(route.request().postDataJSON());
    await gates.history;
    await route.fulfill(responses.history);
  });
  await page.clock.install({ time: startTime });
  await page.clock.pauseAt(startTime);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  responses.readings = { status: 200, json: changedReadings };
  responses.history = { status: 200, json: changedHistory };
  gates.readings = readings.promise;
  gates.history = history.promise;
  await scenario.advanceClockToSecond(60);

  const refreshCount = 2;
  const firstBusyTick = 120;
  await scenario.assertRefreshCount(refreshCount);
  await expect(scenario.button()).toBeVisible();
  await expect(scenario.button()).toBeDisabled();
  await scenario.advanceClockToSecond(firstBusyTick);
  await scenario.assertRefreshCount(refreshCount);
  await scenario.advanceClockToSecond(firstBusyTick + 5);
  readings.resolve();
  await expect.poll(() => scenario.historyQueries.length).toBe(2);
  await expect(page.getByLabel('Current readings')).toContainText('26.0°C');
  await expect(scenario.button()).toBeDisabled();
  await scenario.advanceClockToSecond(firstBusyTick + 60);
  await scenario.assertRefreshCount(refreshCount);
  await scenario.advanceClockToSecond(firstBusyTick + 75);

  responses.history = { status: 500, json: { message: 'Chart history unavailable' } };

  history.resolve();
  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  await expect(scenario.button()).toBeEnabled();

  await expect(
    page.getByText('Unable to load chart history: Chart history unavailable', {
      exact: true,
    }),
  ).toBeVisible();

  await scenario.advanceClockToSecond(firstBusyTick + 119);
  await scenario.assertRefreshCount(refreshCount);
  await scenario.advanceClockToSecond(firstBusyTick + 120);
  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  await scenario.assertRefreshCount(refreshCount + 1);
});
