// Map database keys between naming conventions at workspace data boundaries.
const toCamelCase = (key: string): string => {
  return key
    .replace(/_([a-z])/g, (_, character: string) => character.toUpperCase())
    .replace(/Dbm$/, 'DBM');
};

const toSnakeCase = (key: string): string => {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
};

type MapKeysInput = {
  value: unknown;
  mapKey: (key: string) => string;
};

const isObject = (value: unknown): value is object =>
  value !== null && typeof value === 'object';

const mapKeys = ({ value, mapKey }: MapKeysInput): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => mapKeys({ value: item, mapKey }));
  }

  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        mapKey(key),
        mapKeys({ value: entry, mapKey }),
      ]),
    );
  }

  return value;
};

export const toCamelCaseKeys = <T>(value: unknown): T => {
  // JUSTIFICATION: Callers supply the expected row type. This mapper changes keys only and does not validate that type.
  return mapKeys({ value, mapKey: toCamelCase }) as T;
};

export const toSnakeCaseKeys = (value: unknown): Record<string, unknown> => {
  // JUSTIFICATION: Database callers pass row objects. The existing record return type does not describe primitive passthrough.
  return mapKeys({ value, mapKey: toSnakeCase }) as Record<string, unknown>;
};
