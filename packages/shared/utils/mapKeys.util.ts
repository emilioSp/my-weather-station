// Recursively map object keys at shared database serialization boundaries.
// Deliberate limit: map JSON-like row values, without preserving class prototypes.

const isObject = (value: unknown): value is object => value !== null && typeof value === 'object';

type MapKeysInput = {
  value: unknown;
  mapKey: (key: string) => string;
};

export const mapKeys = ({ value, mapKey }: MapKeysInput): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => mapKeys({ value: item, mapKey }));
  }

  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [mapKey(key), mapKeys({ value: entry, mapKey })]),
    );
  }

  return value;
};
