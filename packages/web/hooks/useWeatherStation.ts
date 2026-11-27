// Load current readings and chart history and manage weather dashboard actions.

import type { Measurement } from '@wx/shared';
import * as React from 'react';

import { getChartHistory } from '#api/getChartHistory.ts';
import { getLatestMeasurement } from '#api/getLatestMeasurement.ts';
import { toWeatherApiError } from '#api/utils/toWeatherApiError.util.ts';
import { type DeviceConfiguration, environment } from '#environment.ts';
import type { LatestMeasurementQueryResult, MeasurementHistory } from '#types.ts';
import {
  CHART_RANGES,
  type ChartRange,
  type ChartRangeKey,
  chartRangeKeys,
  chartRanges,
} from '#utils/chart-ranges.ts';
import { filterMeasurementsForRange } from '#utils/filterMeasurementsForRange.util.ts';
import { getLatestTimestamp } from '#utils/getLatestTimestamp.util.ts';

type CurrentMeasurements = {
  byDeviceName: Record<string, Measurement | null>;
  error: string | null;
};

// Browser timers have no native promise API; keep the callback at this boundary.
const waitUntil = (deadline: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, deadline - Date.now()));
  });

type GetLatestRowsInput = {
  results: LatestMeasurementQueryResult[];
  devices: DeviceConfiguration[];
};

const getLatestRows = ({ results, devices }: GetLatestRowsInput): CurrentMeasurements => ({
  byDeviceName: Object.fromEntries(
    devices.map(({ deviceName }, index) => [deviceName, results[index].measurement]),
  ),
  error: results.find(({ error }) => error !== null)?.error?.message ?? null,
});

const loadLatestMeasurements = async (): Promise<CurrentMeasurements> => {
  const results = await Promise.all(
    environment.DEVICES.map(({ deviceName }) => getLatestMeasurement(deviceName)),
  );

  return getLatestRows({ results, devices: environment.DEVICES });
};

const getMeasurements = (currentMeasurements: CurrentMeasurements | null): Measurement[] =>
  currentMeasurements === null
    ? []
    : Object.values(currentMeasurements.byDeviceName).filter(
        (measurement): measurement is Measurement => measurement !== null,
      );

export const useWeatherStation = () => {
  const [currentMeasurements, setCurrentMeasurements] = React.useState<CurrentMeasurements | null>(
    null,
  );

  const [measurementHistory, setMeasurementHistory] = React.useState<
    MeasurementHistory | Error | null
  >(null);

  const [rangeKey, setRangeKey] = React.useState<ChartRangeKey>(CHART_RANGES.LAST_THREE_DAYS);

  const [isRefreshing, setIsRefreshing] = React.useState(true);
  const busy = React.useRef(false);
  const currentRange: ChartRange = chartRanges[rangeKey];
  const rangeIndex = chartRangeKeys.indexOf(rangeKey);
  const latestMeasuredAt = getLatestTimestamp(getMeasurements(currentMeasurements));

  type LoadHistoryInput = {
    measurements: CurrentMeasurements;
    range: ChartRange;
  };

  const loadHistory = async ({ measurements, range }: LoadHistoryInput) => {
    const latestTimestamp = getLatestTimestamp(getMeasurements(measurements));

    if (latestTimestamp === null) {
      setMeasurementHistory({});

      return;
    }

    setMeasurementHistory(null);
    const placeholderDeadline = Date.now() + 100;

    const history = await getChartHistory({
      measuredAfter: new Date(latestTimestamp - range.hours * 60 * 60 * 1_000),
      measuredBefore: new Date(latestTimestamp),
    }).catch(toWeatherApiError);

    await waitUntil(placeholderDeadline);
    setMeasurementHistory(history);
  };

  const refreshMeasurements = async () => {
    if (busy.current) {
      return;
    }

    busy.current = true;
    setIsRefreshing(true);
    const spinnerDeadline = Date.now() + (currentMeasurements === null ? 0 : 1_000);
    const latestRows = await loadLatestMeasurements();

    const isUnchanged =
      latestRows.error === null &&
      currentMeasurements?.error === null &&
      environment.DEVICES.every(
        ({ deviceName }) =>
          latestRows.byDeviceName[deviceName]?.id ===
          currentMeasurements.byDeviceName[deviceName]?.id,
      );

    if (!isUnchanged) {
      setCurrentMeasurements(latestRows);
    }

    if (latestRows.error !== null) {
      setMeasurementHistory(null);
    } else if (!isUnchanged || measurementHistory === null || measurementHistory instanceof Error) {
      await loadHistory({ measurements: latestRows, range: currentRange });
    }

    await waitUntil(spinnerDeadline);
    busy.current = false;
    setIsRefreshing(false);
  };

  // Read the current data and range without restarting the dashboard's fixed schedule.
  const refreshOnSchedule = React.useEffectEvent(refreshMeasurements);

  React.useEffect(() => {
    void refreshOnSchedule();
    const interval = setInterval(() => void refreshOnSchedule(), 60_000);

    return () => clearInterval(interval);
  }, []);

  const changeRange = async (nextRangeIndex: number): Promise<void> => {
    const nextRangeKey = chartRangeKeys[nextRangeIndex];

    if (busy.current || currentMeasurements === null || nextRangeKey === undefined) {
      return;
    }

    busy.current = true;
    setIsRefreshing(true);
    setRangeKey(nextRangeKey);
    await loadHistory({ measurements: currentMeasurements, range: chartRanges[nextRangeKey] });
    busy.current = false;
    setIsRefreshing(false);
  };

  const measurementsByDeviceName = React.useMemo(() => {
    if (measurementHistory === null || measurementHistory instanceof Error) {
      return {};
    }

    const configuredHistory = Object.entries(measurementHistory).filter(([deviceName]) =>
      environment.DEVICES.some((device) => device.deviceName === deviceName),
    );

    const chartEnd = getLatestTimestamp(
      configuredHistory.flatMap(([, measurements]) => measurements),
    );

    return Object.fromEntries(
      configuredHistory.map(([deviceName, measurements]) => [
        deviceName,
        filterMeasurementsForRange({
          measurements,
          range: currentRange,
          end: chartEnd ?? Number.POSITIVE_INFINITY,
        }),
      ]),
    );
  }, [measurementHistory, currentRange]);

  return {
    currentMeasurements,
    currentRange,
    isRefreshing,
    latestMeasuredAt,
    historyError: measurementHistory instanceof Error ? measurementHistory.message : null,
    isHistoryLoading: measurementHistory === null,
    measurementsByDeviceName,
    rangeIndex,
    refreshMeasurements,
    changeRange,
  };
};
