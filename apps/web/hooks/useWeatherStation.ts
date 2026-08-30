import type { Measure } from '@wx/shared';
import * as React from 'react';
import {
  getChartHistory,
  getLatestMeasure,
  type MeasureHistory,
  type MeasureHistoryQueryResult,
  type MeasureQueryResult,
} from '#supabase.api.ts';
import {
  type ChartRange,
  chartRanges,
  filterMeasuresForRange,
  getLatestTimestamp,
} from '#weather-dashboard.util.ts';

type CurrentMeasures = {
  indoor: Measure | null;
  outdoor: Measure | null;
  error: string | null;
};

type ChartHistory = MeasureHistory & {
  error: string | null;
};

const waitUntil = (deadline: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, deadline - Date.now()));
  });

const getLatestRows = ({
  indoorResult,
  outdoorResult,
}: {
  indoorResult: MeasureQueryResult;
  outdoorResult: MeasureQueryResult;
}): CurrentMeasures => ({
  indoor: indoorResult.rows[0] ?? null,
  outdoor: outdoorResult.rows[0] ?? null,
  error: indoorResult.error?.message ?? outdoorResult.error?.message ?? null,
});

const loadLatestMeasures = async (): Promise<CurrentMeasures> => {
  const [indoorResult, outdoorResult] = await Promise.all([
    getLatestMeasure({ deviceType: 'indoor' }),
    getLatestMeasure({ deviceType: 'outdoor' }),
  ]);

  return getLatestRows({ indoorResult, outdoorResult });
};

const getHistoryRows = ({
  history,
  error,
}: MeasureHistoryQueryResult): ChartHistory => ({
  ...history,
  error: error?.message ?? null,
});

export const useWeatherStation = () => {
  const [currentMeasures, setCurrentMeasures] =
    React.useState<CurrentMeasures | null>(null);
  const [measureHistory, setMeasureHistory] =
    React.useState<ChartHistory | null>(null);
  const [rangeIndex, setRangeIndex] = React.useState(4);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const currentRange = chartRanges[rangeIndex] as ChartRange;
  const latestMeasuredAt = getLatestTimestamp({
    indoorMeasures:
      currentMeasures?.indoor === null || currentMeasures === null
        ? []
        : [currentMeasures.indoor],
    outdoorMeasures:
      currentMeasures?.outdoor === null || currentMeasures === null
        ? []
        : [currentMeasures.outdoor],
  });

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
      setMeasureHistory({ indoor: [], outdoor: [], error: null });
      return;
    }

    let isMounted = true;
    setMeasureHistory(null);

    const loadHistory = async () => {
      const placeholderDeadline = Date.now() + 1_000;
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
      latestRows.indoor?.id === currentMeasures?.indoor?.id &&
      latestRows.outdoor?.id === currentMeasures?.outdoor?.id;

    if (!isUnchanged) {
      setCurrentMeasures(latestRows);
    }

    await waitUntil(spinnerDeadline);
    setIsRefreshing(false);
  };

  const changeRange = (nextRangeIndex: number): void => {
    if (measureHistory === null) {
      return;
    }

    setMeasureHistory(null);
    setRangeIndex(nextRangeIndex);
  };

  const chartEnd =
    measureHistory === null
      ? null
      : getLatestTimestamp({
          indoorMeasures: measureHistory.indoor,
          outdoorMeasures: measureHistory.outdoor,
        });
  const indoorMeasures = React.useMemo(
    () =>
      measureHistory === null || chartEnd === null
        ? []
        : filterMeasuresForRange({
            measures: measureHistory.indoor,
            range: currentRange,
            end: chartEnd,
          }),
    [measureHistory, currentRange, chartEnd],
  );
  const outdoorMeasures = React.useMemo(
    () =>
      measureHistory === null || chartEnd === null
        ? []
        : filterMeasuresForRange({
            measures: measureHistory.outdoor,
            range: currentRange,
            end: chartEnd,
          }),
    [measureHistory, currentRange, chartEnd],
  );

  return {
    currentMeasures,
    currentRange,
    indoorMeasures,
    isRefreshing,
    latestMeasuredAt,
    measureHistory,
    outdoorMeasures,
    rangeIndex,
    refreshMeasures,
    changeRange,
  };
};
