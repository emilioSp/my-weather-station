// Format stored measurement timestamps for collector output.

import type { Measure } from '@wx/shared';

export const formatMeasure = (measure: Measure): Measure => {
  const measured_at = Temporal.Instant.from(measure.measured_at)
    .toZonedDateTimeISO('UTC')
    .toString({ smallestUnit: 'second' });

  return { ...measure, measured_at };
};
