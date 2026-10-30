// Own the PostgreSQL client and its lifetime during collector database operations.
import knex, { type Knex } from 'knex';
import pg from 'pg';

import { environment } from '#environment.ts';

// Keep PostgreSQL timestamp (1114) and timestamptz (1184) values as strings at the database boundary.
pg.types.setTypeParser(1114, (value) => value);

pg.types.setTypeParser(1184, (value) => value);

// PostgreSQL numeric (1700) readings must be numbers rather than driver-returned strings.
pg.types.setTypeParser(1700, Number);

export class Database {
  private readonly client = knex({
    client: 'postgresql',
    connection: {
      host: environment.POSTGRES_HOST,
      port: environment.POSTGRES_PORT,
      database: environment.POSTGRES_DB,
      user: environment.POSTGRES_USER,
      password: environment.POSTGRES_PASSWORD,
      connectionTimeoutMillis: environment.POSTGRES_TIMEOUT_MS,
      query_timeout: environment.POSTGRES_TIMEOUT_MS,
    },
    acquireConnectionTimeout: environment.POSTGRES_TIMEOUT_MS,
    pool: { min: 2, max: 15 },
  });

  public getClient(): Knex {
    return this.client;
  }

  public async close(): Promise<void> {
    await this.client.destroy();
  }
}

export default new Database();
