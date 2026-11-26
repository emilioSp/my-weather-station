// Expose the temporary greeting through the HTTP API.
import { Hono } from 'hono';

import { BadRequestError } from '#application-errors/bad-request.error.ts';
import { helloWorldQuerySchema } from '#schema/hello-world.schema.ts';
import { getGreeting } from '#service/hello-world.service.ts';

export const helloWorldRouter = new Hono().get('/', async (context) => {
  const query = helloWorldQuerySchema.safeParse(context.req.query());

  if (!query.success) {
    throw new BadRequestError({ message: 'Validation failed', error: query.error });
  }

  const message = await getGreeting(query.data.name);

  return context.json({ message });
});
