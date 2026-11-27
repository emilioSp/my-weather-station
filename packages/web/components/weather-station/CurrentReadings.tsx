// Render CurrentReadings when displaying the weather dashboard.

import type { Measurement } from '@wx/shared';

import { WeatherCard } from '#components/weather-station/WeatherCard.tsx';
import { deviceIconMap, environment } from '#environment.ts';

type CurrentReadingsProps = {
  measurementsByDeviceName: Record<string, Measurement | null>;
};

export const CurrentReadings = ({ measurementsByDeviceName }: CurrentReadingsProps) => (
  <section className="grid gap-3.5 md:grid-cols-2" aria-label="Current readings">
    {environment.DEVICES.map((device, index) => (
      <WeatherCard
        key={device.deviceName}
        deviceName={device.deviceName}
        label={device.deviceName}
        icon={deviceIconMap[device.icon]}
        colorIndex={index}
        measurement={measurementsByDeviceName[device.deviceName]}
      />
    ))}
  </section>
);
