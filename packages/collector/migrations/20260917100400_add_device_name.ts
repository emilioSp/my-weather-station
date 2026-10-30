// Apply and reverse add device name during database migrations.

import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.raw(`
    ALTER TABLE measures
      ADD COLUMN device_name TEXT NOT NULL DEFAULT 'UNKNOWN';
  `);
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw(`
    ALTER TABLE measures
      DROP COLUMN device_name;
  `);
};
