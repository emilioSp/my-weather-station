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
    setTimeout(resolve, Math.max(0, deadline - Date.now()));
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

  const [rangeKey, setRangeKey] = React.useState<ChartRangeKey>(CHART_RANGES.LAST_THREE_DAYS);

  const [isRefreshing, setIsRefreshing] = React.useState(true);
  const busy = React.useRef(false);
  const currentRange: ChartRange = chartRanges[rangeKey];
  const rangeIndex = chartRangeKeys.indexOf(rangeKey);
  const latestMeasuredAt = getLatestTimestamp(getMeasures(currentMeasures));

  type LoadHistoryInput = {
    measures: CurrentMeasures;
    range: ChartRange;
  };

  const loadHistory = async ({ measures, range }: LoadHistoryInput) => {
    const latestTimestamp = getLatestTimestamp(getMeasures(measures));

    if (latestTimestamp === null) {
      setMeasureHistory({ history: {}, error: null });

      return;
    }

    setMeasureHistory(null);
    const placeholderDeadline = Date.now() + 100;

    const history = await supabaseApi.getChartHistory({
      measuredAfter: new Date(latestTimestamp - range.hours * 60 * 60 * 1_000),
      measuredBefore: new Date(latestTimestamp),
    });

    await waitUntil(placeholderDeadline);
    setMeasureHistory(getHistoryRows({ ...history, devices: environment.DEVICES }));
  };

  const refreshMeasures = async () => {
    if (busy.current) {
      return;
    }

    busy.current = true;
    setIsRefreshing(true);
    const spinnerDeadline = Date.now() + (currentMeasures === null ? 0 : 1_000);
    const latestRows = await loadLatestMeasures();

    const isUnchanged =
      latestRows.error === null &&
      currentMeasures?.error === null &&
      environment.DEVICES.every(
        ({ deviceName }) =>
          latestRows.byDeviceName[deviceName]?.id === currentMeasures.byDeviceName[deviceName]?.id,
      );

    if (!isUnchanged) {
      setCurrentMeasures(latestRows);
    }

    if (latestRows.error !== null) {
      setMeasureHistory(null);
    } else if (!isUnchanged || measureHistory === null || measureHistory.error !== null) {
      await loadHistory({ measures: latestRows, range: currentRange });
    }

    await waitUntil(spinnerDeadline);
    busy.current = false;
    setIsRefreshing(false);
  };

  // Read the current data and range without restarting the dashboard's fixed schedule.
  const refreshOnSchedule = React.useEffectEvent(refreshMeasures);

  React.useEffect(() => {
    void refreshOnSchedule();
    const interval = setInterval(() => void refreshOnSchedule(), 60_000);

    return () => clearInterval(interval);
  }, []);

  const changeRange = async (nextRangeIndex: number): Promise<void> => {
    const nextRangeKey = chartRangeKeys[nextRangeIndex];

    if (busy.current || currentMeasures === null || nextRangeKey === undefined) {
      return;
    }

    busy.current = true;
    setIsRefreshing(true);
    setRangeKey(nextRangeKey);
    await loadHistory({ measures: currentMeasures, range: chartRanges[nextRangeKey] });
    busy.current = false;
    setIsRefreshing(false);
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
