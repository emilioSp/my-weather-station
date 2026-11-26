// Apply and reverse add measures query index during database migrations.

import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.raw(`
    CREATE INDEX measures_device_type_measured_at_index
      ON measures (device_type, measured_at DESC);
  `);
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw('DROP INDEX measures_device_type_measured_at_index;');
};
