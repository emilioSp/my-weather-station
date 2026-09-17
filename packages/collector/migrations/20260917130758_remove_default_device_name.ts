import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE measures ALTER COLUMN device_name DROP DEFAULT;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE measures ALTER COLUMN device_name SET DEFAULT 'UNKNOWN';
  `);
}
