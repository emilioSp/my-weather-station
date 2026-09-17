import { Client } from 'pg';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import {
  getChartHistory,
  getLatestMeasure,
  getLatestMeasures,
  toMeasureHistory,
  toMeasureResult,
} from '#supabase.api.ts';

const database = new Client({
  host: '127.0.0.1',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

await database.connect();

afterEach(async () => {
  await database.query('TRUNCATE TABLE measures');
});

afterAll(async () => {
  await database.end();
});

const seedMeasures = async () => {
  await database.query(`
    INSERT INTO measures (
      id, device_id, device_name, device_type, address, temperature, dew_point,
      heat_index, humidity, battery, signal_power_dbm, measured_at
    ) VALUES
      ('00000000-0000-0000-0000-000000000001', 'kitchen-device', 'kitchen', 'indoor', 'aa:bb', 10.0, 5.0, 11.0, 50, 80, -60, '2020-01-01T00:00:00Z'),
      ('00000000-0000-0000-0000-000000000002', 'kitchen-device', 'kitchen', 'indoor', 'aa:bb', 20.0, 15.0, 21.0, 60, 90, -50, '2020-01-01T12:00:00Z'),
      ('00000000-0000-0000-0000-000000000003', 'office-device', 'office', 'indoor', 'ee:ff', 15.0, 10.0, 16.0, 55, 85, -55, '2020-01-01T06:00:00Z'),
      ('00000000-0000-0000-0000-000000000004', 'garden-device', 'garden', 'outdoor', 'cc:dd', 5.0, 0.0, 6.0, 70, 70, -70, '2020-01-01T06:00:00Z')
  `);
};

describe('Supabase API', () => {
  it('normalizes empty responses into empty results', () => {
    expect(toMeasureResult({ data: null, error: null })).toEqual({
      rows: [],
      error: null,
    });
    expect(toMeasureHistory(null)).toEqual({});
  });

  it('selects the latest measure by name and returns name-keyed chart history', async () => {
    await seedMeasures();

    const latest = await getLatestMeasure({ deviceName: 'kitchen' });
    const history = await getChartHistory({
      measuredAfter: new Date('2020-01-01T00:00:00Z'),
      measuredBefore: new Date('2020-01-02T00:00:00Z'),
    });

    expect(latest.error).toBeNull();
    expect(latest.rows).toHaveLength(1);
    expect(latest.rows[0]).toMatchObject({
      id: '00000000-0000-0000-0000-000000000002',
      deviceName: 'kitchen',
      temperature: 20,
      deviceType: 'indoor',
    });
    expect(history.error).toBeNull();
    expect(history.history.kitchen).toMatchObject([
      {
        id: '00000000-0000-0000-0000-000000000001',
        deviceName: 'kitchen',
        temperature: 10,
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        deviceName: 'kitchen',
        temperature: 20,
      },
    ]);
    expect(history.history.office).toMatchObject([
      {
        id: '00000000-0000-0000-0000-000000000003',
        deviceName: 'office',
        temperature: 15,
      },
    ]);
    expect(history.history.garden).toMatchObject([
      {
        id: '00000000-0000-0000-0000-000000000004',
        deviceName: 'garden',
        temperature: 5,
      },
    ]);
  });

  it('returns configured latest measures in device order', async () => {
    await seedMeasures();

    const latest = await getLatestMeasures();

    expect(latest.error).toBeNull();
    expect(latest.rows.map(({ deviceName }) => deviceName)).toEqual([
      'garden',
      'kitchen',
    ]);
  });

  it('queries an empty local database through the real Supabase client', async () => {
    const latest = await getLatestMeasure({ deviceName: 'kitchen' });
    const history = await getChartHistory({
      measuredAfter: new Date('2020-01-01T00:00:00Z'),
      measuredBefore: new Date('2020-01-02T00:00:00Z'),
    });

    expect(latest.error).toBeNull();
    expect(latest.rows).toEqual([]);
    expect(history.error).toBeNull();
    expect(history.history).toEqual({});
  });
});
