import type { Measure } from '@wx/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ values: [] as unknown[] }));
const configuredDevices = vi.hoisted(() => [
  { deviceName: 'device-alpha', icon: 'FaSeedling' },
  { deviceName: 'device-beta', icon: 'FaKitchenSet' },
  { deviceName: 'device-gamma', icon: 'FaCouch' },
  { deviceName: 'device-delta', icon: 'FaBed' },
]);
const weatherApi = vi.hoisted(() => ({
  getLatestMeasure: vi.fn(),
  getChartHistory: vi.fn(),
}));

vi.mock('#environment.ts', () => ({
  environment: { DEVICES: configuredDevices },
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

const deviceNames = configuredDevices.map(({ deviceName }) => deviceName);

const createMeasure = ({
  deviceName,
  id,
  deviceType = 'indoor',
  temperature = 20,
}: {
  deviceName: string;
  id: string;
  deviceType?: Measure['deviceType'];
  temperature?: number;
}): Measure => ({
  id,
  deviceId: 'device',
  deviceName,
  address: 'address',
  deviceType,
  measuredAt: '2026-01-01T00:00:00Z',
  temperature,
  dewPoint: 10,
  heatIndex: temperature + 1,
  humidity: 50,
  battery: 80,
  signalPowerDBM: -50,
});

const measuresByDeviceName: Record<string, Measure> = Object.fromEntries(
  configuredDevices.map(({ deviceName }, index) => [
    deviceName,
    createMeasure({
      deviceName,
      id: `123e4567-e89b-12d3-a456-426614174${String(index + 1).padStart(3, '0')}`,
      deviceType: index === 0 ? 'outdoor' : 'indoor',
      temperature: 20 + index,
    }),
  ]),
);

const historyByDeviceName: Record<string, Measure[]> = Object.fromEntries(
  configuredDevices.map(({ deviceName }) => [
    deviceName,
    [measuresByDeviceName[deviceName]],
  ]),
);

const emptyCurrentMeasures = Object.fromEntries(
  deviceNames.map((deviceName) => [deviceName, null]),
);

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
    expect(weatherApi.getLatestMeasure).toHaveBeenCalledTimes(
      configuredDevices.length,
    );
    expect(
      weatherApi.getLatestMeasure.mock.calls.map(
        ([input]) => (input as { deviceName: string }).deviceName,
      ),
    ).toEqual(deviceNames);
  });

  it('sets empty history when current measures have no readings', async () => {
    weatherApi.getLatestMeasure.mockResolvedValue({ rows: [], error: null });
    state.values = [
      { byDeviceName: emptyCurrentMeasures, error: null },
      null,
      'LAST_DAY',
      false,
    ];

    const result = useWeatherStation();
    await Promise.resolve();

    expect(result.measureHistory).toBeNull();
    expect(weatherApi.getChartHistory).not.toHaveBeenCalled();
  });

  it('loads name-keyed history and refreshes a complete current state', async () => {
    vi.useFakeTimers();
    weatherApi.getLatestMeasure.mockImplementation(
      async ({ deviceName }: { deviceName: string }) => ({
        rows: [measuresByDeviceName[deviceName]],
        error: null,
      }),
    );
    weatherApi.getChartHistory.mockResolvedValue({
      history: historyByDeviceName,
      error: null,
    });
    state.values = [
      { byDeviceName: measuresByDeviceName, error: null },
      { history: historyByDeviceName, error: null },
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

    expect(result.currentMeasures).toEqual({
      byDeviceName: measuresByDeviceName,
      error: null,
    });
    expect(result.measureHistory).toEqual({
      history: historyByDeviceName,
      error: null,
    });
    expect(weatherApi.getChartHistory).toHaveBeenCalledOnce();
    expect(weatherApi.getLatestMeasure).toHaveBeenCalledTimes(
      configuredDevices.length * 2,
    );
    result.changeRange(1);
    result.changeRange(99);
  });
});
