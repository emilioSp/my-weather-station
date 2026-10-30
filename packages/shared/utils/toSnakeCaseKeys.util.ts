// Convert domain keys to stored column names before writing database rows.
import { mapKeys } from '#utils/mapKeys.util.ts';

const toSnakeCase = (key: string): string => {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
};

export const toSnakeCaseKeys = (value: unknown): Record<string, unknown> => {
  // JUSTIFICATION: Database callers pass row objects. The existing record return type does not describe primitive passthrough.
  return mapKeys({ value, mapKey: toSnakeCase }) as Record<string, unknown>;
};
