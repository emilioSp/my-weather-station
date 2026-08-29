import type { Measure } from '@wx/shared';
import * as React from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import type { ChartRange, WeatherMetric } from '#weather-dashboard.util.ts';
import { LinearChart } from './LinearChart.tsx';

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
}: MeterAccordionProps) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const chartId = `${sensor.toLowerCase()}-charts`;

  return (
    <section className="rounded-2xl border border-[#2b3a38] bg-[#15201f]">
      <button
        aria-controls={chartId}
        aria-expanded={isOpen}
        className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-4 p-5 text-left text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#83d2e5] sm:p-[23px]"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {sensor}
        <FaChevronDown
          aria-hidden="true"
          className={`size-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        id={chartId}
      >
        <div className="overflow-hidden">
          <div className="grid gap-4 px-5 pb-5 sm:px-[23px] sm:pb-[23px]">
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
        </div>
      </div>
    </section>
  );
};
