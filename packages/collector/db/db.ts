// Own the PostgreSQL client and its lifetime during collector database operations.
import knex, { type Knex } from 'knex';
import pg from 'pg';

import { environment } from '#environment.ts';

// Converts NUMERIC from string to number, with possible precision loss.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);

// Keeps TIMESTAMP as a string instead of converting it to Date.
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, String);

// Keeps TIMESTAMPTZ as a string instead of converting it to Date.
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, String);

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
