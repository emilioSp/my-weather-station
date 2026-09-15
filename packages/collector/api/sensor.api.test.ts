import { beforeEach, describe, expect, it, vi } from 'vitest';

const noble = await vi.hoisted(async () => {
  const { EventEmitter } = await import('node:events');
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    waitForPoweredOnAsync: vi.fn(),
    startScanningAsync: vi.fn(),
    stopScanningAsync: vi.fn(),
  });
});

vi.mock('@stoprocent/noble', () => ({ default: noble }));
vi.mock('#environment.ts', () => ({
  environment: { BLE_TIMEOUT_MS: 0 },
}));

import { getAdvertisement } from '#api/sensor.api.ts';

const meter = {
  type: 'indoor' as const,
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

beforeEach(() => {
  noble.removeAllListeners();
  noble.waitForPoweredOnAsync.mockReset().mockResolvedValue(undefined);
  noble.startScanningAsync.mockReset().mockResolvedValue(undefined);
  noble.stopScanningAsync.mockReset().mockResolvedValue(undefined);
});

describe('getAdvertisement', () => {
  it('returns a matching device advertisement and stops scanning', async () => {
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

  it('returns null when no device matches before timeout', async () => {
    await expect(getAdvertisement(meter)).resolves.toBeNull();
    expect(noble.stopScanningAsync).toHaveBeenCalledOnce();
  });

  it('propagates scan startup failures', async () => {
    noble.startScanningAsync.mockRejectedValue(new Error('scan failed'));
    await expect(getAdvertisement(meter)).rejects.toThrow('scan failed');
    expect(noble.stopScanningAsync).not.toHaveBeenCalled();
  });
});
