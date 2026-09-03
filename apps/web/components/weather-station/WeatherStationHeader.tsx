import { FaArrowsRotate, FaTemperatureHalf } from 'react-icons/fa6';
import { IconButton } from '#components/primitives/IconButton.tsx';
import type { TemperatureUnit } from '#utils/temperature-unit.util.ts';
import { formatMeasuredAt } from '#weather-dashboard.util.ts';

type WeatherStationHeaderProps = {
  isRefreshing: boolean;
  latestMeasuredAt: number | null;
  onRefresh: () => Promise<void>;
  onTemperatureUnitChange: (unit: TemperatureUnit) => void;
  temperatureUnit: TemperatureUnit;
};

export const WeatherStationHeader = ({
  isRefreshing,
  latestMeasuredAt,
  onRefresh,
  onTemperatureUnitChange,
  temperatureUnit,
}: WeatherStationHeaderProps) => (
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
    <div className="grid grid-flow-col items-center justify-start gap-3 sm:justify-end">
      <div className="text-left sm:text-right">
        <div className="font-mono text-[13px] tracking-[0.1em] text-[#9bad9e] uppercase">
          Latest available measurement
        </div>
        <strong className="mt-1 block text-[13px]">
          {latestMeasuredAt === null
            ? 'No readings yet'
            : formatMeasuredAt(new Date(latestMeasuredAt).toISOString())}
        </strong>
      </div>
      <div
        aria-label="Temperature unit"
        className="flex gap-0.5 rounded-lg border border-[#2b3a38] bg-[#15201f] p-0.5"
        role="radiogroup"
      >
        {(['celsius', 'fahrenheit'] as const).map((unit) => (
          <label key={unit} className="cursor-pointer">
            <input
              checked={temperatureUnit === unit}
              className="peer sr-only"
              name="temperature-unit"
              onChange={() => onTemperatureUnitChange(unit)}
              type="radio"
              value={unit}
            />
            <span className="block rounded-[5px] px-[11px] py-2 font-mono text-[13px] font-medium text-[#9bad9e] peer-checked:bg-[#b9e53b] peer-checked:text-[#10191b] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#eaf0e9]">
              {unit === 'celsius' ? '°C' : '°F'}
            </span>
          </label>
        ))}
      </div>
      <IconButton
        aria-label="Refresh readings"
        title="Refresh readings"
        className="border border-[#2b3a38] bg-[#15201f]"
        disabled={isRefreshing}
        onClick={() => void onRefresh()}
      >
        <FaArrowsRotate
          aria-hidden="true"
          className={isRefreshing ? 'size-4 animate-spin' : 'size-4'}
        />
      </IconButton>
    </div>
  </header>
);
