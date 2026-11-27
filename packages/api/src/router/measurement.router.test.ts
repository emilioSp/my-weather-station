// Verify the weather measurement endpoints through Hono and local PostgreSQL.
import { METER_TYPES } from '@wx/shared';
import database from '@wx/shared/db.ts';
import { afterAll, afterEach, expect, it, onTestFinished, vi } from 'vitest';

import { app } from '#app';

type TestReading = {
  device_name: string;
  measured_at: string;
  temperature: number;
};

const insertIsolatedReadings = async (readings: TestReading[]) => {
  // The test pool uses one connection. Shadow public.measures for this transaction
  // so the real chart history function sees only the scenario's readings.
  const client = database.getClient();
  await client.raw('BEGIN');
  onTestFinished(async () => {
    await client.raw('ROLLBACK');
  });
  await client.raw('CREATE TEMP TABLE measures (LIKE public.measures INCLUDING ALL)');
  await client('measures').insert(
    readings.map((reading) => ({
      device_id: 'test-meter',
      device_type: METER_TYPES.INDOOR,
      humidity: 45,
      dew_point: 8,
      heat_index: reading.temperature,
      battery: 90,
      signal_power_dbm: -65,
      ...reading,
    })),
  );
};

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await database.close();
});

it('given two kitchen readings and a newer garden reading when kitchen is requested then its newest reading is returned as one object', async () => {
  await insertIsolatedReadings([
    { device_name: 'kitchen', measured_at: '2026-01-02T09:00:00Z', temperature: 18 },
    { device_name: 'kitchen', measured_at: '2026-01-02T10:00:00Z', temperature: 20 },
    { device_name: 'garden', measured_at: '2026-01-02T11:00:00Z', temperature: 12 },
  ]);

  const response = await app.request('/get-latest-measure?device_name=kitchen');

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    id: expect.any(String),
    device_id: 'test-meter',
    device_type: METER_TYPES.INDOOR,
    device_name: 'kitchen',
    address: null,
    measured_at: '2026-01-02T10:00:00+00:00',
    temperature: 20,
    humidity: 45,
    dew_point: 8,
    heat_index: 20,
    battery: 90,
    signal_power_dbm: -65,
  });
});

it.each([
  { scenario: 'an absent office device', name: 'office' },
  { scenario: 'a different case', name: 'Kitchen' },
  { scenario: 'a trailing space', name: 'kitchen%20' },
])(
  'given a kitchen reading when latest is requested with $scenario then the response is 200 with JSON null',
  async ({ name }) => {
    await insertIsolatedReadings([
      { device_name: 'kitchen', measured_at: '2026-01-02T09:00:00Z', temperature: 18 },
    ]);

    const response = await app.request(`/get-latest-measure?device_name=${name}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  },
);

it.each([
  { scenario: 'a missing device name', query: '' },
  { scenario: 'a blank device name', query: '?device_name=%20' },
])('given $scenario when latest is requested then the response is 400', async ({ query }) => {
  const response = await app.request(`/get-latest-measure${query}`);

  expect(response.status).toBe(400);
});

it.each([
  {
    scenario: 'UTC timestamps',
    query: 'start_date=2026-01-02T09:00:00Z&end_date=2026-01-02T10:00:00Z',
  },
  {
    scenario: 'offset timestamps',
    query: 'start_date=2026-01-02T11:00:00%2B02:00&end_date=2026-01-02T05:00:00-05:00',
  },
])(
  'given readings at, inside and outside the bounds when history is requested with $scenario then it groups and sorts only the included readings',
  async ({ query }) => {
    await insertIsolatedReadings([
      { device_name: 'kitchen', measured_at: '2026-01-02T08:59:00Z', temperature: 18 },
      { device_name: 'kitchen', measured_at: '2026-01-02T10:00:00Z', temperature: 20 },
      { device_name: 'kitchen', measured_at: '2026-01-02T09:00:00Z', temperature: 19 },
      { device_name: 'back_yard', measured_at: '2026-01-02T09:30:00Z', temperature: 12 },
      { device_name: 'back_yard', measured_at: '2026-01-02T10:01:00Z', temperature: 13 },
    ]);

    const response = await app.request(`/get-chart-history?${query}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      kitchen: [
        expect.objectContaining({
          device_name: 'kitchen',
          measured_at: '2026-01-02T09:00:00+00:00',
        }),
        expect.objectContaining({
          device_name: 'kitchen',
          measured_at: '2026-01-02T10:00:00+00:00',
        }),
      ],
      back_yard: [
        expect.objectContaining({
          device_name: 'back_yard',
          measured_at: '2026-01-02T09:30:00+00:00',
        }),
      ],
    });
  },
);

