// Format stored measurement timestamps for collector output.

import type { Measurement } from '@wx/shared';

export const formatMeasurement = (measurement: Measurement): Measurement => {
  const measured_at = Temporal.Instant.from(measurement.measured_at)
    .toZonedDateTimeISO('UTC')
    .toString({ smallestUnit: 'second' });

  return { ...measurement, measured_at };
};
