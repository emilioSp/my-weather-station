// Start the HTTP server and close the database pool when the process stops.
import { promisify } from 'node:util';

import { serve } from '@hono/node-server';
import database from '@wx/shared/db.ts';

import { app } from '#app';

const server = serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) }, ({ port }) => {
  console.log(`API listening on port ${port}`);
});

const shutdown = async (): Promise<void> => {
  await promisify(server.close.bind(server))();
  await database.close();
};

process.once('SIGINT', shutdown);

process.once('SIGTERM', shutdown);
