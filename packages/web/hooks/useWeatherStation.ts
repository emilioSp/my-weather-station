// Load current readings and chart history and manage weather dashboard actions.

import type { Measure } from '@wx/shared';
import * as React from 'react';

import { type DeviceConfiguration, environment } from '#environment.ts';
import supabaseApi from '#supabase.api.ts';
import {
  type MeasureHistory,
  type MeasureHistoryQueryResult,
  type MeasureQueryResult,
} from '#types.ts';
import {
  CHART_RANGES,
  type ChartRange,
  type ChartRangeKey,
  chartRangeKeys,
  chartRanges,
} from '#utils/chart-ranges.ts';
import { filterMeasuresForRange } from '#utils/filterMeasuresForRange.util.ts';
import { getLatestTimestamp } from '#utils/getLatestTimestamp.util.ts';

type CurrentMeasures = {
  byDeviceName: Record<string, Measure | null>;
  error: string | null;
};

type ChartHistory = {
  history: MeasureHistory;
  error: string | null;
};

// Browser timers have no native promise API; keep the callback at this boundary.
const waitUntil = (deadline: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, deadline - Temporal.Now.instant().epochMilliseconds));
  });

type GetLatestRowsInput = {
  results: MeasureQueryResult[];
  devices: DeviceConfiguration[];
};

const getLatestRows = ({ results, devices }: GetLatestRowsInput): CurrentMeasures => ({
  byDeviceName: Object.fromEntries(
    devices.map(({ deviceName }, index) => [deviceName, results[index].rows[0] ?? null]),
  ),
  error: results.find(({ error }) => error !== null)?.error?.message ?? null,
});

const loadLatestMeasures = async (): Promise<CurrentMeasures> => {
  const results = await Promise.all(
    environment.DEVICES.map(({ deviceName }) => supabaseApi.getLatestMeasure({ deviceName })),
  );

  return getLatestRows({ results, devices: environment.DEVICES });
};

type GetHistoryRowsInput = MeasureHistoryQueryResult & {
  devices: DeviceConfiguration[];
};

const getHistoryRows = ({ history, error, devices }: GetHistoryRowsInput): ChartHistory => ({
  history: Object.fromEntries(
    Object.entries(history).filter(([deviceName]) =>
      devices.some((device) => device.deviceName === deviceName),
    ),
  ),
  error: error?.message ?? null,
});

const getMeasures = (currentMeasures: CurrentMeasures | null): Measure[] =>
  currentMeasures === null
    ? []
    : Object.values(currentMeasures.byDeviceName).filter(
        (measure): measure is Measure => measure !== null,
      );

export const useWeatherStation = () => {
  const [currentMeasures, setCurrentMeasures] = React.useState<CurrentMeasures | null>(null);

  const [measureHistory, setMeasureHistory] = React.useState<ChartHistory | null>(null);

  const [rangeKey, setRangeKey] = React.useState<ChartRangeKey>(CHART_RANGES.LAST_DAY);

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const currentRange: ChartRange = chartRanges[rangeKey];
  const rangeIndex = chartRangeKeys.indexOf(rangeKey);
  const latestMeasuredAt = getLatestTimestamp(getMeasures(currentMeasures));

  React.useEffect(() => {
    let isMounted = true;

    const loadMeasures = async () => {
      const latestRows = await loadLatestMeasures();

      if (isMounted) {
        setCurrentMeasures(latestRows);
      }
    };

    void loadMeasures();

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (currentMeasures === null || currentMeasures.error !== null) {
      return;
    }

    if (latestMeasuredAt === null) {
      setMeasureHistory({ history: {}, error: null });

      return;
    }

    let isMounted = true;
    setMeasureHistory(null);

    const loadHistory = async () => {
      const placeholderDeadline = Temporal.Now.instant().epochMilliseconds + 100;

      const measuredAfter = Temporal.Instant.fromEpochMilliseconds(latestMeasuredAt).subtract({
        hours: currentRange.hours,
      });

      const history = await supabaseApi.getChartHistory({
        measuredAfter,
        measuredBefore: Temporal.Instant.fromEpochMilliseconds(latestMeasuredAt),
      });

      await waitUntil(placeholderDeadline);

      if (isMounted) {
        setMeasureHistory(getHistoryRows({ ...history, devices: environment.DEVICES }));
      }
    };

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [currentMeasures, currentRange, latestMeasuredAt]);

  const refreshMeasures = async () => {
    setIsRefreshing(true);
    const spinnerDeadline = Temporal.Now.instant().epochMilliseconds + 1_000;
    const latestRows = await loadLatestMeasures();

    const isUnchanged =
      latestRows.error === null &&
      environment.DEVICES.every(
        ({ deviceName }) =>
          latestRows.byDeviceName[deviceName]?.id === currentMeasures?.byDeviceName[deviceName]?.id,
      );

    if (!isUnchanged) {
      setCurrentMeasures(latestRows);
    }

    await waitUntil(spinnerDeadline);
    setIsRefreshing(false);
  };

  const changeRange = (nextRangeIndex: number): void => {
    const nextRangeKey = chartRangeKeys[nextRangeIndex];

    if (measureHistory === null || nextRangeKey === undefined) {
      return;
    }

    setMeasureHistory(null);
    setRangeKey(nextRangeKey);
  };

  const chartEnd =
    measureHistory === null
      ? null
      : getLatestTimestamp(Object.values(measureHistory.history).flat());

  const measuresByDeviceName = React.useMemo(
    () =>
      measureHistory === null
        ? {}
        : Object.fromEntries(
            Object.entries(measureHistory.history).map(([deviceName, measures]) => [
              deviceName,
              filterMeasuresForRange({
                measures,
                range: currentRange,
                end: chartEnd ?? Number.POSITIVE_INFINITY,
              }),
            ]),
          ),
    [measureHistory, currentRange, chartEnd],
  );

  return {
    currentMeasures,
    currentRange,
    isRefreshing,
    latestMeasuredAt,
    measureHistory,
    measuresByDeviceName,
    rangeIndex,
    refreshMeasures,
    changeRange,
  };
};
