// Convert stored database column names to domain keys at database boundaries.
import { mapKeys } from '#utils/mapKeys.util.ts';

const toCamelCase = (key: string): string => {
  return key
    .replace(/_([a-z])/g, (_, character: string) => character.toUpperCase())
    .replace(/Dbm$/, 'DBM');
};

export const toCamelCaseKeys = <T>(value: unknown): T => {
  // JUSTIFICATION: Callers supply the expected row type. This mapper changes keys only and does not validate that type.
  return mapKeys({ value, mapKey: toCamelCase }) as T;
};
