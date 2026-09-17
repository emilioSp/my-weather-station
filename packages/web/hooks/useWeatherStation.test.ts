import type { Measure } from '@wx/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ values: [] as unknown[] }));
const weatherApi = vi.hoisted(() => ({
  getLatestMeasure: vi.fn(),
  getChartHistory: vi.fn(),
}));

vi.mock('#supabase.api.ts', () => weatherApi);
vi.mock('react', async (importOriginal) => {
  const React = await importOriginal<typeof import('react')>();
  return {
    ...React,
    useEffect: (effect: () => unknown) => effect(),
    useMemo: <T>(factory: () => T) => factory(),
    useState: <T>(value: T) =>
      [
        state.values.length > 0 ? state.values.shift() : value,
        vi.fn(),
      ] as const,
  };
});

import { useWeatherStation } from '#hooks/useWeatherStation.ts';

const measure: Measure = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  deviceId: 'device',
  deviceName: 'kitchen',
  address: 'address',
  deviceType: 'indoor',
  measuredAt: '2026-01-01T00:00:00Z',
  temperature: 20,
  dewPoint: 10,
  heatIndex: 21,
  humidity: 50,
  battery: 80,
  signalPowerDBM: -50,
};

const gardenMeasure: Measure = {
  ...measure,
  id: '123e4567-e89b-12d3-a456-426614174001',
  deviceName: 'garden',
  deviceType: 'outdoor',
};

afterEach(() => {
  state.values = [];
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useWeatherStation', () => {
  it('loads current measures when initial state is empty', async () => {
    weatherApi.getLatestMeasure.mockResolvedValue({ rows: [], error: null });
    state.values = [null, null, 'LAST_DAY', false];

    const result = useWeatherStation();
    await Promise.resolve();

    expect(result.currentMeasures).toBeNull();
    expect(weatherApi.getLatestMeasure).toHaveBeenCalledTimes(2);
    expect(weatherApi.getLatestMeasure).toHaveBeenNthCalledWith(1, {
      deviceName: 'garden',
    });
    expect(weatherApi.getLatestMeasure).toHaveBeenNthCalledWith(2, {
      deviceName: 'kitchen',
    });
  });

  it('loads name-keyed history and refreshes a complete current state', async () => {
    vi.useFakeTimers();
    weatherApi.getLatestMeasure.mockResolvedValue({
      rows: [measure],
      error: null,
    });
    weatherApi.getChartHistory.mockResolvedValue({
      history: { garden: [gardenMeasure], kitchen: [measure] },
      error: null,
    });
    state.values = [
      {
        byDeviceName: { garden: gardenMeasure, kitchen: measure },
        error: null,
      },
      { history: {}, error: null },
      'LAST_DAY',
      false,
    ];

    const result = useWeatherStation();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1_000);
    const refresh = result.refreshMeasures();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1_000);
    await refresh;

    expect(weatherApi.getChartHistory).toHaveBeenCalledOnce();
    expect(weatherApi.getLatestMeasure).toHaveBeenCalledTimes(4);
    result.changeRange(1);
    result.changeRange(99);
  });
});
