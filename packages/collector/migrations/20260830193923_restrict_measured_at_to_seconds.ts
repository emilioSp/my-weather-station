// Apply and reverse restrict measured at to seconds during database migrations.

import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.raw(`
    ALTER TABLE measures
      ALTER COLUMN measured_at
      TYPE TIMESTAMPTZ(0)
      USING measured_at;
  `);
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw(`
    ALTER TABLE measures
      ALTER COLUMN measured_at
      TYPE TIMESTAMPTZ
      USING measured_at;
  `);
};
