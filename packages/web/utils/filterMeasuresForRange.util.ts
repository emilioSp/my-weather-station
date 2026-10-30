// Filter stored measurements to the selected dashboard history range.
import type { Measure } from '@wx/shared';

import type { ChartRange } from '#utils/chart-ranges.ts';

type FilterMeasuresForRangeInput = {
  measures: Measure[];
  range: ChartRange;
  end: number;
};

export const filterMeasuresForRange = ({
  measures,
  range,
  end,
}: FilterMeasuresForRangeInput): Measure[] => {
  const start = end - range.hours * 60 * 60 * 1_000;

  return measures.filter(
    (measure) => Temporal.Instant.from(measure.measuredAt).epochMilliseconds >= start,
  );
};
