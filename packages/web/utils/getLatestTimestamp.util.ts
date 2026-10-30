// Find the most recent measurement timestamp when loading dashboard history.
import type { Measure } from '@wx/shared';

export const getLatestTimestamp = (measures: Measure[]): number | null => {
  const timestamps = measures.map((measure) => Date.parse(measure.measuredAt));

  return timestamps.length === 0 ? null : Math.max(...timestamps);
};
