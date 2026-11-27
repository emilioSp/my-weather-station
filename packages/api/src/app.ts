// Assemble the HTTP routes for the Node server and integration tests.
import process from 'node:process';

import { getConnInfo } from '@hono/node-server/conninfo';
import { Hono, type Context } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { cors } from 'hono/cors';

import { errorManager } from '#error-manager';
import { measurementRouter } from '#router/measurement.router.ts';

const clientIp = (context: Context): string => getConnInfo(context).remote.address ?? 'unknown';

const measurementLimiter = (limit: number) =>
  rateLimiter({
    windowMs: 60_000,
    limit,
    keyGenerator: clientIp,
  });

export const app = new Hono();

app.use(cors({ origin: '*' }));

if (process.env.NODE_ENV === 'production') {
  app.use('/get-latest-measure', measurementLimiter(15));
  app.use('/get-chart-history', measurementLimiter(5));
}

app.onError(errorManager).route('/', measurementRouter);
