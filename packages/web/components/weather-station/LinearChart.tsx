// Render measurement charts and pointer readouts in the weather dashboard.
import type { Measure } from '@wx/shared';
import * as React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  type MouseHandlerDataParam,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import { type ChartRange } from '#utils/chart-ranges.ts';
import { formatChartTime } from '#utils/formatChartTime.util.ts';
import { formatMeasuredAt } from '#utils/formatMeasuredAt.util.ts';
import { formatMeasureValue } from '#utils/formatMeasureValue.util.ts';
import { formatTemperature } from '#utils/formatTemperature.util.ts';
import type { MeterTheme } from '#utils/getMeterTheme.util.ts';
import { getRangeExtrema, type RangeExtrema } from '#utils/getRangeExtrema.util.ts';
import { WEATHER_METRICS, chartMetricDetails, type WeatherMetric } from '#utils/weather-metrics.ts';

type Sensor = string;

type ChartDatum = Measure & {
  timestamp: number;
};

type GetYAxisDomainInput = {
  metric: WeatherMetric;
  extrema: { low: number; high: number };
};

const getYAxisDomain = ({ metric, extrema }: GetYAxisDomainInput): [number, number] => {
  if (metric === WEATHER_METRICS.HUMIDITY) {
    return [Math.floor(extrema.low / 5) * 5 - 5, Math.ceil(extrema.high / 5) * 5 + 5];
  }

  return [Math.floor(extrema.low - 1), Math.ceil(extrema.high + 1)];
};

type LinearChartProps = {
  meterTheme: MeterTheme;
  metric: WeatherMetric;
  range: ChartRange;
  sensor: Sensor;
  measures: Measure[];
};

