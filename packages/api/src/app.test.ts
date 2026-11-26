// Verify the temporary HTTP endpoint against local PostgreSQL.
import database from '@wx/shared/db.ts';
import { afterAll, expect, it } from 'vitest';

import { app } from '#app';

afterAll(async () => {
  await database.close();
});

it.each([
  { scenario: 'a supplied name', path: '/hello-world?name=Emilio', message: 'Hello Emilio!' },
  { scenario: 'no name', path: '/hello-world', message: 'Hello World!' },
])(
  'given $scenario when GET /hello-world is requested then it returns $message',
  async ({ path, message }) => {
    const response = await app.request(path);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message });
  },
);
