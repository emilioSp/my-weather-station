// Normalize chart history responses at the browser database boundary.
import { toCamelCaseKeys } from '@wx/shared/utils/toCamelCaseKeys.util.ts';

import type { MeasureHistory } from '#types.ts';

export const toMeasureHistory = (data: unknown): MeasureHistory =>
  toCamelCaseKeys<MeasureHistory>(data ?? {});
