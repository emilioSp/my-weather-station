// Render HistoryChart when displaying the weather dashboard.

import type { Measure } from '@wx/shared';
import type { IconType } from 'react-icons';
import { FaArrowUp } from 'react-icons/fa6';

import { LinearChart } from '#components/weather-station/LinearChart.tsx';
import type { ChartRange } from '#utils/chart-ranges.ts';
import { getHistorySectionId } from '#utils/getHistorySectionId.util.ts';
import type { MeterTheme } from '#utils/getMeterTheme.util.ts';
import { WEATHER_METRICS, type WeatherMetric } from '#utils/weather-metrics.ts';

const chartMetrics: WeatherMetric[] = [
  WEATHER_METRICS.TEMPERATURE,
  WEATHER_METRICS.HUMIDITY,
  WEATHER_METRICS.DEW_POINT,
];

type HistoryChartProps = {
  icon: IconType;
  isLoading: boolean;
  measures: Measure[];
  meterTheme: MeterTheme;
  range: ChartRange;
  sensor: string;
};

const scrollToTop = () => {
  window.scrollTo({ behavior: 'smooth', top: 0 });
};

export const HistoryChart = ({
  icon: Icon,
  isLoading,
  measures,
  meterTheme,
  range,
  sensor,
}: HistoryChartProps) => (
  <section
    className="rounded-2xl border border-[#2b3a38] bg-[#15201f]"
    id={getHistorySectionId(sensor)}
  >
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 p-5 sm:p-[23px]">
      <span className="meter-history-heading flex items-center gap-2 capitalize text-sm">
        <span
          aria-hidden="true"
          className={`meter-indicator ${meterTheme.themeClassName}`}
          data-testid={`${sensor}-history-indicator`}
        />
        <span>{sensor}</span>
        <Icon
          aria-hidden="true"
          className="text-base text-[#eaf0e9]"
          data-testid={`${sensor}-history-icon`}
        />
      </span>
      <button
        aria-label={`Scroll back to top for ${sensor}`}
        className="cursor-pointer text-[#9bad9e]"
        onClick={scrollToTop}
        type="button"
      >
        <FaArrowUp aria-hidden="true" className="size-4" />
      </button>
    </div>
    <div className="grid gap-4 px-3 pb-3 sm:px-[23px] sm:pb-[23px]">
      {isLoading
        ? chartMetrics.map((metric) => <ChartLoadingPlaceholder key={`${sensor}-${metric}`} />)
        : chartMetrics.map((metric) => (
            <LinearChart
              key={`${sensor}-${metric}`}
              meterTheme={meterTheme}
              metric={metric}
              range={range}
              sensor={sensor}
              measures={measures}
            />
          ))}
    </div>
  </section>
);

const ChartLoadingPlaceholder = () => (
  <section
    aria-busy="true"
    aria-label="Loading chart"
    className="rounded-2xl border border-[#2b3a38] bg-[#192524]/82 p-3 sm:p-[23px]"
  >
    <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
      <div className="grid gap-2">
        <div className="h-3 w-24 animate-pulse rounded bg-[#30403a]" />
        <div className="h-3 w-16 animate-pulse rounded bg-[#30403a]" />
      </div>
      <div className="grid grid-flow-col gap-3 sm:justify-end">
        <div className="h-4 w-16 animate-pulse rounded bg-[#30403a]" />
        <div className="h-4 w-16 animate-pulse rounded bg-[#30403a]" />
      </div>
    </div>
    <div className="mt-4 grid min-h-19 animate-pulse rounded-md bg-[#10191b] sm:hidden" />
    <div className="mt-4 h-[380px] animate-pulse rounded-md bg-[#10191b] sm:mt-[18px]" />
  </section>
);
