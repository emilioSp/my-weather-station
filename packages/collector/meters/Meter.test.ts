// Verify meter decoding and factory rejection with controlled sensor advertisements.
import { METER_TYPES } from '@wx/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
import { NoCompleteReadingError } from '#errors/NoCompleteReadingError.ts';
import { IndoorMeter } from '#meters/IndoorMeter.ts';
import { createMeter } from '#meters/meter.factory.ts';
import { OutdoorMeter } from '#meters/OutdoorMeter.ts';
import { incompleteIndoorReading } from '#tests/fixtures/meters/incomplete-indoor-reading.ts';
import { indoorReading } from '#tests/fixtures/meters/indoor-reading.ts';
import { outdoorReading } from '#tests/fixtures/meters/outdoor-split-reading.ts';
import { setupDatabaseTest } from '#tests/setup-db.ts';

const sensor = vi.hoisted(() => ({
  getAdvertisement: vi.fn<typeof import('#api/sensor.api.ts').getAdvertisement>(),
}));

vi.mock('#api/sensor.api.ts', () => sensor);

afterEach(() => {
  sensor.getAdvertisement.mockReset();
});

describe('meters', () => {
  it('given a complete indoor advertisement when reading the meter then returns decoded values and persists the device name', async () => {
    await setupDatabaseTest();

    sensor.getAdvertisement.mockResolvedValue(indoorReading.advertisement);
    const measure = await new IndoorMeter(indoorReading.meter).read();

    expect(measure).toMatchObject({
      deviceId: 'indoor-device',
      deviceName: 'indoor meter',
      deviceType: METER_TYPES.INDOOR,
      temperature: 20.5,
      humidity: 60,
      battery: 80,
      signalPowerDBM: -50,
    });
    expect(await database.getClient()('measures').where({ id: measure.id }).first()).toMatchObject({
      device_name: 'indoor meter',
    });
  });

  it('given no advertisement followed by a complete advertisement when reading the meter then retries and stores the complete reading', async () => {
    await setupDatabaseTest();

    sensor.getAdvertisement
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(indoorReading.advertisement);

    const measure = await new IndoorMeter(indoorReading.meter).read();

    expect(sensor.getAdvertisement).toHaveBeenCalledTimes(2);
    expect(measure).toMatchObject({
      deviceName: 'indoor meter',
      temperature: 20.5,
      humidity: 60,
      battery: 80,
    });
    expect(await database.getClient()('measures').where({ id: measure.id }).select('id')).toEqual([
      { id: measure.id },
    ]);
  });

  it('given separate outdoor advertisements when reading the meter then combines temperature humidity and battery values', async () => {
    await setupDatabaseTest();

    sensor.getAdvertisement
      .mockResolvedValueOnce(outdoorReading.advertisements[0])
      .mockResolvedValueOnce(outdoorReading.advertisements[1]);
    const measure = await new OutdoorMeter(outdoorReading.meter).read();

    expect(measure).toMatchObject({
      deviceName: 'outdoor meter',
      deviceType: METER_TYPES.OUTDOOR,
      temperature: 25.3,
      humidity: 70,
      battery: 90,
    });
  });

  it('given incomplete indoor advertisements when reading the meter then throws NoCompleteReadingError after eight attempts', async () => {
    await setupDatabaseTest();

    sensor.getAdvertisement.mockResolvedValue(incompleteIndoorReading.advertisement);
    await expect(new IndoorMeter(indoorReading.meter).read()).rejects.toBeInstanceOf(
      NoCompleteReadingError,
    );
    expect(sensor.getAdvertisement).toHaveBeenCalledTimes(8);
  });

  it.each([
    { label: 'indoor', meter: indoorReading.meter, strategy: IndoorMeter },
    { label: 'outdoor', meter: outdoorReading.meter, strategy: OutdoorMeter },
  ])(
    'given an $label meter when creating its strategy then returns the matching strategy',
    ({ meter, strategy }) => {
      expect(createMeter(meter)).toBeInstanceOf(strategy);
    },
  );

  it('given an unknown meter type when creating its strategy then rejects the unknown type', () => {
    expect(() =>
      // JUSTIFICATION: Deliberately pass an invalid runtime type to test factory rejection.
      createMeter({ ...indoorReading.meter, type: 'unknown' as typeof METER_TYPES.INDOOR }),
    ).toThrow('Unknown meter type unknown');
  });

  it('given a configured indoor meter when reading its configuration then returns that configuration', () => {
    expect(new IndoorMeter(indoorReading.meter).getMeter()).toEqual(indoorReading.meter);
  });
});
