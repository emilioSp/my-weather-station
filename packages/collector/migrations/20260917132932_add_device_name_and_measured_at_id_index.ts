import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
      CREATE INDEX measures_device_name_measured_at_index ON measures (device_name, measured_at DESC);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
      DROP INDEX measures_device_name_measured_at_index;
  `);
}
