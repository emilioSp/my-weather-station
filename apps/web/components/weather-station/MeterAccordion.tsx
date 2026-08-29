import type { Measure } from '@wx/shared';
import { Accordion } from '#components/primitives/Accordion.tsx';
import { LinearChart } from '#components/weather-station/LinearChart.tsx';
import type { ChartRange, WeatherMetric } from '#weather-dashboard.util.ts';

const chartMetrics: WeatherMetric[] = ['temperature', 'humidity', 'dewPoint'];

type MeterAccordionProps = {
  defaultOpen?: boolean;
  isLoading: boolean;
  measures: Measure[];
  range: ChartRange;
  sensor: 'Indoor' | 'Outdoor';
};

export const MeterAccordion = ({
  defaultOpen = false,
  isLoading,
  measures,
  range,
  sensor,
}: MeterAccordionProps) => (
  <Accordion defaultOpen={defaultOpen} title={sensor}>
    <div className="grid gap-4 px-3 pb-3 sm:px-[23px] sm:pb-[23px]">
      {isLoading
        ? chartMetrics.map((metric) => (
            <ChartLoadingPlaceholder key={`${sensor}-${metric}`} />
          ))
        : chartMetrics.map((metric) => (
            <LinearChart
              key={`${sensor}-${metric}`}
              metric={metric}
              range={range}
              sensor={sensor}
              measures={measures}
            />
          ))}
    </div>
  </Accordion>
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
