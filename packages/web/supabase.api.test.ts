// Verify real Supabase queries using unique test data and cleanup limited to inserted rows.

import { randomUUID } from 'node:crypto';

import { METER_TYPES } from '@wx/shared';
import { Client } from 'pg';
import { afterAll, describe, expect, it, onTestFinished, vi } from 'vitest';

const { deviceNames, suffix } = await vi.hoisted(async () => {
  const { randomUUID } = await import('node:crypto');
  const suffix = randomUUID();

  const names = {
    kitchen: `test-kitchen-${suffix}`,
    office: `test-office-${suffix}`,
    garden: `test-garden-${suffix}`,
    livingRoom: `test-living-room-${suffix}`,
    missing: `test-missing-${suffix}`,
  };

  vi.stubEnv(
    'VITE_DEVICES',
    JSON.stringify([
      { deviceName: names.garden, icon: 'FaSeedling' },
      { deviceName: names.livingRoom, icon: 'FaCouch' },
    ]),
  );

  return { deviceNames: names, suffix };
});

import supabaseApi from '#supabase.api.ts';
import storedReadings from '#tests/fixtures/supabase/stored-readings.json';
import { toMeasureHistory } from '#utils/toMeasureHistory.util.ts';
import { toMeasureResult } from '#utils/toMeasureResult.util.ts';

const database = new Client({
  host: '127.0.0.1',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

await database.connect();

afterAll(async () => {
  await database.end();
  vi.unstubAllEnvs();
});

const seedMeasures = async () => {
  const measures = storedReadings.map((reading) => ({
    ...reading,
    id: randomUUID(),
    device_name: `test-${reading.device_name}-${suffix}`,
  }));

  // Register cleanup before inserting so partial setup and assertion failures are covered.
  onTestFinished(async () => {
    await database.query('DELETE FROM measures WHERE id = ANY($1::uuid[])', [
      measures.map(({ id }) => id),
    ]);
  });

  for (const measure of measures) {
    await database.query(
      `INSERT INTO measures (
        id, device_id, device_name, device_type, address, temperature, dew_point,
        heat_index, humidity, battery, signal_power_dbm, measured_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        measure.id,
        measure.device_name,
        measure.device_name,
        measure.device_type,
        measure.address,
        measure.temperature,
        measure.dew_point,
        measure.heat_index,
        measure.humidity,
        measure.battery,
        measure.signal_power_dbm,
        measure.measured_at,
      ],
    );
  }

  return measures;
};

describe('Supabase API', () => {
  it('given a null measure response when normalizing it then returns empty rows without an error', () => {
    expect(toMeasureResult({ data: null, error: null })).toEqual({
      rows: [],
      error: null,
    });
  });

  it('given null history when normalizing it then returns empty history', () => {
    expect(toMeasureHistory(null)).toEqual({});
  });

  it('given two stored kitchen readings when fetching the kitchen then returns only its latest reading', async () => {
    const measures = await seedMeasures();

    const latest = await supabaseApi.getLatestMeasure({ deviceName: deviceNames.kitchen });

    expect(latest.error).toBeNull();
    expect(latest.rows).toHaveLength(1);
    expect(latest.rows[0]).toMatchObject({
      id: measures[1].id,
      deviceName: deviceNames.kitchen,
      temperature: 20,
      deviceType: METER_TYPES.INDOOR,
    });
  });

  it('given stored readings for multiple named meters when fetching chart history then returns readings keyed by device name', async () => {
    const measures = await seedMeasures();

    const history = await supabaseApi.getChartHistory({
      measuredAfter: new Date('2020-01-01T00:00:00Z'),
      measuredBefore: new Date('2020-01-02T00:00:00Z'),
    });

    expect(history.error).toBeNull();
    expect(history.history[deviceNames.kitchen]).toMatchObject([
      {
        id: measures[0].id,
        deviceName: deviceNames.kitchen,
        temperature: 10,
      },
      {
        id: measures[1].id,
        deviceName: deviceNames.kitchen,
        temperature: 20,
      },
    ]);
    expect(history.history[deviceNames.office]).toMatchObject([
      {
        id: measures[2].id,
        deviceName: deviceNames.office,
        temperature: 15,
      },
    ]);
    expect(history.history[deviceNames.garden]).toMatchObject([
      {
        id: measures[3].id,
        deviceName: deviceNames.garden,
        temperature: 5,
      },
    ]);
  });

  it('given stored readings including an unconfigured kitchen when fetching configured meters then returns garden and living room in configuration order', async () => {
    await seedMeasures();

    const latest = await supabaseApi.getLatestMeasures();

    expect(latest.error).toBeNull();
    expect(latest.rows.map(({ deviceName }) => deviceName)).toEqual([
      deviceNames.garden,
      deviceNames.livingRoom,
    ]);
  });

  it('given an unknown device when querying its latest measure then returns no rows without an error', async () => {
    const latest = await supabaseApi.getLatestMeasure({ deviceName: deviceNames.missing });

    expect(latest.error).toBeNull();
    expect(latest.rows).toEqual([]);
  });

  it('given a time range before all stored readings when querying chart history then returns empty history without an error', async () => {
    const { rows } = await database.query<{ end_at: Date }>(`
      SELECT COALESCE(MIN(measured_at), '2000-01-01T00:00:00Z'::timestamptz)
        - INTERVAL '1 day' AS end_at
      FROM measures
    `);

    const measuredBefore = rows[0].end_at;
    const measuredAfter = new Date(measuredBefore.getTime() - 24 * 60 * 60 * 1000);

    const history = await supabaseApi.getChartHistory({ measuredAfter, measuredBefore });
    expect(history.error).toBeNull();
    expect(history.history).toEqual({});
  });
});
