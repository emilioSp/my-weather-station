// Verify advertisement matching, scan timeouts, and startup failures during collector checks.

import { METER_TYPES } from '@wx/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

const noble = await vi.hoisted(async () => {
  const { EventEmitter } = await import('node:events');
  const emitter = new EventEmitter();

  return Object.assign(emitter, {
    waitForPoweredOnAsync:
      vi.fn<typeof import('@stoprocent/noble').default.waitForPoweredOnAsync>(),
    startScanningAsync: vi.fn<typeof import('@stoprocent/noble').default.startScanningAsync>(),
    stopScanningAsync: vi.fn<typeof import('@stoprocent/noble').default.stopScanningAsync>(),
  });
});

vi.mock('@stoprocent/noble', () => ({ default: noble }));

vi.mock('#environment.ts', () => ({
  environment: { BLE_TIMEOUT_MS: 0 },
}));

import { getAdvertisement } from '#api/sensor.api.ts';

const meter = {
  type: METER_TYPES.INDOOR,
  deviceId: 'device-id',
  address: 'aa:bb',
};

const peripheral = {
  id: 'DEVICE-ID',
  address: '11:22',
  rssi: -45,
  advertisement: { manufacturerData: Buffer.from([1]), serviceData: [] },
};

const nonMatchingPeripheral = {
  ...peripheral,
  id: 'other-device',
  address: '00:00',
};

afterEach(() => {
  noble.removeAllListeners();
  vi.resetAllMocks();
});

describe('getAdvertisement', () => {
  it('given matching and unrelated peripherals when scanning then returns the matching advertisement and stops scanning', async () => {
    noble.waitForPoweredOnAsync.mockResolvedValue(undefined);
    noble.startScanningAsync.mockResolvedValue(undefined);
    noble.stopScanningAsync.mockResolvedValue(undefined);
    noble.startScanningAsync.mockImplementation(async () => {
      queueMicrotask(() => {
        noble.emit('discover', nonMatchingPeripheral);
        noble.emit('discover', peripheral);
      });
    });

    await expect(getAdvertisement(meter)).resolves.toMatchObject({
      deviceId: 'device-id',
      address: peripheral.address,
      signalPowerDBM: -45,
    });
    expect(noble.stopScanningAsync).toHaveBeenCalledOnce();
  });

  it('given no matching peripheral when scanning times out then returns null and stops scanning', async () => {
    noble.waitForPoweredOnAsync.mockResolvedValue(undefined);
    noble.startScanningAsync.mockResolvedValue(undefined);
    noble.stopScanningAsync.mockResolvedValue(undefined);
    await expect(getAdvertisement(meter)).resolves.toBeNull();
    expect(noble.stopScanningAsync).toHaveBeenCalledOnce();
  });

  it('given a scan startup failure when requesting an advertisement then rejects without stopping scanning', async () => {
    noble.waitForPoweredOnAsync.mockResolvedValue(undefined);
    noble.startScanningAsync.mockResolvedValue(undefined);
    noble.stopScanningAsync.mockResolvedValue(undefined);
    noble.startScanningAsync.mockRejectedValue(new Error('scan failed'));
    await expect(getAdvertisement(meter)).rejects.toThrow('scan failed');
    expect(noble.stopScanningAsync).not.toHaveBeenCalled();
  });
});
