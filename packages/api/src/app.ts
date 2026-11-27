// Assemble the HTTP routes for the Node server and integration tests.
import process from 'node:process';

import { getConnInfo } from '@hono/node-server/conninfo';
import { Hono, type Context } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';

import { errorManager } from '#error-manager';
import { measurementRouter } from '#router/measurement.router.ts';

const clientIp = (context: Context): string => getConnInfo(context).remote.address ?? 'unknown';

export const app = new Hono();

if (process.env.NODE_ENV === 'production') {
  app.use(
    '/get-latest-measure',
    rateLimiter({ windowMs: 60_000, limit: 15, keyGenerator: clientIp }),
  );
  app.use(
    '/get-chart-history',
    rateLimiter({ windowMs: 60_000, limit: 5, keyGenerator: clientIp }),
  );
}

app.onError(errorManager).route('/', measurementRouter);
