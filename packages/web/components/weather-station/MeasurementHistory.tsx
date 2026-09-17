import type { Measure } from '@wx/shared';
import { MeterAccordion } from '#components/weather-station/MeterAccordion.tsx';
import { RangeControls } from '#components/weather-station/RangeControls.tsx';
import { environment } from '#environment.ts';
import type { TemperatureUnit } from '#utils/temperature-unit.util.ts';
import type { ChartRange } from '#weather-dashboard.util.ts';

type MeasurementHistoryProps = {
  error: string | null;
  measuresByDeviceName: Record<string, Measure[]>;
  isLoading: boolean;
  range: ChartRange;
  rangeIndex: number;
  temperatureUnit: TemperatureUnit;
  onRangeIndexChange: (rangeIndex: number) => void;
};

export const MeasurementHistory = ({
  error,
  measuresByDeviceName,
  isLoading,
  range,
  rangeIndex,
  temperatureUnit,
  onRangeIndexChange,
}: MeasurementHistoryProps) => {
  const historyDevices = environment.DEVICES.map((device, index) => ({
    device,
    index,
  }))
    .filter(
      ({ device }) =>
        isLoading || Object.hasOwn(measuresByDeviceName, device.deviceName),
    )
    .map(({ device, index }) => ({
      device,
      index,
      measures: measuresByDeviceName[device.deviceName] ?? [],
    }));

  return (
    <section className="mt-4 grid gap-4" aria-label="Measurement history">
      <RangeControls
        isLoading={isLoading}
        rangeIndex={rangeIndex}
        range={range}
        onRangeIndexChange={onRangeIndexChange}
      />
      {error !== null ? (
        <HistoryError message={error} />
      ) : (
        historyDevices.map(({ device, index, measures }, historyIndex) => (
          <MeterAccordion
            key={device.deviceName}
            defaultOpen={historyIndex === 0}
            colorIndex={index}
            isLoading={isLoading}
            measures={measures}
            range={range}
            sensor={device.deviceName}
            temperatureUnit={temperatureUnit}
          />
        ))
      )}
    </section>
  );
};

type HistoryErrorProps = {
  message: string;
};

const HistoryError = ({ message }: HistoryErrorProps) => (
  <div className="rounded-2xl border border-[#dd7e5c]/60 bg-[#192524]/82 p-5 text-sm text-[#9bad9e]">
    Unable to load chart history: {message}
  </div>
);
