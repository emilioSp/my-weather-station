// Verify normal loading, refresh, and history ranges through the browser, Supabase, and PostgreSQL.
import { expect } from '@playwright/test';

import readings from '#tests/fixtures/weather-station/two-recent-readings.json' with { type: 'json' };
import { test } from '#tests/utils/test.ts';
import { WEATHER_METRICS } from '#utils/weather-metrics.ts';

for (const { metric, label, expectedReadout } of [
  { metric: WEATHER_METRICS.TEMPERATURE, label: 'temperature', expectedReadout: '25.0°C' },
  { metric: WEATHER_METRICS.HUMIDITY, label: 'humidity', expectedReadout: '65%' },
  { metric: WEATHER_METRICS.DEW_POINT, label: 'dew point', expectedReadout: '13.0°C' },
]) {
  test(`given stored readings when hovering the latest ${label} reading then shows ${expectedReadout}`, async ({
    page,
    measurementStore,
  }) => {
    const now = Temporal.Now.instant().round({ smallestUnit: 'second', roundingMode: 'floor' });
    await measurementStore.insertReading({
      ...readings[0],
      measuredAt: now.subtract({ minutes: 60 }).toString(),
    });
    await measurementStore.insertReading({
      ...readings[1],
      measuredAt: now.subtract({ minutes: 30 }).toString(),
    });
    await page.clock.setFixedTime(Number(now.epochMilliseconds));
    await page.goto('/');
    await expect(page.getByLabel('Current readings')).toContainText('25.0°C');
    await expect(page.getByLabel('Current readings')).toContainText('-50 dBm');

    const chart = page.getByLabel(
      `Interactive ${label} chart for ${measurementStore.deviceName} measurements in last 3 days.`,
      { exact: true },
    );

    await chart.scrollIntoViewIfNeeded();
    const plot = chart.locator('.recharts-cartesian-grid');
    await expect(plot).toBeVisible();
    const chartBox = await chart.boundingBox();
    const plotBox = await plot.boundingBox();

    if (chartBox === null || plotBox === null) throw new Error('The chart plot is not rendered.');

    await chart.hover({
      position: {
        x: plotBox.x - chartBox.x + plotBox.width - 1,
        y: plotBox.y - chartBox.y + plotBox.height / 2,
      },
    });
    await expect(
      page.getByTestId(`${measurementStore.deviceName}-${metric}-chart-tooltip`),
    ).toContainText(expectedReadout);
  });
}

test('given a loaded reading when a newer stored reading is manually refreshed then updates the card and maximum date and value', async ({
  page,
  measurementStore,
}) => {
  const now = Temporal.Now.instant().round({ smallestUnit: 'second', roundingMode: 'floor' });
  const earlierTime = now.subtract({ minutes: 60 }).toString();
  const newerTime = now.subtract({ minutes: 30 }).toString();
  await measurementStore.insertReading({ ...readings[0], measuredAt: earlierTime });
  await page.clock.setFixedTime(Number(now.epochMilliseconds));
  await page.goto('/');
  const summary = page.locator(`[id="history-${measurementStore.deviceName}"] section`).first();
  await expect(summary.getByTestId('high-value')).toHaveText('20.0°C');
  await expect(summary.locator('time').last()).toHaveAttribute(
    'datetime',
    earlierTime.replace('Z', '+00:00'),
  );

  await measurementStore.insertReading({
    ...readings[1],
    measuredAt: newerTime,
    signalPowerDBM: -42,
  });
  await page.getByRole('button', { name: 'Refresh readings' }).click();

  await expect(page.getByLabel('Current readings')).toContainText('25.0°C');
  await expect(page.getByLabel('Current readings')).toContainText('-42 dBm');
  await expect(summary.getByTestId('high-value')).toHaveText('25.0°C');
  await expect(summary.locator('time').last()).toHaveAttribute(
    'datetime',
    newerTime.replace('Z', '+00:00'),
  );
});

