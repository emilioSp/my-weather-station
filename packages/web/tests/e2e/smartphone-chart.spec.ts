// Verify smartphone chart interactions through real local Supabase, cleaning up only scenario rows.

import { expect } from '@playwright/test';

import readings from '#tests/fixtures/weather-station/two-recent-readings.json' with { type: 'json' };
import { test } from '#tests/utils/test.ts';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

test('given a smartphone chart with an 11:30 Rome reading when touching and dragging then shows 11:30 and its temperatures', async ({
  page,
  measurementStore,
}) => {
  // Yesterday's local noon keeps readings in the past and makes the expected Rome time explicit.
  const now = Temporal.Now.plainDateISO('Europe/Rome')
    .subtract({ days: 1 })
    .toZonedDateTime({ timeZone: 'Europe/Rome', plainTime: '12:00' })
    .toInstant();

  const deviceName = measurementStore.deviceName;

  const earlier = {
    ...readings[0],
    measuredAt: now.subtract({ minutes: readings[0].minutesAgo }).toString(),
  };

  const latest = {
    ...readings[1],
    measuredAt: now.subtract({ minutes: readings[1].minutesAgo }).toString(),
  };

  await measurementStore.insertReading(earlier);
  await measurementStore.insertReading(latest);
  await page.clock.setFixedTime(Number(now.epochMilliseconds));

  const latestResponse = page.waitForResponse((response) =>
    response.url().includes('/rest/v1/measures?'),
  );

  const historyResponse = page.waitForResponse((response) =>
    response.url().endsWith('/rest/v1/rpc/get_chart_history'),
  );

  await page.goto('/');

  expect((await latestResponse).ok()).toBe(true);
  expect((await historyResponse).ok()).toBe(true);
  await expect(page.getByLabel('Current readings')).toContainText('25.0°C');

  const touchChart = page.getByLabel(
    `Interactive temperature chart for ${deviceName} measurements in last 3 days.`,
    { exact: true },
  );

  const touchReadout = page.getByTestId(`${deviceName}-temperature-touch-readout`);

  await expect(touchReadout.getByText('Touch and drag.')).toBeVisible();
  await touchChart.scrollIntoViewIfNeeded();
  const plot = touchChart.locator('.recharts-cartesian-grid');
  await expect(plot).toBeVisible();
  const plotBox = await plot.boundingBox();

  if (plotBox === null) throw new Error('The temperature chart plot is not rendered.');

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
  await expect(touchReadout).toContainText('11:30:00');
  await expect(touchReadout).toContainText('25.0°C');
  await expect(touchReadout).toContainText('24.5°C');

  await touchChart.evaluate((chartWrapper) => {
    chartWrapper.parentElement?.dispatchEvent(new Event('touchend', { bubbles: true }));
  });
});
