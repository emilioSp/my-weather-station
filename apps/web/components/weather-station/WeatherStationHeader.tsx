import { FaArrowsRotate, FaTemperatureHalf } from 'react-icons/fa6';
import { IconButton } from '#components/primitives/IconButton.tsx';
import { formatMeasuredAt } from '#weather-dashboard.util.ts';

type WeatherStationHeaderProps = {
  isRefreshing: boolean;
  latestMeasuredAt: number | null;
  onRefresh: () => Promise<void>;
};

export const WeatherStationHeader = ({
  isRefreshing,
  latestMeasuredAt,
  onRefresh,
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
