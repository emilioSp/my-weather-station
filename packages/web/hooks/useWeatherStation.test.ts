// Verify weather station state and API calls with controlled React hook mocks.

import { readFileSync } from 'node:fs';

import type { Measure } from '@wx/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SupabaseApi } from '#supabase.api.ts';
import { CHART_RANGES } from '#utils/chart-ranges.ts';

const state = vi.hoisted<{ values: unknown[] }>(() => ({ values: [] }));

const configuredDevices = vi.hoisted(() => [
  { deviceName: 'device-alpha', icon: 'FaSeedling' },
  { deviceName: 'device-beta', icon: 'FaKitchenSet' },
  { deviceName: 'device-gamma', icon: 'FaCouch' },
  { deviceName: 'device-delta', icon: 'FaBed' },
]);

const weatherApi = vi.hoisted(() => ({
  getLatestMeasure: vi.fn<SupabaseApi['getLatestMeasure']>(),
  getChartHistory: vi.fn<SupabaseApi['getChartHistory']>(),
}));

vi.mock('#environment.ts', () => ({
  environment: { DEVICES: configuredDevices },
}));

vi.mock('#supabase.api.ts', () => ({ default: weatherApi }));

vi.mock('react', async (importOriginal) => {
  const React = await importOriginal<typeof import('react')>();

  return {
    ...React,
    useEffect: (effect: () => unknown) => effect(),
    useMemo: <T>(factory: () => T) => factory(),
    useRef: <T>(value: T) => ({ current: value }),
    useEffectEvent: <T>(callback: T) => callback,
    useState: <T>(value: T) =>
      [
        state.values.length > 0 ? state.values.shift() : value,
        vi.fn<React.Dispatch<React.SetStateAction<T>>>(),
      ] as const,
  };
});

import { useWeatherStation } from '#hooks/useWeatherStation.ts';

const deviceNames = configuredDevices.map(({ deviceName }) => deviceName);

const measuresByDeviceName: Record<string, Measure> = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/hooks/complete-current-readings.json', import.meta.url),
    'utf8',
  ),
);

const historyByDeviceName: Record<string, Measure[]> = Object.fromEntries(
  configuredDevices.map(({ deviceName }) => [deviceName, [measuresByDeviceName[deviceName]]]),
);

const emptyCurrentMeasures = Object.fromEntries(
  deviceNames.map((deviceName) => [deviceName, null]),
);

afterEach(() => {
  state.values = [];
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useWeatherStation', () => {
  it('given empty initial state when loading the station then requests current measures for every configured device', async () => {
    vi.useFakeTimers();
    weatherApi.getLatestMeasure.mockResolvedValue({ rows: [], error: null });
    state.values = [null, null, CHART_RANGES.LAST_DAY, false];

    const result = useWeatherStation();
    await Promise.resolve();

    expect(result.currentMeasures).toBeNull();
    expect(weatherApi.getLatestMeasure).toHaveBeenCalledTimes(configuredDevices.length);
    expect(weatherApi.getLatestMeasure.mock.calls.map(([input]) => input.deviceName)).toEqual(
      deviceNames,
    );
  });

  it('given current measures without readings when loading the station then does not request chart history', async () => {
    vi.useFakeTimers();
    weatherApi.getLatestMeasure.mockResolvedValue({ rows: [], error: null });
    state.values = [
      { byDeviceName: emptyCurrentMeasures, error: null },
      null,
      CHART_RANGES.LAST_DAY,
      false,
    ];

    const result = useWeatherStation();
    await Promise.resolve();

    expect(result.measureHistory).toBeNull();
    expect(weatherApi.getChartHistory).not.toHaveBeenCalled();
  });

  it('given current readings without loaded history when opening the station then requests one day of history', async () => {
    vi.useFakeTimers();
    weatherApi.getLatestMeasure.mockImplementation(async ({ deviceName }) => ({
      rows: [measuresByDeviceName[deviceName]],
      error: null,
    }));
    weatherApi.getChartHistory.mockResolvedValue({
      history: historyByDeviceName,
      error: null,
    });
    state.values = [
      { byDeviceName: measuresByDeviceName, error: null },
      null,
      CHART_RANGES.LAST_DAY,
      false,
    ];

    const result = useWeatherStation();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(result.currentMeasures).toEqual({
      byDeviceName: measuresByDeviceName,
      error: null,
    });
    expect(result.measureHistory).toBeNull();
    expect(weatherApi.getChartHistory).toHaveBeenCalledOnce();
    expect(weatherApi.getChartHistory).toHaveBeenCalledWith({
      measuredAfter: new Date('2025-12-31T00:00:00Z'),
      measuredBefore: new Date('2026-01-01T00:00:00Z'),
    });
    expect(weatherApi.getLatestMeasure).toHaveBeenCalledTimes(configuredDevices.length);
  });
});
