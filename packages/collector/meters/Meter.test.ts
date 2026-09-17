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
import NoCompleteReadingError from '#errors/NoCompleteReadingError.ts';
import { IndoorMeter } from '#meters/IndoorMeter.ts';
import { createMeter } from '#meters/meter.factory.ts';
import { OutdoorMeter } from '#meters/OutdoorMeter.ts';
import type { Advertisement } from '#types.ts';

const sensor = vi.hoisted(() => ({ getAdvertisement: vi.fn() }));
vi.mock('#api/sensor.api.ts', () => sensor);

const indoor = {
  type: 'indoor' as const,
  deviceName: 'indoor meter',
  deviceId: 'indoor-device',
  address: 'aa:bb',
};
const outdoor = {
  type: 'outdoor' as const,
  deviceName: 'outdoor meter',
  deviceId: 'outdoor-device',
  address: 'cc:dd',
};
const advertisement = (
  overrides: Partial<Advertisement> = {},
): Advertisement => ({
  deviceId: 'indoor-device',
  address: 'aa:bb',
  manufacturerData: undefined,
  serviceData: [],
  signalPowerDBM: -50,
  ...overrides,
});

afterEach(async () => {
  await db.raw('TRUNCATE TABLE measures');
  sensor.getAdvertisement.mockReset();
});

afterAll(closeDatabaseConnection);

describe('meters', () => {
  it('reads a complete indoor advertisement and stores it', async () => {
    sensor.getAdvertisement.mockResolvedValue(
      advertisement({
        serviceData: [
          { uuid: 'FD3D', data: Buffer.from([0x54, 0, 80, 5, 0x94, 60]) },
        ],
      }),
    );
    const measure = await new IndoorMeter(indoor).read();

    expect(measure).toMatchObject({
      deviceId: 'indoor-device',
      deviceName: 'indoor meter',
      deviceType: 'indoor',
      temperature: 20.5,
      humidity: 60,
      battery: 80,
      signalPowerDBM: -50,
    });
    expect(
      await db('measures').where({ id: measure.id }).first(),
    ).toMatchObject({ device_name: 'indoor meter' });
  });

  it('combines outdoor advertisements before storing a complete reading', async () => {
    sensor.getAdvertisement
      .mockResolvedValueOnce(
        advertisement({
          deviceId: 'outdoor-device',
          address: 'cc:dd',
          manufacturerData: Buffer.from([
            0x69, 0x09, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0x99, 70,
          ]),
        }),
      )
      .mockResolvedValueOnce(
        advertisement({
          deviceId: 'outdoor-device',
          address: 'cc:dd',
          serviceData: [{ uuid: 'fd3d', data: Buffer.from([0x77, 0, 90]) }],
        }),
      );
    const measure = await new OutdoorMeter(outdoor).read();

    expect(measure).toMatchObject({
      deviceName: 'outdoor meter',
      deviceType: 'outdoor',
      temperature: 25.3,
      humidity: 70,
      battery: 90,
    });
  });

  it('rejects incomplete and invalid advertisements after all scan attempts', async () => {
    sensor.getAdvertisement.mockResolvedValue(
      advertisement({
        serviceData: [{ uuid: 'fd3d', data: Buffer.from([0x54]) }],
      }),
    );
    await expect(new IndoorMeter(indoor).read()).rejects.toBeInstanceOf(
      NoCompleteReadingError,
    );
    expect(sensor.getAdvertisement).toHaveBeenCalledTimes(8);
  });

  it('creates configured meter strategies and rejects an unknown type', () => {
    expect(createMeter(indoor)).toBeInstanceOf(IndoorMeter);
    expect(createMeter(outdoor)).toBeInstanceOf(OutdoorMeter);
    expect(() =>
      createMeter({ ...indoor, type: 'unknown' as 'indoor' }),
    ).toThrow('Unknown meter type unknown');
    expect(new IndoorMeter(indoor).getMeter()).toEqual(indoor);
  });
});
