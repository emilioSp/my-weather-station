// Render MeasurementHistory when displaying the weather dashboard.

import type { Measurement } from '@wx/shared';

import { HistoryChart } from '#components/weather-station/HistoryChart.tsx';
import { RangeControls } from '#components/weather-station/RangeControls.tsx';
import { deviceIconMap, environment } from '#environment.ts';
import type { ChartRange } from '#utils/chart-ranges.ts';
import { getMeterTheme } from '#utils/getMeterTheme.util.ts';

type MeasurementHistoryProps = {
  error: string | null;
  measurementsByDeviceName: Record<string, Measurement[]>;
  isLoading: boolean;
  isRefreshing: boolean;
  range: ChartRange;
  rangeIndex: number;
  onRangeIndexChange: (rangeIndex: number) => void;
};

export const MeasurementHistory = ({
  error,
  measurementsByDeviceName,
  isLoading,
  isRefreshing,
  range,
  rangeIndex,
  onRangeIndexChange,
}: MeasurementHistoryProps) => {
  const historyDevices = environment.DEVICES.map((device, index) => ({
    device,
    index,
  }))
    .filter(({ device }) => isLoading || Object.hasOwn(measurementsByDeviceName, device.deviceName))
    .map(({ device, index }) => ({
      device,
      icon: deviceIconMap[device.icon],
      meterTheme: getMeterTheme(index),
      measurements: measurementsByDeviceName[device.deviceName] ?? [],
    }));

  return (
    <section className="mt-4 grid gap-4" aria-label="Measurement history">
      <RangeControls
        isLoading={isLoading || isRefreshing}
        rangeIndex={rangeIndex}
        range={range}
        onRangeIndexChange={onRangeIndexChange}
      />
      {error !== null ? (
        <HistoryError message={error} />
      ) : (
        historyDevices.map(({ device, icon, meterTheme, measurements }) => (
          <HistoryChart
            key={device.deviceName}
            icon={icon}
            isLoading={isLoading}
            measurements={measurements}
            meterTheme={meterTheme}
            range={range}
            sensor={device.deviceName}
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
