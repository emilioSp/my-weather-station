import type { Measure } from '@wx/shared';
import { MeterAccordion } from '#components/weather-station/MeterAccordion.tsx';
import { RangeControls } from '#components/weather-station/RangeControls.tsx';
import type { ChartRange } from '#weather-dashboard.util.ts';

type MeasurementHistoryProps = {
  error: string | null;
  indoorMeasures: Measure[];
  isLoading: boolean;
  outdoorMeasures: Measure[];
  range: ChartRange;
  rangeIndex: number;
  onRangeIndexChange: (rangeIndex: number) => void;
};

export const MeasurementHistory = ({
  error,
  indoorMeasures,
  isLoading,
  outdoorMeasures,
  range,
  rangeIndex,
  onRangeIndexChange,
}: MeasurementHistoryProps) => (
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
      <>
        <MeterAccordion
          defaultOpen
          isLoading={isLoading}
          measures={outdoorMeasures}
          range={range}
          sensor="Outdoor"
        />
        <MeterAccordion
          isLoading={isLoading}
          measures={indoorMeasures}
          range={range}
          sensor="Indoor"
        />
      </>
    )}
  </section>
);

type HistoryErrorProps = {
  message: string;
};

const HistoryError = ({ message }: HistoryErrorProps) => (
  <div className="rounded-2xl border border-[#dd7e5c]/60 bg-[#192524]/82 p-5 text-sm text-[#9bad9e]">
    Unable to load chart history: {message}
  </div>
);
