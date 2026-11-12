// Provide HTTP fixtures and request tracking for browser refresh scenarios; tests control all clock changes.
import { readFileSync } from 'node:fs';

import { expect, type Page } from '@playwright/test';
import { loadEnv } from 'vite';

// JUSTIFICATION: environment.ts validates development device names as strings.
export const devices = JSON.parse(
  loadEnv('development', process.cwd(), '').VITE_DEVICES ?? '[]',
) as {
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

export type DashboardResponses = {
  readings: { status: number; json: Row[] | { message: string } };
  history: { status: number; json: Record<string, Row[]> | { message: string } };
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
  public historyQueries: { p_start: string; p_end: string }[] = [];
  public readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  public async mockDashboardResponses(responses: DashboardResponses) {
    await this.page.route('**/rest/v1/measures**', async (route) => {
      const name = new URL(route.request().url()).searchParams.get('device_name')?.slice(3) ?? '';
      this.requestedDevices.push(name);
      const response = responses.readings;
      await route.fulfill({
        ...response,
        json: Array.isArray(response.json)
          ? response.json.filter((row) => row.device_name === name)
          : response.json,
      });
    });
    await this.page.route('**/rest/v1/rpc/get_chart_history', async (route) => {
      this.historyQueries.push(route.request().postDataJSON());
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
