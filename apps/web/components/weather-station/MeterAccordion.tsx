import type { Measure } from '@wx/shared';
import { Accordion } from '#components/primitives/Accordion.tsx';
import { LinearChart } from '#components/weather-station/LinearChart.tsx';
import type { ChartRange, WeatherMetric } from '#weather-dashboard.util.ts';

const chartMetrics: WeatherMetric[] = ['temperature', 'humidity', 'dewPoint'];

type MeterAccordionProps = {
  defaultOpen?: boolean;
  measures: Measure[];
  range: ChartRange;
  sensor: 'Indoor' | 'Outdoor';
};

export const MeterAccordion = ({
  defaultOpen = false,
  measures,
  range,
  sensor,
}: MeterAccordionProps) => (
  <Accordion defaultOpen={defaultOpen} title={sensor}>
    <div className="grid gap-4 px-3 pb-3 sm:px-[23px] sm:pb-[23px]">
      {chartMetrics.map((metric) => (
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
