import type { Measure } from '@wx/shared';
import * as React from 'react';
import { environment } from '#environment.ts';
import {
  getChartHistory,
  getLatestMeasure,
  type MeasureHistory,
  type MeasureHistoryQueryResult,
  type MeasureQueryResult,
} from '#supabase.api.ts';
import {
  CHART_RANGES,
  type ChartRange,
  type ChartRangeKey,
  chartRangeKeys,
  chartRanges,
  filterMeasuresForRange,
  getLatestTimestamp,
} from '#weather-dashboard.util.ts';

type CurrentMeasures = {
  byDeviceName: Record<string, Measure | null>;
  error: string | null;
};

type ChartHistory = {
  history: MeasureHistory;
  error: string | null;
};

const waitUntil = (deadline: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, deadline - Date.now()));
  });

const getLatestRows = ({
  results,
}: {
  results: MeasureQueryResult[];
}): CurrentMeasures => ({
  byDeviceName: Object.fromEntries(
    environment.DEVICES.map(({ deviceName }, index) => [
      deviceName,
      results[index].rows[0] ?? null,
    ]),
  ),
  error: results.find(({ error }) => error !== null)?.error?.message ?? null,
});

const loadLatestMeasures = async (): Promise<CurrentMeasures> => {
  const results = await Promise.all(
    environment.DEVICES.map(({ deviceName }) =>
      getLatestMeasure({ deviceName }),
    ),
  );

  return getLatestRows({ results });
};

const getHistoryRows = ({
  history,
  error,
}: MeasureHistoryQueryResult): ChartHistory => ({
  history: Object.fromEntries(
    Object.entries(history).filter(([deviceName]) =>
      environment.DEVICES.some((device) => device.deviceName === deviceName),
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
  const [currentMeasures, setCurrentMeasures] =
    React.useState<CurrentMeasures | null>(null);
  const [measureHistory, setMeasureHistory] =
    React.useState<ChartHistory | null>(null);
  const [rangeKey, setRangeKey] = React.useState<ChartRangeKey>(
    CHART_RANGES.LAST_DAY,
  );
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
      const placeholderDeadline = Date.now() + 100;
      const measuredAfter = new Date(
        latestMeasuredAt - currentRange.hours * 60 * 60 * 1_000,
      );
      const history = await getChartHistory({
        measuredAfter,
        measuredBefore: new Date(latestMeasuredAt),
      });

      await waitUntil(placeholderDeadline);

      if (isMounted) {
        setMeasureHistory(getHistoryRows(history));
      }
    };

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [currentMeasures, currentRange, latestMeasuredAt]);

  const refreshMeasures = async () => {
    setIsRefreshing(true);
    const spinnerDeadline = Date.now() + 1_000;
    const latestRows = await loadLatestMeasures();
    const isUnchanged =
      latestRows.error === null &&
      environment.DEVICES.every(
        ({ deviceName }) =>
          latestRows.byDeviceName[deviceName]?.id ===
          currentMeasures?.byDeviceName[deviceName]?.id,
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
            Object.entries(measureHistory.history).map(
              ([deviceName, measures]) => [
                deviceName,
                filterMeasuresForRange({
                  measures,
                  range: currentRange,
                  end: chartEnd ?? Number.POSITIVE_INFINITY,
                }),
              ],
            ),
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
