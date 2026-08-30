import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE measures
      ALTER COLUMN measured_at
      TYPE TIMESTAMPTZ(0)
      USING measured_at;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE measures
      ALTER COLUMN measured_at
      TYPE TIMESTAMPTZ
      USING measured_at;
  `);
}
