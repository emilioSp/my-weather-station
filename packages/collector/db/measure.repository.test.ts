// Verify stored measure mapping against PostgreSQL during collector integration checks.

import { METER_TYPES } from '@wx/shared';
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

import database from '#db/db.ts';
import { storeMeasure } from '#db/measure.repository.ts';

afterAll(async () => {
  await database.close();
});

afterEach(async () => {
  await database.getClient().raw('TRUNCATE TABLE measures');
});

describe('storeMeasure', () => {
  it('given a complete measure when storing it then persists snake-case columns and returns a camel-case row', async () => {
    const measure = await storeMeasure({
      type: METER_TYPES.INDOOR,
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
      deviceType: METER_TYPES.INDOOR,
      temperature: 20.5,
      dewPoint: 10.2,
      heatIndex: 21.1,
      humidity: 55,
      battery: 80,
      signalPowerDBM: -48,
    });
    expect(measure.measuredAt).toEqual(expect.any(String));

    expect(await database.getClient()('measures').where({ id: measure.id }).first()).toMatchObject({
      id: measure.id,
      device_id: 'repository-device',
      address: 'aa:bb:cc',
      device_name: 'repository meter',
      device_type: METER_TYPES.INDOOR,
      temperature: 20.5,
      dew_point: 10.2,
      heat_index: 21.1,
      humidity: 55,
      battery: 80,
      signal_power_dbm: -48,
    });
  });
});
