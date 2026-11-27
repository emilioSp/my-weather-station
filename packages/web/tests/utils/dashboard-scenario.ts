// Provide HTTP fixtures and request tracking for browser refresh scenarios; tests control all clock changes.
import { readFileSync } from 'node:fs';

import { expect, type Page } from '@playwright/test';
import type { Measure } from '@wx/shared';
import { loadEnv } from 'vite';

// JUSTIFICATION: environment.ts validates development device names as strings.
export const devices = JSON.parse(
  loadEnv('development', process.cwd(), '').VITE_DEVICES ?? '[]',
) as {
  deviceName: string;
}[];

type Fixture = { initial: Measure[]; changed: Measure[] };

export type DashboardResponses = {
  readings: { status: number; json: Measure[] | { error: { message: string } } };
  history: { status: number; json: Record<string, Measure[]> | { error: { message: string } } };
};

const fixture: Fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/weather-station/automatic-refresh.json', import.meta.url),
    'utf8',
  ),
);

export const startTime = Date.parse('2026-10-06T12:00:00Z');

export const primaryDevice = devices[0].deviceName;

export const initialReadings = devices.map(({ deviceName }, index) => ({
  ...fixture.initial[index],
  device_name: deviceName,
}));

export const changedReadings = devices.map(({ deviceName }, index) => ({
  ...fixture.changed[index],
  device_name: deviceName,
}));

export const initialHistory = Object.fromEntries(
  initialReadings.map((row) => [row.device_name, [row]]),
);

export const changedHistory = Object.fromEntries(
  changedReadings.map((row, index) => [row.device_name, [initialReadings[index], row]]),
);

// Control browser time and count requests. Each test defines its own responses and delays.
export class DashboardScenario {
  public requestedDevices: string[] = [];
  public historyQueries: Record<string, string>[] = [];
  public readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  public async mockDashboardResponses(responses: DashboardResponses) {
    await this.page.route('**/get-latest-measure?*', async (route) => {
      const name = new URL(route.request().url()).searchParams.get('device_name') ?? '';
      this.requestedDevices.push(name);
      const response = responses.readings;
      await route.fulfill({
        ...response,
        json: Array.isArray(response.json)
          ? (response.json.find((row) => row.device_name === name) ?? null)
          : response.json,
      });
    });
    await this.page.route('**/get-chart-history?*', async (route) => {
      this.historyQueries.push(Object.fromEntries(new URL(route.request().url()).searchParams));
      await route.fulfill(responses.history);
    });
  }

  public button() {
    return this.page.getByRole('button', { name: 'Refresh readings' });
  }

  public async advanceClockToSecond(seconds: number) {
    const now = await this.page.evaluate(() => Date.now());
    await this.page.clock.runFor(startTime + seconds * 1_000 - now);
  }

  public async assertRefreshCount(count: number) {
    await expect.poll(() => this.requestedDevices.length).toBe(count * devices.length);

    for (const { deviceName } of devices) {
      expect(this.requestedDevices.filter((name) => name === deviceName)).toHaveLength(count);
    }
  }
}
