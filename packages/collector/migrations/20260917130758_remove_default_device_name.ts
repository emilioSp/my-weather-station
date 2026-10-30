// Apply and reverse remove default device name during database migrations.

import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.raw(`
    ALTER TABLE measures ALTER COLUMN device_name DROP DEFAULT;
  `);
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw(`
    ALTER TABLE measures ALTER COLUMN device_name SET DEFAULT 'UNKNOWN';
  `);
};
