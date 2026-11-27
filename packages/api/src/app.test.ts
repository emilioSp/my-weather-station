// Verify cross-origin responses when the production rate limiter rejects requests.
import { afterAll, expect, it, vi } from 'vitest';

vi.hoisted(() => vi.stubEnv('NODE_ENV', 'production'));

import { app } from '#app';

afterAll(() => {
  vi.unstubAllEnvs();
});

it.each([
  { endpoint: '/get-latest-measure', limit: 15 },
  { endpoint: '/get-chart-history', limit: 5 },
])(
  'given a browser at the quota for $endpoint when another request arrives then it can read the 429',
  async ({ endpoint, limit }) => {
    // Supply the client IP that the Node adapter would expose. Missing query parameters
    // exercise the rate limit before validation without using the database.
    const request = () =>
      app.request(
        endpoint,
        { headers: { Origin: 'https://emiliosp.github.io' } },
        { incoming: { socket: { remoteAddress: '127.0.0.1' } } },
      );

    for (let index = 0; index < limit; index += 1) {
      const response = await request();
      expect(response.status).toBe(400);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    }

    const response = await request();
    expect(response.status).toBe(429);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  },
);
