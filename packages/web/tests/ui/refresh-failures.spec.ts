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

for (const { section, errorResponses, errorMessage, currentReadingCount } of [
  {
    section: 'readings',
    errorResponses: {
      readings: { status: 500, json: { message: 'Latest readings unavailable' } },
      history: { status: 200, json: changedHistory },
    } satisfies DashboardResponses,
    errorMessage: 'Latest readings unavailable',
    currentReadingCount: 0,
  },
  {
    section: 'history',
    errorResponses: {
      readings: { status: 200, json: changedReadings },
      history: { status: 500, json: { message: 'Chart history unavailable' } },
    } satisfies DashboardResponses,
    errorMessage: 'Unable to load chart history: Chart history unavailable',
    currentReadingCount: 1,
  },
]) {
  test(`given an initial ${section} error when the next tick succeeds then clears the error and displays readings and history`, async ({
    page,
  }) => {
    const scenario = new DashboardScenario(page);

    const responses: DashboardResponses = { ...errorResponses };

    await scenario.mockDashboardResponses(responses);
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

    await expect(page.getByText(errorMessage, { exact: true })).toBeVisible();
    responses.readings = { status: 200, json: changedReadings };
    responses.history = { status: 200, json: changedHistory };

    await scenario.advanceClockToSecond(60);

    // Advance browser deadlines explicitly until this refresh completes.
    await expect
      .poll(async () => {
        await page.clock.runFor(250);

        return scenario.button().isEnabled();
      })
      .toBe(true);
    await expect(page.getByText(errorMessage, { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Current readings')).toContainText('26.0°C');
    const summary = page.locator(`[id="history-${primaryDevice}"] section`).first();
    await expect(summary.getByTestId('high-value')).toHaveText('26.0°C');
    await expect(summary.locator('time').last()).toHaveText('06 Oct · 14:00');
    await scenario.assertRefreshCount(2);
  });

  test(`given loaded data when manual ${section} refresh fails then shows the ${section} error and recovers on the next tick`, async ({
    page,
  }) => {
    const scenario = new DashboardScenario(page);

    const responses: DashboardResponses = {
      readings: { status: 200, json: initialReadings },
      history: { status: 200, json: initialHistory },
    };

    await scenario.mockDashboardResponses(responses);
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
    await expect(
      page.locator(`[id="history-${primaryDevice}"]`).getByTestId('high-value').first(),
    ).toHaveText('25.0°C');
    responses.readings = errorResponses.readings;
    responses.history = errorResponses.history;

    await scenario.advanceClockToSecond(55);
    await scenario.button().click();

    // Advance browser deadlines explicitly until this refresh completes.
    await expect
      .poll(async () => {
        await page.clock.runFor(250);

        return scenario.button().isEnabled();
      })
      .toBe(true);

    await expect(page.getByText(errorMessage, { exact: true })).toBeVisible();
    await expect(page.locator('.recharts-wrapper')).toHaveCount(0);
    await expect(page.getByLabel('Current readings')).toHaveCount(currentReadingCount);
    await expect(page.getByLabel('Current readings').filter({ hasText: '26.0°C' })).toHaveCount(
      currentReadingCount,
    );

    await expect(scenario.button()).toBeVisible();
    await expect(scenario.button()).toBeEnabled();
    responses.readings = { status: 200, json: changedReadings };
    responses.history = { status: 200, json: changedHistory };
    const historyCount = scenario.historyQueries.length;
    await scenario.advanceClockToSecond(60);
    // Advance browser deadlines explicitly until this refresh completes.
    await expect
      .poll(async () => {
        await page.clock.runFor(250);

        return scenario.button().isEnabled();
      })
      .toBe(true);
    await expect(page.getByText(errorMessage, { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Current readings')).toContainText('26.0°C');
    await expect(
      page.locator(`[id="history-${primaryDevice}"]`).getByTestId('high-value').first(),
    ).toHaveText('26.0°C');
    expect(scenario.historyQueries).toHaveLength(historyCount + 1);
  });

  test(`given loaded data when automatic ${section} refresh fails then shows the ${section} error and recovers on the next tick`, async ({
    page,
  }) => {
    const scenario = new DashboardScenario(page);

    const responses: DashboardResponses = {
      readings: { status: 200, json: initialReadings },
      history: { status: 200, json: initialHistory },
    };

    await scenario.mockDashboardResponses(responses);
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
    await expect(
      page.locator(`[id="history-${primaryDevice}"]`).getByTestId('high-value').first(),
    ).toHaveText('25.0°C');
    responses.readings = errorResponses.readings;
    responses.history = errorResponses.history;

    await scenario.advanceClockToSecond(60);

    // Advance browser deadlines explicitly until this refresh completes.
    await expect
      .poll(async () => {
        await page.clock.runFor(250);

        return scenario.button().isEnabled();
      })
      .toBe(true);

    await expect(page.getByText(errorMessage, { exact: true })).toBeVisible();
    await expect(page.locator('.recharts-wrapper')).toHaveCount(0);
    await expect(page.getByLabel('Current readings')).toHaveCount(currentReadingCount);
    await expect(page.getByLabel('Current readings').filter({ hasText: '26.0°C' })).toHaveCount(
      currentReadingCount,
    );

    await expect(scenario.button()).toBeVisible();
    await expect(scenario.button()).toBeEnabled();
    responses.readings = { status: 200, json: changedReadings };
    responses.history = { status: 200, json: changedHistory };
    const historyCount = scenario.historyQueries.length;
    await scenario.advanceClockToSecond(120);
    // Advance browser deadlines explicitly until this refresh completes.
    await expect
      .poll(async () => {
        await page.clock.runFor(250);

        return scenario.button().isEnabled();
      })
      .toBe(true);
    await expect(page.getByText(errorMessage, { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Current readings')).toContainText('26.0°C');
    await expect(
      page.locator(`[id="history-${primaryDevice}"]`).getByTestId('high-value').first(),
    ).toHaveText('26.0°C');
    expect(scenario.historyQueries).toHaveLength(historyCount + 1);
  });

  test(`given a scheduled ${section} error when manually retrying before the next tick then immediately restores the failed section`, async ({
    page,
  }) => {
    const scenario = new DashboardScenario(page);

    const responses: DashboardResponses = {
      readings: { status: 200, json: initialReadings },
      history: { status: 200, json: initialHistory },
    };

    await scenario.mockDashboardResponses(responses);
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
    responses.readings = errorResponses.readings;
    responses.history = errorResponses.history;
    await scenario.advanceClockToSecond(60);
    // Advance browser deadlines explicitly until this refresh completes.
    await expect
      .poll(async () => {
        await page.clock.runFor(250);

        return scenario.button().isEnabled();
      })
      .toBe(true);

    await expect(page.getByText(errorMessage, { exact: true })).toBeVisible();
    responses.readings = { status: 200, json: changedReadings };
    responses.history = { status: 200, json: changedHistory };
    await scenario.advanceClockToSecond(75);
    await scenario.button().click();
    // Advance browser deadlines explicitly until this refresh completes.
    await expect
      .poll(async () => {
        await page.clock.runFor(250);

        return scenario.button().isEnabled();
      })
      .toBe(true);
    await expect(page.getByText(errorMessage, { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Current readings')).toContainText('26.0°C');
    const summary = page.locator(`[id="history-${primaryDevice}"] section`).first();
    await expect(summary.getByTestId('high-value')).toHaveText('26.0°C');
    await expect(summary.locator('time').last()).toHaveText('06 Oct · 14:00');
    await scenario.assertRefreshCount(3);
    expect(await page.evaluate(() => Date.now())).toBeLessThan(startTime + 120_000);
  });
}
