import type { Measure } from '@wx/shared';
import { FaHouse, FaSeedling } from 'react-icons/fa6';
import { WeatherCard } from '#components/weather-station/WeatherCard.tsx';

type CurrentReadingsProps = {
  indoor: Measure | null;
  outdoor: Measure | null;
};

export const CurrentReadings = ({ indoor, outdoor }: CurrentReadingsProps) => (
  <section
    className="grid gap-3.5 md:grid-cols-2"
    aria-label="Current readings"
  >
    <WeatherCard label="Outdoor" icon={FaSeedling} measure={outdoor} />
    <WeatherCard label="Indoor" icon={FaHouse} measure={indoor} />
  </section>
);