export const LinearChart = ({ meterTheme, metric, range, sensor, measures }: LinearChartProps) => {
  const [touchTooltipActive, setTouchTooltipActive] = React.useState<boolean | null>(null);

  const [touchMeasure, setTouchMeasure] = React.useState<ChartDatum | null>(null);

  const chartData = React.useMemo<ChartDatum[]>(
    () =>
      measures.map((measure) => ({
        ...measure,
        timestamp: Date.parse(measure.measuredAt),
      })),
    [measures],
  );

  const extrema = React.useMemo(() => getRangeExtrema({ measures, metric }), [measures, metric]);

  if (extrema === null) {
    return (
      <ChartCard metric={metric} extrema={null}>
        <div className="grid h-[310px] place-items-center text-sm text-[#9bad9e]">
          No measurements in this range.
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard metric={metric} extrema={extrema}>
      <div
        className="mt-4 grid min-h-19 rounded-md border border-[#53675e] bg-[#10191b] px-3 py-2.5 text-xs sm:hidden"
        data-testid={`${sensor}-${metric}-touch-readout`}
      >
        {touchMeasure === null ? (
          <span className="self-center text-[#9bad9e]">Touch and drag.</span>
        ) : (
          <ChartReadout metric={metric} measure={touchMeasure} />
        )}
      </div>
      <div className="mt-4 h-[380px] sm:mt-[18px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            aria-label={`Interactive ${chartMetricDetails[metric].label.toLowerCase()} chart for ${sensor} measurements in ${range.label.toLowerCase()}.`}
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 50, left: 20 }}
            onTouchEnd={() => {
              setTouchMeasure(null);
              setTouchTooltipActive(false);
            }}
            onTouchMove={({ activeIndex }: MouseHandlerDataParam) => {
              if (activeIndex === null || activeIndex === undefined) {
                setTouchMeasure(null);

                return;
              }

              setTouchMeasure(chartData[Number(activeIndex)] ?? null);
            }}
            onTouchStart={() => {
              setTouchMeasure(null);
              setTouchTooltipActive(true);
            }}
          >
            <CartesianGrid stroke="#2b3a38" />
            <XAxis
              dataKey="timestamp"
              domain={['dataMin', 'dataMax']}
              height={50}
              minTickGap={32}
              scale="time"
              stroke="#82948a"
              tickFormatter={(timestamp: number) => formatChartTime(timestamp).join(' ')}
              tickLine={false}
              type="number"
            />
            <YAxis
              domain={getYAxisDomain({ metric, extrema })}
              stroke="#82948a"
              tickCount={5}
              tickFormatter={(value: number) => formatMeasureValue({ value, metric })}
              tickLine={false}
              width={70}
            />
            <Tooltip
              content={(tooltipProps) => (
                <div className={touchTooltipActive === true ? 'hidden sm:block' : ''}>
                  <ChartTooltip {...tooltipProps} metric={metric} sensor={sensor} />
                </div>
              )}
              active={touchTooltipActive ?? undefined}
              cursor={{ stroke: '#dce7df', strokeOpacity: 0.55 }}
              isAnimationActive={false}
            />
            <Line
              dataKey={metric}
              dot={false}
              isAnimationActive={false}
              name={sensor}
              stroke={meterTheme.chartColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

type ChartCardProps = {
  metric: WeatherMetric;
  extrema: RangeExtrema | null;
  children: React.ReactNode;
};

const ChartCard = ({ metric, extrema, children }: ChartCardProps) => {
  const details = chartMetricDetails[metric];

  return (
    <section className="rounded-2xl border border-[#2b3a38] bg-[#192524]/82 p-3 sm:p-[23px]">
      <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="font-mono text-[13px] tracking-[0.1em] text-[#9bad9e] uppercase">
            {details.label}
          </div>
        </div>
        <div className="grid grid-cols-[max-content_max-content] gap-4 sm:justify-end">
          <Extrema
            label="Low"
            metric={metric}
            value={extrema?.low ?? null}
            measuredAt={extrema?.lowMeasuredAt ?? null}
          />
          <Extrema
            label="High"
            metric={metric}
            value={extrema?.high ?? null}
            measuredAt={extrema?.highMeasuredAt ?? null}
          />
        </div>
      </div>
      {children}
    </section>
  );
};

type ExtremaProps = {
  label: string;
  metric: WeatherMetric;
  value: number | null;
  measuredAt: string | null;
};

const Extrema = ({ label, metric, value, measuredAt }: ExtremaProps) => (
  <div className="grid gap-[5px]">
    <div className="flex items-baseline gap-1 whitespace-nowrap">
      <span className="font-mono text-[11px] tracking-[0.1em] text-[#9bad9e] uppercase">
        {label}
      </span>
      <b className="text-[15px] tracking-[-0.05em]" data-testid={`${label.toLowerCase()}-value`}>
        {value === null ? '—' : formatMeasureValue({ value, metric })}
      </b>
    </div>
    {measuredAt !== null && (
      <time
        className="font-mono text-[13px] whitespace-nowrap text-[#9bad9e]"
        dateTime={measuredAt}
      >
        {formatChartTime(Date.parse(measuredAt)).join(' · ')}
      </time>
    )}
  </div>
);

const isNumericLabel = (label: unknown): label is number => typeof label === 'number';

type ChartTooltipProps = TooltipContentProps & {
  metric: WeatherMetric;
  sensor: Sensor;
};

const ChartTooltip = ({ active, label, metric, payload, sensor }: ChartTooltipProps) => {
  // JUSTIFICATION: Recharts returns an entry from this chart's ChartDatum data array in the tooltip payload.
  const measure = payload[0]?.payload as ChartDatum | undefined;

  if (!active || measure === undefined || !isNumericLabel(label)) {
    return null;
  }

  return (
    <div
      className="min-w-44 rounded-md border border-[#53675e] bg-[#10191b] px-3 py-2.5 text-xs shadow-[0_10px_28px_rgb(0_0_0_/_0.3)]"
      data-testid={`${sensor}-${metric}-chart-tooltip`}
    >
      <ChartReadout metric={metric} measure={measure} />
    </div>
  );
};

type ChartReadoutProps = {
  metric: WeatherMetric;
  measure: ChartDatum;
};

const ChartReadout = ({ metric, measure }: ChartReadoutProps) => (
  <>
    <div className="mb-2 font-mono text-xs text-[#9bad9e]">
      {formatMeasuredAt(measure.measuredAt)}
    </div>
    <TooltipRow
      label={chartMetricDetails[metric].label}
      value={formatMeasureValue({
        value: measure[metric],
        metric,
      })}
    />
    {metric === WEATHER_METRICS.TEMPERATURE && (
      <TooltipRow label="Heat index" value={formatTemperature(measure.heatIndex)} />
    )}
  </>
);

type TooltipRowProps = {
  label: string;
  value: string;
};

const TooltipRow = ({ label, value }: TooltipRowProps) => (
  <div className="flex justify-between gap-2 py-0.5 text-[13px] text-[#9bad9e]">
    <span>{label}</span>
    <span className="font-bold text-[#eaf0e9]">{value}</span>
  </div>
);
