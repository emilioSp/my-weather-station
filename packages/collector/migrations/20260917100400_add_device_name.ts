import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE measures
      ADD COLUMN device_name TEXT NOT NULL DEFAULT 'UNKNOWN';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE measures
      DROP COLUMN device_name;
  `);
}