it('given readings just outside fractional bounds when history is requested then only the reading between them is returned', async () => {
  await insertIsolatedReadings([
    { device_name: 'kitchen', measured_at: '2026-01-02T09:00:00Z', temperature: 18 },
    { device_name: 'kitchen', measured_at: '2026-01-02T09:30:00Z', temperature: 19 },
    { device_name: 'kitchen', measured_at: '2026-01-02T10:00:00Z', temperature: 20 },
  ]);

  const response = await app.request(
    '/get-chart-history?start_date=2026-01-02T09:00:00.000000001Z&end_date=2026-01-02T09:59:59.999999999Z',
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    kitchen: [expect.objectContaining({ measured_at: '2026-01-02T09:30:00+00:00' })],
  });
});

it('given a reading outside the range when history is requested then the response is 200 with an empty object', async () => {
  await insertIsolatedReadings([
    { device_name: 'kitchen', measured_at: '2026-01-03T09:00:00Z', temperature: 18 },
  ]);

  const response = await app.request(
    '/get-chart-history?start_date=2026-01-02T09:00:00Z&end_date=2026-01-02T10:00:00Z',
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({});
});

it.each([
  { scenario: 'a missing start', query: 'end_date=2026-01-02T10:00:00Z' },
  { scenario: 'a start without a time zone', query: 'start_date=2026-01-02T09:00:00' },
  { scenario: 'a blank end', query: 'start_date=2026-01-02T09:00:00Z&end_date=' },
  {
    scenario: 'a start after the end',
    query: 'start_date=2026-01-02T10:00:00Z&end_date=2026-01-02T09:00:00Z',
  },
])('given $scenario when history is requested then the response is 400', async ({ query }) => {
  const response = await app.request(`/get-chart-history?${query}`);

  expect(response.status).toBe(400);
});

it.each([
  { scenario: 'without an end', query: 'start_date=2026-01-02T09:00:00Z' },
  {
    scenario: 'with a future end',
    query: 'start_date=2026-01-02T09:00:00Z&end_date=2026-01-02T11:00:00Z',
  },
])(
  'given readings before, at and after now when history is requested $scenario then it includes only readings through now',
  async ({ query }) => {
    await insertIsolatedReadings([
      { device_name: 'kitchen', measured_at: '2026-01-02T09:00:00Z', temperature: 18 },
      { device_name: 'kitchen', measured_at: '2026-01-02T10:00:00Z', temperature: 20 },
      { device_name: 'kitchen', measured_at: '2026-01-02T10:01:00Z', temperature: 21 },
    ]);

    const clock = vi
      .spyOn(Temporal.Now, 'instant')
      .mockReturnValue(Temporal.Instant.from('2026-01-02T10:00:00Z'));

    const response = await app.request(`/get-chart-history?${query}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      kitchen: [
        expect.objectContaining({ measured_at: '2026-01-02T09:00:00+00:00' }),
        expect.objectContaining({ measured_at: '2026-01-02T10:00:00+00:00' }),
      ],
    });
    expect(clock).toHaveBeenCalledTimes(1);
  },
);

it('given readings at the 31-day cutoff and just before it when history is requested for a longer past range then it returns only the last 31 days', async () => {
  await insertIsolatedReadings([
    { device_name: 'kitchen', measured_at: '2026-04-30T23:59:00Z', temperature: 18 },
    { device_name: 'kitchen', measured_at: '2026-05-01T00:00:00Z', temperature: 20 },
    { device_name: 'kitchen', measured_at: '2026-06-01T00:00:00Z', temperature: 21 },
  ]);
  vi.spyOn(Temporal.Now, 'instant').mockReturnValue(Temporal.Instant.from('2026-07-01T00:00:00Z'));

  const response = await app.request(
    '/get-chart-history?start_date=2026-01-01T00:00:00Z&end_date=2026-06-01T00:00:00Z',
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    kitchen: [
      expect.objectContaining({ measured_at: '2026-05-01T00:00:00+00:00' }),
      expect.objectContaining({ measured_at: '2026-06-01T00:00:00+00:00' }),
    ],
  });
});
