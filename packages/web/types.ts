// Describe browser measurement query results used by the weather API client and dashboard.
import type { Measurement } from '@wx/shared';

export type LatestMeasurements = Record<string, Measurement | null>;

export type MeasurementHistory = Record<string, Measurement[]>;
