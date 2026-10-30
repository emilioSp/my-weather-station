// Apply and reverse add address during database migrations.

import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.raw(`
    ALTER TABLE measures
      ALTER COLUMN device_id DROP NOT NULL,
      ADD COLUMN address TEXT,
      ADD CONSTRAINT measures_device_identifier_check
        CHECK (device_id IS NOT NULL OR address IS NOT NULL);
  `);
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw(`
    ALTER TABLE measures
      DROP CONSTRAINT measures_device_identifier_check,
      DROP COLUMN address,
      ALTER COLUMN device_id SET NOT NULL;
  `);
};
