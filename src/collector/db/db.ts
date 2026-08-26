import knex from 'knex';
import pg from 'pg';
import { environment } from '../environment.ts';

// 1114 = timestamp, 1184 = timestamptz — return raw string instead of Date
pg.types.setTypeParser(1114, (v) => v);
pg.types.setTypeParser(1184, (v) => v);
// 1700 = numeric type as a number, not a string. e.g 30.5 instead of '30.5'
pg.types.setTypeParser(1700, Number);

const toCamel = (value: string): string => {
  return value
    .replace(/_([a-z])/g, (_, character: string) => character.toUpperCase())
    .replace(/Dbm$/, 'DBM');
};

const toSnake = (value: string): string => {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
};

const camelizeKeys = (obj: unknown): unknown => {
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        toCamel(k),
        camelizeKeys(v),
      ]),
    );
  }
  return obj;
};

const db = knex({
  client: 'postgresql',
  connection: {
    host: environment.POSTGRES_HOST,
    port: environment.POSTGRES_PORT,
    database: environment.POSTGRES_DB,
    user: environment.POSTGRES_USER,
    password: environment.POSTGRES_PASSWORD,
  },
  pool: {
    min: 2,
    max: 15,
  },
  postProcessResponse: (result) => camelizeKeys(result),
  wrapIdentifier: (value, originalImplementation) =>
    originalImplementation(toSnake(value)),
});

export const closeDatabaseConnection = async (): Promise<void> => {
  await db.destroy();
};

export default db;
