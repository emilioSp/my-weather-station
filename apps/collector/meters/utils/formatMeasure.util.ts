import type { Measure } from '@wx/shared';

export const formatMeasure = (measure: Measure): Measure => {
  const measuredAt = Temporal.Instant.from(measure.measuredAt)
    .toZonedDateTimeISO('UTC')
    .toString({ smallestUnit: 'second' });

  return { ...measure, measuredAt };
};
