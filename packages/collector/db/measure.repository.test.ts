import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  Object.assign(process.env, {
    DEVICES: '[{"type":"indoor","deviceId":"test","deviceName":"test meter"}]',
    POSTGRES_HOST: '127.0.0.1',
    POSTGRES_PORT: '54322',
    POSTGRES_DB: 'postgres',
    POSTGRES_USER: 'postgres',
    POSTGRES_PASSWORD: 'postgres',
  });
});

import db, { closeDatabaseConnection } from '#db/db.ts';
import { storeMeasure } from '#db/measure.repository.ts';

afterAll(closeDatabaseConnection);

afterEach(async () => {
  await db.raw('TRUNCATE TABLE measures');
});

describe('storeMeasure', () => {
  it('stores a complete measure and returns its camel-case row', async () => {
    const measure = await storeMeasure({
      type: 'indoor',
      deviceName: 'repository meter',
      deviceId: 'repository-device',
      address: 'aa:bb:cc',
      temperature: 20.5,
      dewPoint: 10.2,
      heatIndex: 21.1,
      humidity: 55,
      battery: 80,
      signalPowerDBM: -48,
    });

    expect(measure).toMatchObject({
      deviceId: 'repository-device',
      deviceName: 'repository meter',
      address: 'aa:bb:cc',
      deviceType: 'indoor',
      temperature: 20.5,
      dewPoint: 10.2,
      heatIndex: 21.1,
      humidity: 55,
      battery: 80,
      signalPowerDBM: -48,
    });
    expect(measure.measuredAt).toEqual(expect.any(String));

    expect(
      await db('measures').where({ id: measure.id }).first(),
    ).toMatchObject({
      id: measure.id,
      device_id: 'repository-device',
      address: 'aa:bb:cc',
      device_name: 'repository meter',
      device_type: 'indoor',
      temperature: 20.5,
      dew_point: 10.2,
      heat_index: 21.1,
      humidity: 55,
      battery: 80,
      signal_power_dbm: -48,
    });
  });

  it('uses UNKNOWN for a raw insert without a device name', async () => {
    await db.raw(`
      INSERT INTO measures (
        device_id, device_type, temperature, dew_point, heat_index,
        humidity, battery, signal_power_dbm
      ) VALUES ('raw-device', 'indoor', 20, 10, 21, 50, 80, -50)
    `);

    await expect(
      db('measures').select('device_name').first(),
    ).resolves.toMatchObject({ device_name: 'UNKNOWN' });
  });
});
