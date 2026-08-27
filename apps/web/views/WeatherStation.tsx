import type { Measure } from '@wx/shared';
import * as React from 'react';
import {
  FaHouse,
  FaMagnifyingGlassMinus,
  FaMagnifyingGlassPlus,
  FaSeedling,
  FaTemperatureHalf,
} from 'react-icons/fa6';
import { LinearChart } from '#components/LinearChart.tsx';
import { WeatherCard } from '#components/WeatherCard.tsx';
import {
  getChartHistory,
  getLatestMeasure,
  type MeasureHistory,
  type MeasureHistoryQueryResult,
  type MeasureQueryResult,
} from '#supabase.api.ts';
import { IconButton } from '#ui/IconButton.tsx';
import {
  type ChartRange,
  chartRanges,
  filterMeasuresForRange,
  formatMeasuredAt,
  getLatestTimestamp,
  type WeatherMetric,
} from '#weather-dashboard.util.ts';

const chartMetrics: WeatherMetric[] = ['temperature', 'humidity', 'dewPoint'];

type CurrentMeasures = {
  indoor: Measure | null;
  outdoor: Measure | null;
  error: string | null;
};

type ChartHistory = MeasureHistory & {
  error: string | null;
};

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

const getHistoryRows = ({
  history,
  error,
}: MeasureHistoryQueryResult): ChartHistory => ({
  ...history,
  error: error?.message ?? null,
});

export const WeatherStation = () => {
  const [currentMeasures, setCurrentMeasures] =
    React.useState<CurrentMeasures | null>(null);
  const [measureHistory, setMeasureHistory] =
    React.useState<ChartHistory | null>(null);
  const [rangeIndex, setRangeIndex] = React.useState(4);
  const currentRange = chartRanges[rangeIndex] as ChartRange;
  const lastUpdate = getLatestTimestamp({
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
      const [indoorLatest, outdoorLatest] = await Promise.all([
        getLatestMeasure({ deviceType: 'indoor' }),
        getLatestMeasure({ deviceType: 'outdoor' }),
      ]);

      if (!isMounted) {
        return;
      }

      const latestRows = getLatestRows({
        indoorResult: indoorLatest,
        outdoorResult: outdoorLatest,
      });
      setCurrentMeasures(latestRows);
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

    if (lastUpdate === null) {
      setMeasureHistory({ indoor: [], outdoor: [], error: null });
      return;
    }

    let isMounted = true;
    setMeasureHistory(null);

    const loadHistory = async () => {
      const measuredAfter = new Date(
        lastUpdate - currentRange.hours * 60 * 60 * 1_000,
      );
      const history = await getChartHistory({
        measuredAfter,
        measuredBefore: new Date(lastUpdate),
      });

      if (isMounted) {
        setMeasureHistory(getHistoryRows(history));
      }
    };

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [currentMeasures, currentRange, lastUpdate]);

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
  if (currentMeasures === null) {
    return <LoadingScreen />;
  }

  if (currentMeasures.error !== null) {
    return <ErrorScreen message={currentMeasures.error} />;
  }

  return (
    <main className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,64px)] pt-[22px] pb-12">
      <header className="grid gap-5 border-b border-[#2b3a38] pb-[18px] sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex items-center gap-[13px]">
          <FaTemperatureHalf
            aria-hidden="true"
            className="h-8 w-7 text-[#b9e53b]"
          />
          <h1 className="text-[17px] font-bold tracking-[-0.035em]">
            Weather station
          </h1>
        </div>
        <div className="text-left sm:text-right">
          <div className="font-mono text-[13px] tracking-[0.1em] text-[#9bad9e] uppercase">
            Last update
          </div>
          <strong className="mt-1 block text-[13px]">
            {lastUpdate === null
              ? 'No readings yet'
              : formatMeasuredAt(new Date(lastUpdate).toISOString())}
          </strong>
        </div>
      </header>

      <div className="pt-4">
        <section
          className="grid gap-3.5 md:grid-cols-2"
          aria-label="Current readings"
        >
          <WeatherCard
            label="Indoor"
            icon={FaHouse}
            measure={currentMeasures.indoor}
          />
          <WeatherCard
            label="Outdoor"
            icon={FaSeedling}
            measure={currentMeasures.outdoor}
          />
        </section>

        <section className="mt-4 grid gap-4" aria-label="Measurement history">
          <RangeControls
            rangeIndex={rangeIndex}
            range={currentRange}
            onRangeIndexChange={setRangeIndex}
          />
          {measureHistory === null && <HistoryLoading />}
          {measureHistory !== null && measureHistory.error !== null && (
            <HistoryError message={measureHistory.error} />
          )}
          {measureHistory !== null &&
            measureHistory.error === null &&
            chartMetrics.map((metric) => (
              <div key={metric} className="grid gap-4">
                <LinearChart
                  metric={metric}
                  range={currentRange}
                  sensor="Indoor"
                  measures={indoorMeasures}
                />
                <LinearChart
                  metric={metric}
                  range={currentRange}
                  sensor="Outdoor"
                  measures={outdoorMeasures}
                />
              </div>
            ))}
        </section>
      </div>
    </main>
  );
};

type RangeControlsProps = {
  rangeIndex: number;
  range: ChartRange;
  onRangeIndexChange: (rangeIndex: number) => void;
};

const RangeControls = ({
  rangeIndex,
  range,
  onRangeIndexChange,
}: RangeControlsProps) => (
  <div className="flex min-h-10 items-center justify-start gap-3 sm:justify-end">
    <strong className="text-base">{range.label}</strong>
    <fieldset className="flex gap-1 rounded-[10px] border border-[#2b3a38] bg-[#15201f] p-1">
      <legend className="sr-only">Chart zoom</legend>
      <IconButton
        aria-label="Zoom out"
        title="Zoom out"
        disabled={rangeIndex === 0}
        onClick={() => onRangeIndexChange(rangeIndex - 1)}
      >
        <FaMagnifyingGlassMinus aria-hidden="true" className="size-5" />
      </IconButton>
      <IconButton
        aria-label="Zoom in"
        title="Zoom in"
        disabled={rangeIndex === chartRanges.length - 1}
        onClick={() => onRangeIndexChange(rangeIndex + 1)}
      >
        <FaMagnifyingGlassPlus aria-hidden="true" className="size-5" />
      </IconButton>
    </fieldset>
  </div>
);

const LoadingScreen = () => (
  <main className="grid min-h-screen place-items-center px-5 text-sm text-[#9bad9e]">
    Loading current readings...
  </main>
);

type ErrorScreenProps = {
  message: string;
};

const ErrorScreen = ({ message }: ErrorScreenProps) => (
  <main className="grid min-h-screen place-items-center px-5 text-center">
    <div>
      <h1 className="text-lg font-bold">Unable to load weather station</h1>
      <p className="mt-2 text-sm text-[#9bad9e]">{message}</p>
    </div>
  </main>
);

const HistoryLoading = () => (
  <div className="grid h-56 place-items-center rounded-2xl border border-[#2b3a38] bg-[#192524]/82 text-sm text-[#9bad9e]">
    Loading history...
  </div>
);

type HistoryErrorProps = {
  message: string;
};

const HistoryError = ({ message }: HistoryErrorProps) => (
  <div className="rounded-2xl border border-[#dd7e5c]/60 bg-[#192524]/82 p-5 text-sm text-[#9bad9e]">
    Unable to load chart history: {message}
  </div>
);
