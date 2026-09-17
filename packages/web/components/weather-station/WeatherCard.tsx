import type { Measure } from '@wx/shared';
import type { IconType } from 'react-icons';
import { ProgressBar } from '#components/primitives/ProgressBar.tsx';
import {
  convertTemperature,
  formatTemperature,
  type TemperatureUnit,
} from '#utils/temperature-unit.util.ts';
import { getSignalPercentage } from '#weather-dashboard.util.ts';

export type MeterTheme = {
  themeClassName: string;
  chartColor: string;
};

const meterThemes: MeterTheme[] = [
  { themeClassName: 'meter-theme-garden', chartColor: '#b9e53b' },
  { themeClassName: 'meter-theme-kitchen', chartColor: '#83d2e5' },
  { themeClassName: 'meter-theme-living-room', chartColor: '#f0a46a' },
  { themeClassName: 'meter-theme-bedroom', chartColor: '#c9a7ef' },
];

export const getMeterTheme = (colorIndex: number): MeterTheme =>
  meterThemes[colorIndex] ?? meterThemes[0];

type WeatherCardProps = {
  deviceName: string;
  label: string;
  icon: IconType;
  colorIndex: number;
  measure: Measure | null;
  temperatureUnit: TemperatureUnit;
};

type WeatherCardHeadingProps = {
  deviceName: string;
  label: string;
  icon: IconType;
  meterTheme: MeterTheme;
};

const WeatherCardHeading = ({
  deviceName,
  label,
  icon: Icon,
  meterTheme,
}: WeatherCardHeadingProps) => (
  <div className="meter-heading flex items-center gap-2 text-sm font-bold capitalize">
    <span
      aria-hidden="true"
      className={`meter-indicator ${meterTheme.themeClassName}`}
      data-testid={`${deviceName}-indicator`}
    />
    <span>{label}</span>
    <Icon
      aria-hidden="true"
      className="text-base text-[#eaf0e9]"
      data-testid={`${deviceName}-icon`}
    />
  </div>
);

export const WeatherCard = ({
  deviceName,
  label,
  icon: Icon,
  colorIndex,
  measure,
  temperatureUnit,
}: WeatherCardProps) => {
  const meterTheme = getMeterTheme(colorIndex);
  const cardClassName = `meter-card ${meterTheme.themeClassName} rounded-2xl border p-5`;

  if (measure === null) {
    return (
      <article className={cardClassName}>
        <WeatherCardHeading
          deviceName={deviceName}
          icon={Icon}
          label={label}
          meterTheme={meterTheme}
        />
        <p className="mt-24 text-sm text-[#9bad9e]">No readings available.</p>
      </article>
    );
  }

  const signalPercentage = getSignalPercentage(measure.signalPowerDBM);

  return (
    <article className={cardClassName}>
      <WeatherCardHeading
        deviceName={deviceName}
        icon={Icon}
        label={label}
        meterTheme={meterTheme}
      />
      <div className="meter-temperature mt-7 leading-[0.85] font-semibold tracking-[-0.09em]">
        {convertTemperature({
          celsius: measure.temperature,
          unit: temperatureUnit,
        }).toFixed(1)}
        <small className="ml-2 text-[20px] tracking-[-0.04em]">
          °{temperatureUnit === 'celsius' ? 'C' : 'F'}
        </small>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-[18px]">
        <WeatherCardMetric label="Humidity" value={`${measure.humidity}%`} />
        <WeatherCardMetric
          label="Dew point"
          value={formatTemperature({
            celsius: measure.dewPoint,
            unit: temperatureUnit,
          })}
        />
        <WeatherCardMetric
          label="Heat index"
          value={formatTemperature({
            celsius: measure.heatIndex,
            unit: temperatureUnit,
          })}
        />
      </div>
      <div className="mt-[19px] border-t border-[#2b3a38] pt-[13px]">
        <div className="font-mono text-[13px] tracking-[0.1em] text-[#9bad9e] uppercase">
          Sensor health
        </div>
        <HealthRow
          label="Battery"
          value={`${measure.battery}%`}
          barValue={measure.battery}
        />
        <HealthRow
          label="Signal"
          value={`${measure.signalPowerDBM} dBm`}
          barValue={signalPercentage}
        />
      </div>
    </article>
  );
};

type WeatherCardMetricProps = {
  label: string;
  value: string;
};

const WeatherCardMetric = ({ label, value }: WeatherCardMetricProps) => (
  <div className="border-t border-[#2b3a38] pt-[10px]">
    <div className="font-mono text-[13px] tracking-[0.1em] text-[#9bad9e] uppercase">
      {label}
    </div>
    <b className="mt-[5px] block text-[20px] tracking-[-0.05em]">{value}</b>
  </div>
);

type HealthRowProps = {
  label: string;
  value: string;
  barValue: number;
};

const HealthRow = ({ label, value, barValue }: HealthRowProps) => (
  <div className="meter-health-row flex items-center justify-between border-b border-[#2b3a38]/65 py-2 text-sm font-bold last:border-0">
    <span>{label}</span>
    <span className="font-mono text-[13px] font-normal text-[#9bad9e]">
      {value}
      <ProgressBar value={barValue} />
    </span>
  </div>
);
