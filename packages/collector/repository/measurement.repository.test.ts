// Verify stored measurement rows against PostgreSQL during collector integration checks.

import { METER_TYPES } from '@wx/shared';
import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  Object.assign(process.env, {
    POSTGRES_HOST: '127.0.0.1',
    POSTGRES_PORT: '54322',
    POSTGRES_DB: 'postgres',
    POSTGRES_USER: 'postgres',
    POSTGRES_PASSWORD: 'postgres',
  });
});

import database from '@wx/shared/db.ts';

import { storeMeasurement } from '#repository/measurement.repository.ts';
import { setupDatabaseTest } from '#tests/setup-db.ts';

describe('storeMeasurement', () => {
  it('given a complete measurement when storing it then persists snake-case columns and returns the same snake-case row', async () => {
    await setupDatabaseTest();

    const measurement = await storeMeasurement({
      type: METER_TYPES.INDOOR,
      deviceName: 'kitchen',
      deviceId: 'repository-device',
      address: 'aa:bb:cc',
      temperature: 20,
      dewPoint: 10.2,
      heatIndex: 21.1,
      humidity: 55,
      battery: 80,
      signalPowerDBM: -55,
    });

    expect(measurement).not.toHaveProperty('deviceName');
    expect(measurement).not.toHaveProperty('signalPowerDBM');
    expect(measurement.measured_at).toEqual(expect.any(String));
    expect(await database.getClient()('measures').where({ id: measurement.id }).first()).toEqual(
      measurement,
    );
    expect(measurement).toMatchObject({
      id: measurement.id,
      device_id: 'repository-device',
      address: 'aa:bb:cc',
      device_name: 'kitchen',
      device_type: METER_TYPES.INDOOR,
      temperature: 20,
      dew_point: 10.2,
      heat_index: 21.1,
      humidity: 55,
      battery: 80,
      signal_power_dbm: -55,
    });
  });
});