test('given unchanged stored readings when manually refreshing then retains the card and chart maximum', async ({
  page,
  measurementStore,
}) => {
  const now = Temporal.Now.instant().round({ smallestUnit: 'second', roundingMode: 'floor' });
  const measuredAt = now.subtract({ minutes: 30 }).toString();
  await measurementStore.insertReading({ ...readings[1], measuredAt });
  await page.clock.setFixedTime(Number(now.epochMilliseconds));
  await page.goto('/');
  const summary = page.locator(`[id="history-${measurementStore.deviceName}"] section`).first();
  await expect(summary.getByTestId('high-value')).toHaveText('25.0°C');

  await page.getByRole('button', { name: 'Refresh readings' }).click();
  await expect(page.getByRole('button', { name: 'Refresh readings' })).toBeEnabled();

  await expect(page.getByLabel('Current readings')).toContainText('25.0°C');
  await expect(summary.getByTestId('high-value')).toHaveText('25.0°C');
  await expect(summary.locator('time').last()).toHaveAttribute(
    'datetime',
    measuredAt.replace('Z', '+00:00'),
  );
});

for (const { direction, firstRange, secondRange, lastRange, lowValue, lowAgeHours } of [
  {
    direction: 'in',
    firstRange: 'Last day',
    secondRange: 'Last 12 hours',
    lastRange: 'Last 6 hours',
    lowValue: '25.0°C',
    lowAgeHours: 1,
  },
  {
    direction: 'out',
    firstRange: 'Last week',
    secondRange: 'Last 2 weeks',
    lastRange: 'Last month',
    lowValue: '20.0°C',
    lowAgeHours: 14,
  },
]) {
  test(`given a fourteen-hour-old minimum when zooming ${direction} to the limit then shows ${lastRange} and disables that control`, async ({
    page,
    measurementStore,
  }) => {
    const now = Temporal.Now.instant().round({ smallestUnit: 'second', roundingMode: 'floor' });
    const olderTime = now.subtract({ hours: 14 }).toString();
    const newerTime = now.subtract({ hours: 1 }).toString();
    await measurementStore.insertReading({ ...readings[0], measuredAt: olderTime });
    await measurementStore.insertReading({ ...readings[1], measuredAt: newerTime });
    await page.clock.setFixedTime(Number(now.epochMilliseconds));
    await page.goto('/');
    const summary = page.locator(`[id="history-${measurementStore.deviceName}"] section`).first();
    await expect(summary.getByTestId('low-value')).toHaveText('20.0°C');
    await expect(summary.locator('time').first()).toHaveAttribute(
      'datetime',
      olderTime.replace('Z', '+00:00'),
    );
    const zoom = page.getByRole('button', { name: `Zoom ${direction}` });

    await zoom.click();
    await expect(page.getByText(firstRange, { exact: true })).toBeVisible();
    await zoom.click();
    await expect(page.getByText(secondRange, { exact: true })).toBeVisible();
    await zoom.click();
    await expect(page.getByText(lastRange, { exact: true })).toBeVisible();

    await expect(zoom).toBeDisabled();
    await expect(summary.getByTestId('low-value')).toHaveText(lowValue);
    await expect(summary.locator('time').first()).toHaveAttribute(
      'datetime',
      now.subtract({ hours: lowAgeHours }).toString().replace('Z', '+00:00'),
    );
    await expect(summary.getByTestId('high-value')).toHaveText('25.0°C');
  });
}

test('given a meter without readings when opening the dashboard then shows an empty card without requesting history', async ({
  page,
  measurementStore,
}) => {
  const historyRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/rest/v1/rpc/get_chart_history'))
      historyRequests.push(request.url());
  });

  await page.goto('/');

  await expect(page.getByText('No readings available.')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Refresh readings' })).toBeEnabled();
  expect(historyRequests).toEqual([]);
  await expect(page.getByLabel('Current readings')).toContainText(measurementStore.deviceName);
});

test('given an empty meter when its first reading is stored and manually refreshed then replaces the empty card with the reading and chart', async ({
  page,
  measurementStore,
}) => {
  await page.goto('/');
  await expect(page.getByText('No readings available.')).toBeVisible();
  const measuredAt = Temporal.Now.instant().subtract({ minutes: 1 }).toString();
  await measurementStore.insertReading({ ...readings[1], measuredAt });

  await page.getByRole('button', { name: 'Refresh readings' }).click();

  await expect(page.getByText('No readings available.')).toHaveCount(0);
  await expect(page.getByLabel('Current readings')).toContainText('25.0°C');
  const summary = page.locator(`[id="history-${measurementStore.deviceName}"] section`).first();
  await expect(summary.getByTestId('high-value')).toHaveText('25.0°C');
});
