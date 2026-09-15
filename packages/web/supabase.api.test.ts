import { Client } from 'pg';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { getChartHistory, getLatestMeasure } from '#supabase.api.ts';

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
      id, device_id, device_type, address, temperature, dew_point, heat_index,
      humidity, battery, signal_power_dbm, measured_at
    ) VALUES
      ('00000000-0000-0000-0000-000000000001', 'indoor-device', 'indoor', 'aa:bb', 10.0, 5.0, 11.0, 50, 80, -60, '2020-01-01T00:00:00Z'),
      ('00000000-0000-0000-0000-000000000002', 'indoor-device', 'indoor', 'aa:bb', 20.0, 15.0, 21.0, 60, 90, -50, '2020-01-01T12:00:00Z'),
      ('00000000-0000-0000-0000-000000000003', 'outdoor-device', 'outdoor', 'cc:dd', 5.0, 0.0, 6.0, 70, 70, -70, '2020-01-01T06:00:00Z')
  `);
};

describe('Supabase API', () => {
  it('selects the latest measure and returns chart history from the local database', async () => {
    await seedMeasures();

    const latest = await getLatestMeasure({ deviceType: 'indoor' });
    const history = await getChartHistory({
      measuredAfter: new Date('2020-01-01T00:00:00Z'),
      measuredBefore: new Date('2020-01-02T00:00:00Z'),
    });

    expect(latest.error).toBeNull();
    expect(latest.rows).toHaveLength(1);
    expect(latest.rows[0]).toMatchObject({
      id: '00000000-0000-0000-0000-000000000002',
      temperature: 20,
      deviceType: 'indoor',
    });
    expect(history.error).toBeNull();
    expect(history.history.indoor).toMatchObject([
      { id: '00000000-0000-0000-0000-000000000001', temperature: 10 },
      { id: '00000000-0000-0000-0000-000000000002', temperature: 20 },
    ]);
    expect(history.history.outdoor).toMatchObject([
      { id: '00000000-0000-0000-0000-000000000003', temperature: 5 },
    ]);
  });

  it('queries an empty local database through the real Supabase client', async () => {
    const latest = await getLatestMeasure({ deviceType: 'indoor' });
    const history = await getChartHistory({
      measuredAfter: new Date('2020-01-01T00:00:00Z'),
      measuredBefore: new Date('2020-01-02T00:00:00Z'),
    });

    expect(latest.error).toBeNull();
    expect(latest.rows).toEqual([]);
    expect(history.error).toBeNull();
    expect(history.history).toEqual({ indoor: [], outdoor: [] });
  });
});
