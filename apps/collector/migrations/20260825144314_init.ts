import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE measures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id TEXT NOT NULL,
      device_type TEXT NOT NULL CHECK (device_type IN ('outdoor', 'indoor')),
      temperature NUMERIC(4, 1) NOT NULL,
      dew_point NUMERIC(4, 1) NOT NULL,
      heat_index NUMERIC(4, 1) NOT NULL,
      humidity INTEGER NOT NULL,
      battery INTEGER NOT NULL,
      signal_power_dbm INTEGER NOT NULL,
      measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TABLE IF EXISTS measures;');
}
