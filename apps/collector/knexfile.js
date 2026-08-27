/** @type {{ [key: string]: import('knex').Knex.Config }} */
const config = {
  client: 'postgresql',
  connection: {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  },
  pool: {
    min: 2,
    max: 15,
  },
  migrations: {
    tableName: 'knex_migrations',
  },
};

export default config;
