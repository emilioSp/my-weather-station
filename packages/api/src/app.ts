// Assemble the HTTP routes for the Node server and integration tests.
import { Hono } from 'hono';

import { errorManager } from '#error-manager';
import { helloWorldRouter } from '#router/hello-world.router.ts';
import { measurementRouter } from '#router/measurement.router.ts';

export const app = new Hono()
  .onError(errorManager)
  .route('/hello-world', helloWorldRouter)
  .route('/', measurementRouter);
