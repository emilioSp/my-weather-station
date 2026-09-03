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
import {
  formatTemperature,
  type TemperatureUnit,
} from '#utils/temperature-unit.util.ts';
import {
  type ChartRange,
  chartMetricDetails,
  downsampleMeasures,
  formatChartTime,
  formatMeasuredAt,
  formatMeasureValue,
  getRangeExtrema,
  type WeatherMetric,
} from '#weather-dashboard.util.ts';

type Sensor = 'Indoor' | 'Outdoor';

type ChartDatum = Measure & {
  timestamp: number;
};

type LinearChartProps = {
  metric: WeatherMetric;
  range: ChartRange;
  sensor: Sensor;
  measures: Measure[];
  temperatureUnit: TemperatureUnit;
};

const chartColors: Record<Sensor, string> = {
  Indoor: '#83d2e5',
  Outdoor: '#b9e53b',
};

const getYAxisDomain = ({
  metric,
  extrema,
}: {
  metric: WeatherMetric;
  extrema: { low: number; high: number };
}): [number, number] => {
  const valuePadding = metric === 'humidity' ? 5 : 1;

  return metric === 'humidity'
    ? [
        Math.floor(extrema.low / 5) * 5 - valuePadding,
        Math.ceil(extrema.high / 5) * 5 + valuePadding,
      ]
    : [
        Math.floor(extrema.low - valuePadding),
        Math.ceil(extrema.high + valuePadding),
      ];
};

export const LinearChart = ({
  metric,
  range,
  sensor,
  measures,
  temperatureUnit,
}: LinearChartProps) => {
  const [touchTooltipActive, setTouchTooltipActive] = React.useState<
    boolean | null
  >(null);
  const [touchMeasure, setTouchMeasure] = React.useState<ChartDatum | null>(
    null,
  );
  const chartMeasures = React.useMemo(
    () => downsampleMeasures({ measures, metric }),
    [measures, metric],
  );
  const chartData = React.useMemo<ChartDatum[]>(
    () =>
      chartMeasures.map((measure) => ({
        ...measure,
        timestamp: new Date(measure.measuredAt).getTime(),
      })),
    [chartMeasures],
  );
  const extrema = React.useMemo(
    () => getRangeExtrema({ measures, metric }),
    [measures, metric],
  );
  const details = chartMetricDetails[metric];

  if (extrema === null) {
    return (
      <ChartCard
        metric={metric}
        sensor={sensor}
        extrema={null}
        temperatureUnit={temperatureUnit}
      >
        <div className="grid h-[310px] place-items-center text-sm text-[#9bad9e]">
          No measurements in this range.
        </div>
      </ChartCard>
    );
  }

  const yAxisDomain = getYAxisDomain({ metric, extrema });

  return (
    <ChartCard
      metric={metric}
      sensor={sensor}
      extrema={extrema}
      temperatureUnit={temperatureUnit}
    >
      <div className="mt-4 grid min-h-19 rounded-md border border-[#53675e] bg-[#10191b] px-3 py-2.5 text-xs sm:hidden">
        {touchMeasure === null ? (
          <span className="self-center text-[#9bad9e]">Touch and drag.</span>
        ) : (
          <ChartReadout
            metric={metric}
            measure={touchMeasure}
            temperatureUnit={temperatureUnit}
          />
        )}
      </div>
      <div className="mt-4 h-[380px] sm:mt-[18px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            aria-label={`Interactive ${details.label.toLowerCase()} chart for ${sensor.toLowerCase()} measurements in ${range.label.toLowerCase()}.`}
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
              tickFormatter={(timestamp: number) =>
                formatChartTime(timestamp).join(' ')
              }
              tickLine={false}
              type="number"
            />
            <YAxis
              domain={yAxisDomain}
              stroke="#82948a"
              tickCount={5}
              tickFormatter={(value: number) =>
                formatMeasureValue({ value, metric, temperatureUnit })
              }
              tickLine={false}
              width={70}
            />
            <Tooltip
              content={(tooltipProps) => (
                <div
                  className={
                    touchTooltipActive === true ? 'hidden sm:block' : ''
                  }
                >
                  <ChartTooltip
                    {...tooltipProps}
                    metric={metric}
                    temperatureUnit={temperatureUnit}
                  />
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
              stroke={chartColors[sensor]}
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
  sensor: Sensor;
  extrema: { low: number; high: number } | null;
  children: React.ReactNode;
  temperatureUnit: TemperatureUnit;
};

const ChartCard = ({
  metric,
  sensor,
  extrema,
  children,
  temperatureUnit,
}: ChartCardProps) => {
  const details = chartMetricDetails[metric];

  return (
    <section className="rounded-2xl border border-[#2b3a38] bg-[#192524]/82 p-3 sm:p-[23px]">
      <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="font-mono text-[13px] tracking-[0.1em] text-[#9bad9e] uppercase">
            {details.label}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-bold">
            <i
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full"
              style={{ backgroundColor: chartColors[sensor] }}
            />
            {sensor}
          </div>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 sm:justify-end">
          <Extrema
            label="Low"
            metric={metric}
            value={extrema?.low ?? null}
            temperatureUnit={temperatureUnit}
          />
          <Extrema
            label="High"
            metric={metric}
            value={extrema?.high ?? null}
            temperatureUnit={temperatureUnit}
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
  temperatureUnit: TemperatureUnit;
};

const Extrema = ({ label, metric, value, temperatureUnit }: ExtremaProps) => (
  <div className="flex items-baseline gap-1 whitespace-nowrap">
    <span className="font-mono text-[11px] tracking-[0.1em] text-[#9bad9e] uppercase">
      {label}
    </span>
    <b className="text-[15px] tracking-[-0.05em]">
      {value === null
        ? '—'
        : formatMeasureValue({ value, metric, temperatureUnit })}
    </b>
  </div>
);

type ChartTooltipProps = TooltipContentProps & {
  metric: WeatherMetric;
  temperatureUnit: TemperatureUnit;
};

const ChartTooltip = ({
  active,
  label,
  metric,
  payload,
  temperatureUnit,
}: ChartTooltipProps) => {
  const measure = payload[0]?.payload as ChartDatum | undefined;

  if (!active || measure === undefined || typeof label !== 'number') {
    return null;
  }

  return (
    <div className="min-w-44 rounded-md border border-[#53675e] bg-[#10191b] px-3 py-2.5 text-xs shadow-[0_10px_28px_rgb(0_0_0_/_0.3)]">
      <ChartReadout
        metric={metric}
        measure={measure}
        temperatureUnit={temperatureUnit}
      />
    </div>
  );
};

type ChartReadoutProps = {
  metric: WeatherMetric;
  measure: ChartDatum;
  temperatureUnit: TemperatureUnit;
};

const ChartReadout = ({
  metric,
  measure,
  temperatureUnit,
}: ChartReadoutProps) => (
  <>
    <div className="mb-2 font-mono text-xs text-[#9bad9e]">
      {formatMeasuredAt(new Date(measure.timestamp).toISOString())}
    </div>
    <TooltipRow
      label={chartMetricDetails[metric].label}
      value={formatMeasureValue({
        value: measure[metric],
        metric,
        temperatureUnit,
      })}
    />
    {metric === 'temperature' && (
      <TooltipRow
        label="Heat index"
        value={formatTemperature({
          celsius: measure.heatIndex,
          unit: temperatureUnit,
        })}
      />
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
