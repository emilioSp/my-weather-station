// Own one PostgreSQL pool per Node.js process and close it on shutdown.
import process from 'node:process';

import knex, { type Knex } from 'knex';
import pg from 'pg';

import { postgresEnvironmentSchema } from '#shared-environment.ts';

// Match the domain schemas by reading NUMERIC as numbers and timestamps as strings.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);

pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, String);

pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, String);

class Database {
  private readonly client: Knex;

  constructor() {
    const environment = postgresEnvironmentSchema.parse(process.env);

    this.client = knex({
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
      // Tests rely on one connection for BEGIN/ROLLBACK isolation.
      pool: process.env.NODE_ENV === 'test' ? { min: 1, max: 1 } : undefined,
    });
  }

  public getClient(): Knex {
    return this.client;
  }

  public async close(): Promise<void> {
    await this.client.destroy();
  }
}

export default new Database();
