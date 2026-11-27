// Find the most recent measurement timestamp when loading dashboard history.
import type { Measurement } from '@wx/shared';

export const getLatestTimestamp = (measurements: Measurement[]): number | null => {
  const timestamps = measurements.map((measurement) => Date.parse(measurement.measured_at));

  return timestamps.length === 0 ? null : Math.max(...timestamps);
};
