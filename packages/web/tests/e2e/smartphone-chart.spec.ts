// Verify smartphone chart interactions through real local Supabase, cleaning up only scenario rows.

import { randomUUID } from 'node:crypto';

import { expect } from '@playwright/test';
import { METER_TYPES } from '@wx/shared';
import { Client } from 'pg';
import { z } from 'zod';

import readings from '#tests/fixtures/weather-station/smartphone-chart-readings.json' with { type: 'json' };
import { test as base } from '#tests/utils/test.ts';

type SmartphoneReadings = {
  deviceName: string;
  latest: (typeof readings)[number] & { measuredAt: string };
};

const test = base.extend<{ smartphoneReadings: SmartphoneReadings }>({
  smartphoneReadings: async ({ page }, use, testInfo) => {
    const deviceName = z.string().min(1).parse(testInfo.project.metadata.deviceName);

    const database = new Client({
      host: '127.0.0.1',
      port: 54322,
      database: 'postgres',
      user: 'postgres',
      password: 'postgres',
    });

    const now = Temporal.Now.instant().round({ smallestUnit: 'second', roundingMode: 'floor' });

    const measures = readings.map((reading) => ({
      ...reading,
      id: randomUUID(),
      measuredAt: now.subtract({ minutes: reading.minutesAgo }).toString(),
    }));

    await database.connect();

    try {
      for (const measure of measures) {
        await database.query(
          `INSERT INTO measures (
            id, device_id, device_name, device_type, temperature, dew_point,
            heat_index, humidity, battery, signal_power_dbm, measured_at
          ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, 80, -50, $8)`,
          [
            measure.id,
            deviceName,
            METER_TYPES.OUTDOOR,
            measure.temperature,
            measure.dewPoint,
            measure.heatIndex,
            measure.humidity,
            measure.measuredAt,
          ],
        );
      }

      await page.clock.setFixedTime(Number(now.epochMilliseconds));
      await use({ deviceName, latest: measures[1] });
    } finally {
      try {
        await database.query('DELETE FROM measures WHERE id = ANY($1::uuid[])', [
          measures.map(({ id }) => id),
        ]);
      } finally {
        await database.end();
      }
    }
  },
});

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

test('given a smartphone chart when touching and dragging then replaces the prompt with the reading time and temperatures', async ({
  page,
  smartphoneReadings,
}) => {
  const { deviceName, latest } = smartphoneReadings;

  const latestResponse = page.waitForResponse((response) =>
    response.url().includes('/rest/v1/measures?'),
  );

  const historyResponse = page.waitForResponse((response) =>
    response.url().endsWith('/rest/v1/rpc/get_chart_history'),
  );

  await page.goto('/');

  expect((await latestResponse).ok()).toBe(true);
  expect((await historyResponse).ok()).toBe(true);
  await expect(page.getByLabel('Current readings')).toContainText(
    `${latest.temperature.toFixed(1)}°C`,
  );

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

  const expectedTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(Number(Temporal.Instant.from(latest.measuredAt).epochMilliseconds));

  await expect(touchReadout.getByText('Touch and drag.')).toBeHidden();
  await expect(touchReadout).toContainText(expectedTime);
  await expect(touchReadout).toContainText(`${latest.temperature.toFixed(1)}°C`);
  await expect(touchReadout).toContainText(`${latest.heatIndex.toFixed(1)}°C`);

  await touchChart.evaluate((chartWrapper) => {
    chartWrapper.parentElement?.dispatchEvent(new Event('touchend', { bubbles: true }));
  });
});
