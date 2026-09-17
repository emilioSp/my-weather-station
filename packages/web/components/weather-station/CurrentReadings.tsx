import type { Measure } from '@wx/shared';
import { WeatherCard } from '#components/weather-station/WeatherCard.tsx';
import { deviceIconMap, environment } from '#environment.ts';
import type { TemperatureUnit } from '#utils/temperature-unit.util.ts';

type CurrentReadingsProps = {
  measuresByDeviceName: Record<string, Measure | null>;
  temperatureUnit: TemperatureUnit;
};

export const CurrentReadings = ({
  measuresByDeviceName,
  temperatureUnit,
}: CurrentReadingsProps) => (
  <section
    className="grid gap-3.5 md:grid-cols-2"
    aria-label="Current readings"
  >
    {environment.DEVICES.map((device, index) => (
      <WeatherCard
        key={device.deviceName}
        deviceName={device.deviceName}
        label={device.deviceName}
        icon={deviceIconMap[device.icon]}
        colorIndex={index}
        measure={measuresByDeviceName[device.deviceName]}
        temperatureUnit={temperatureUnit}
      />
    ))}
  </section>
);
