import type { Measure } from '@wx/shared';
import { FaHouse, FaSeedling } from 'react-icons/fa6';
import { WeatherCard } from '#components/weather-station/WeatherCard.tsx';
import type { TemperatureUnit } from '#utils/temperature-unit.util.ts';

type CurrentReadingsProps = {
  indoor: Measure | null;
  outdoor: Measure | null;
  temperatureUnit: TemperatureUnit;
};

export const CurrentReadings = ({
  indoor,
  outdoor,
  temperatureUnit,
}: CurrentReadingsProps) => (
  <section
    className="grid gap-3.5 md:grid-cols-2"
    aria-label="Current readings"
  >
    <WeatherCard
      label="Outdoor"
      icon={FaSeedling}
      measure={outdoor}
      temperatureUnit={temperatureUnit}
    />
    <WeatherCard
      label="Indoor"
      icon={FaHouse}
      measure={indoor}
      temperatureUnit={temperatureUnit}
    />
  </section>
);
