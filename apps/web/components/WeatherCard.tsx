import type { Measure } from '@wx/shared';
import type { IconType } from 'react-icons';
import { HealthBar } from '#ui/HealthBar.tsx';
import { getSignalPercentage } from '#weather-dashboard.util.ts';

type WeatherCardProps = {
  label: 'Indoor' | 'Outdoor';
  icon: IconType;
  measure: Measure | null;
};

export const WeatherCard = ({
  label,
  icon: Icon,
  measure,
}: WeatherCardProps) => {
  const isIndoor = label === 'Indoor';
  const cardColor = isIndoor
    ? 'bg-linear-to-br from-[#203638] to-[#182525]'
    : 'bg-linear-to-br from-[#343223] to-[#1d2822]';

  if (measure === null) {
    return (
      <article
        className={`min-h-97 rounded-2xl border border-[#2b3a38] p-5 sm:p-[22px] ${cardColor}`}
      >
        <div className="flex items-center gap-2 text-sm font-bold">
          <Icon aria-hidden="true" className="text-lg" />
          {label}
        </div>
        <p className="mt-24 text-sm text-[#9bad9e]">No readings available.</p>
      </article>
    );
  }

  const signalPercentage = getSignalPercentage(measure.signalPowerDBM);

  return (
    <article
      className={`min-h-97 rounded-2xl border border-[#2b3a38] p-5 sm:p-[22px] ${cardColor}`}
    >
      <div className="flex items-center gap-2 text-sm font-bold">
        <Icon aria-hidden="true" className="text-lg" />
        {label}
      </div>
      <div className="mt-7 text-[clamp(58px,7vw,82px)] leading-[0.85] font-semibold tracking-[-0.09em]">
        {measure.temperature.toFixed(1)}
        <small className="ml-2 text-[22px] tracking-[-0.04em]">°C</small>
      </div>
      <div className="mt-[26px] grid grid-cols-2 gap-x-3 gap-y-5">
        <WeatherCardMetric label="Humidity" value={`${measure.humidity}%`} />
        <WeatherCardMetric
          label="Dew point"
          value={`${measure.dewPoint.toFixed(1)}°`}
        />
        <WeatherCardMetric
          label="Heat index"
          value={`${measure.heatIndex.toFixed(1)}°`}
        />
      </div>
      <div className="mt-5 border-t border-[#2b3a38] pt-4">
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
  <div className="border-t border-[#2b3a38] pt-3">
    <div className="font-mono text-[13px] tracking-[0.1em] text-[#9bad9e] uppercase">
      {label}
    </div>
    <b className="mt-1.5 block text-[23px] tracking-[-0.05em]">{value}</b>
  </div>
);

type HealthRowProps = {
  label: string;
  value: string;
  barValue: number;
};

const HealthRow = ({ label, value, barValue }: HealthRowProps) => (
  <div className="flex items-center justify-between border-b border-[#2b3a38]/65 py-2.5 last:border-0">
    <span className="text-[15px] font-semibold">{label}</span>
    <span className="font-mono text-sm text-[#9bad9e]">
      {value}
      <HealthBar value={barValue} />
    </span>
  </div>
);
