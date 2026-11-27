// Filter stored measurements to the selected dashboard history range.
import type { Measurement } from '@wx/shared';

import type { ChartRange } from '#utils/chart-ranges.ts';

type FilterMeasurementsForRangeInput = {
  measurements: Measurement[];
  range: ChartRange;
  end: number;
};

export const filterMeasurementsForRange = ({
  measurements,
  range,
  end,
}: FilterMeasurementsForRangeInput): Measurement[] => {
  const start = end - range.hours * 60 * 60 * 1_000;

  return measurements.filter((measurement) => Date.parse(measurement.measured_at) >= start);
};
