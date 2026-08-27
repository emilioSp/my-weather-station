import knex from 'knex';
import pg from 'pg';
import { environment } from '#environment.ts';

// 1114 = timestamp, 1184 = timestamptz — return raw string instead of Date
pg.types.setTypeParser(1114, (v) => v);
pg.types.setTypeParser(1184, (v) => v);
// 1700 = numeric type as a number, not a string. e.g 30.5 instead of '30.5'
pg.types.setTypeParser(1700, Number);

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
});

export const closeDatabaseConnection = async (): Promise<void> => {
  await db.destroy();
};

export default db;
