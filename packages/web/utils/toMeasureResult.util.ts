// Normalize measurement query responses at the browser database boundary.
import type { Measure } from '@wx/shared';
import { toCamelCaseKeys } from '@wx/shared/utils/toCamelCaseKeys.util.ts';

import type { MeasureQueryResult } from '#types.ts';

type ToMeasureResultInput = {
  data: unknown;
  error: Error | null;
};

export const toMeasureResult = ({ data, error }: ToMeasureResultInput): MeasureQueryResult => ({
  rows: toCamelCaseKeys<Measure[]>(data ?? []),
  error,
});
