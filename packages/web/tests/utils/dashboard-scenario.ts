// Provide HTTP fixtures and request tracking for browser refresh scenarios; tests control all clock changes.
import { readFileSync } from 'node:fs';

import { expect, type Page } from '@playwright/test';
import type { Measurement } from '@wx/shared';
import { loadEnv } from 'vite';

import type { LatestMeasurements } from '#types.ts';

// JUSTIFICATION: environment.ts validates development device names as strings.
export const devices = JSON.parse(
  loadEnv('development', process.cwd(), '').VITE_DEVICES ?? '[]',
) as {
  deviceName: string;
}[];

type Fixture = { initial: Measurement[]; changed: Measurement[] };

export type DashboardResponses = {
  readings: { status: number; json: LatestMeasurements | { error: { message: string } } };
  history: { status: number; json: Record<string, Measurement[]> | { error: { message: string } } };
};

const fixture: Fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/weather-station/automatic-refresh.json', import.meta.url),
    'utf8',
  ),
);

export const startTime = Date.parse('2026-10-06T12:00:00Z');

export const primaryDevice = devices[0].deviceName;

const readingsByDevice = (rows: Measurement[]) =>
  Object.fromEntries(
    devices.map(({ deviceName }, index) => [
      deviceName,
      { ...rows[index], device_name: deviceName },
    ]),
  );

export const initialReadings = readingsByDevice(fixture.initial);

export const changedReadings = readingsByDevice(fixture.changed);

export const initialHistory = Object.fromEntries(
  Object.entries(initialReadings).map(([name, row]) => [name, [row]]),
);

export const changedHistory = Object.fromEntries(
  Object.entries(changedReadings).map(([name, row]) => [name, [initialReadings[name], row]]),
);

// Control browser time and count requests. Each test defines its own responses and delays.
export class DashboardScenario {
  public latestQueries: string[][] = [];
  public historyQueries: Record<string, string>[] = [];
  public readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  public async mockDashboardResponses(responses: DashboardResponses) {
    await this.page.route('**/get-latest-measure?*', async (route) => {
      this.latestQueries.push(new URL(route.request().url()).searchParams.getAll('device_names'));
      await route.fulfill(responses.readings);
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
    const expectedNames = devices.map(({ deviceName }) => deviceName);
    await expect
      .poll(() => this.latestQueries)
      .toEqual(Array.from({ length: count }, () => expectedNames));
  }
}
