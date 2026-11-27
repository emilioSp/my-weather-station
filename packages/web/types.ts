// Describe browser measurement query results used by the weather API client and dashboard.
import type { Measurement } from '@wx/shared';

export type LatestMeasurementQueryResult = {
  measurement: Measurement | null;
  error: Error | null;
};

export type MeasurementHistory = Record<string, Measurement[]>;
