// Describe browser measurement query results used by the Supabase API and dashboard.
import type { Measure } from '@wx/shared';

export type MeasureQueryResult = {
  rows: Measure[];
  error: Error | null;
};

export type MeasureHistory = Record<string, Measure[]>;

export type MeasureHistoryQueryResult = {
  history: MeasureHistory;
  error: Error | null;
};
