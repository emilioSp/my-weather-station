// Load current readings and chart history and manage weather dashboard actions.

import type { Measurement } from '@wx/shared';
import * as React from 'react';

import { getChartHistory } from '#api/getChartHistory.ts';
import { getLatestMeasurements } from '#api/getLatestMeasurements.ts';
import { toWeatherApiError } from '#api/utils/toWeatherApiError.util.ts';
import { environment } from '#environment.ts';
import type { LatestMeasurements, MeasurementHistory } from '#types.ts';
import {
  CHART_RANGES,
  type ChartRange,
  type ChartRangeKey,
  chartRangeKeys,
  chartRanges,
} from '#utils/chart-ranges.ts';
import { getLatestTimestamp } from '#utils/getLatestTimestamp.util.ts';

const deviceNames = environment.DEVICES.map(({ deviceName }) => deviceName);

// Browser timers have no native promise API; keep the callback at this boundary.
const waitUntil = (deadline: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, deadline - Date.now()));
  });

const getLatestMeasuredAt = (measurements: LatestMeasurements | null): number | null =>
  measurements === null
    ? null
    : getLatestTimestamp(
        Object.values(measurements).filter(
          (measurement): measurement is Measurement => measurement !== null,
        ),
      );

export const useWeatherStation = () => {
  const [latestMeasurementsResult, setLatestMeasurementsResult] = React.useState<
    LatestMeasurements | Error | null
  >(null);

  const [measurementHistory, setMeasurementHistory] = React.useState<
    MeasurementHistory | Error | null
  >(null);

  const [rangeKey, setRangeKey] = React.useState<ChartRangeKey>(CHART_RANGES.LAST_THREE_DAYS);

  const [isRefreshing, setIsRefreshing] = React.useState(true);
  const busy = React.useRef(false);
  const currentRange: ChartRange = chartRanges[rangeKey];
  const rangeIndex = chartRangeKeys.indexOf(rangeKey);

  const currentMeasurements =
    latestMeasurementsResult instanceof Error ? null : latestMeasurementsResult;

  const latestMeasuredAt = getLatestMeasuredAt(currentMeasurements);

  type LoadHistoryInput = {
    latestTimestamp: number | null;
    range: ChartRange;
  };

  const loadHistory = async ({ latestTimestamp, range }: LoadHistoryInput) => {
    if (latestTimestamp === null) {
      setMeasurementHistory({});

      return;
    }

    setMeasurementHistory(null);
    const placeholderDeadline = Date.now() + 100;

    try {
      const history = await getChartHistory({
        measuredAfter: new Date(latestTimestamp - range.hours * 60 * 60 * 1_000),
        measuredBefore: new Date(latestTimestamp),
      });

      await waitUntil(placeholderDeadline);
      setMeasurementHistory(history);
    } catch (cause) {
      await waitUntil(placeholderDeadline);
      setMeasurementHistory(toWeatherApiError(cause));
    }
  };

  const refreshMeasurements = async () => {
    if (busy.current) {
      return;
    }

    busy.current = true;
    setIsRefreshing(true);
    const spinnerDeadline = Date.now() + (latestMeasurementsResult === null ? 0 : 1_000);

    try {
      const latestRows = await getLatestMeasurements(deviceNames);
      const latestTimestamp = getLatestMeasuredAt(latestRows);

      if (currentMeasurements === null || latestTimestamp !== latestMeasuredAt) {
        setLatestMeasurementsResult(latestRows);
        await loadHistory({ latestTimestamp, range: currentRange });
      }
    } catch (cause) {
      setLatestMeasurementsResult(toWeatherApiError(cause));
      setMeasurementHistory(null);
    }

    await waitUntil(spinnerDeadline);
    busy.current = false;
    setIsRefreshing(false);
  };

  // If the user switches to Last 6 hours 30 seconds into the timer,
  // the refresh still runs at 60 seconds and uses the new range.
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
    await loadHistory({ latestTimestamp: latestMeasuredAt, range: chartRanges[nextRangeKey] });
    busy.current = false;
    setIsRefreshing(false);
  };

  return {
    currentMeasurements,
    currentRange,
    isRefreshing,
    latestMeasuredAt,
    latestError:
      latestMeasurementsResult instanceof Error ? latestMeasurementsResult.message : null,
    historyError: measurementHistory instanceof Error ? measurementHistory.message : null,
    isHistoryLoading: measurementHistory === null,
    measurementsByDeviceName: measurementHistory instanceof Error ? {} : (measurementHistory ?? {}),
    rangeIndex,
    refreshMeasurements,
    changeRange,
  };
};
