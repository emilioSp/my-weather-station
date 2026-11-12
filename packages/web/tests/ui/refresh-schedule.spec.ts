// Verify dashboard refresh behavior with explicit responses and browser clock changes.
import { expect } from '@playwright/test';

import {
  DashboardScenario,
  type DashboardResponses,
  devices,
  startTime,
  primaryDevice,
  initialReadings,
  changedReadings,
  initialHistory,
  changedHistory,
} from '#tests/utils/dashboard-scenario.ts';
import { test } from '#tests/utils/test.ts';

test('given loaded readings when manual refresh and range changes occur between ticks then keeps the original minute boundaries and unchanged charts', async ({
  page,
}) => {
  const scenario = new DashboardScenario(page);

  const responses: DashboardResponses = {
    readings: { status: 200, json: changedReadings },
    history: { status: 200, json: changedHistory },
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
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  await scenario.advanceClockToSecond(59);
  await scenario.assertRefreshCount(1);
  await scenario.advanceClockToSecond(60);
  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  await scenario.assertRefreshCount(2);
  expect(scenario.historyQueries).toHaveLength(1);
  await expect(page.getByLabel('Current readings')).toContainText('26.0°C');
  const summary = page.locator(`[id="history-${primaryDevice}"] section`).first();
  await expect(summary.getByTestId('high-value')).toHaveText('26.0°C');
  await expect(summary.locator('time').last()).toHaveText('06 Oct · 14:00');
  await scenario.advanceClockToSecond(80);
  await scenario.button().click();
  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  await scenario.advanceClockToSecond(90);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  await expect(page.getByText('Last day', { exact: true })).toBeVisible();
  await scenario.advanceClockToSecond(119);
  await scenario.assertRefreshCount(3);
  await scenario.advanceClockToSecond(120);
  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  await scenario.assertRefreshCount(4);
  expect(scenario.historyQueries).toHaveLength(2);
  expect(navigations).toHaveLength(0);
});

test('given a hidden dashboard when a minute passes and visibility returns then refreshes only on scheduled ticks', async ({
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
  await scenario.advanceClockToSecond(20);
  // Simulate the visibility API without freezing browser timers in a background automation tab.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await scenario.advanceClockToSecond(60);
  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  await scenario.assertRefreshCount(2);
  await scenario.advanceClockToSecond(70);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await scenario.advanceClockToSecond(119);
  await scenario.assertRefreshCount(2);
  await scenario.advanceClockToSecond(120);
  // Advance browser deadlines explicitly until this refresh completes.
  await expect
    .poll(async () => {
      await page.clock.runFor(250);

      return scenario.button().isEnabled();
    })
    .toBe(true);
  await scenario.assertRefreshCount(3);
});

test('given changed readings when an automatic tick runs in the six-hour range then updates all cards and plotted metric extremes', async ({
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

  for (const label of ['Last day', 'Last 12 hours', 'Last 6 hours']) {
    await page.getByRole('button', { name: 'Zoom in' }).click();
    // Advance browser deadlines explicitly until this refresh completes.
    await expect
      .poll(async () => {
        await page.clock.runFor(250);

        return scenario.button().isEnabled();
      })
      .toBe(true);
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }

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
  await scenario.assertRefreshCount(2);

  for (const [index, { deviceName }] of devices.entries()) {
    await expect(page.getByLabel('Current readings').locator('article').nth(index)).toContainText(
      `${changedReadings[index].temperature.toFixed(1)}°C`,
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
