// Verify diagnostic scanning and adapter failures without requiring BLE hardware.
import type { AdapterState } from '@stoprocent/noble';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { repeatedAdvertisement } from '#tests/fixtures/ble/repeated-advertisement.ts';

const noble = await vi.hoisted(async () => {
  const { EventEmitter } = await import('node:events');

  return Object.assign(new EventEmitter(), {
    // JUSTIFICATION: Tests change this mock to other valid Noble adapter states after initialization.
    state: 'poweredOn' as AdapterState,
    startScanningAsync: vi.fn<() => Promise<void>>(),
    stopScanningAsync: vi.fn<() => Promise<void>>(),
  });
});

const delay = vi.hoisted(() => vi.fn<(milliseconds: number) => Promise<void>>());

vi.mock('@stoprocent/noble', () => ({ default: noble }));

vi.mock('node:timers/promises', () => ({ setTimeout: delay }));

const originalExitCode = process.exitCode;

afterEach(() => {
  noble.removeAllListeners();
  vi.resetAllMocks();
  vi.restoreAllMocks();
  process.exitCode = originalExitCode;
});

describe('BLE diagnostics', () => {
  it('given repeated advertisements when scanning then logs one packet and one discovered device', async () => {
    vi.resetModules();
    noble.state = 'poweredOn';
    noble.startScanningAsync.mockImplementation(async () => {
      noble.emit('discover', repeatedAdvertisement);
      noble.emit('discover', repeatedAdvertisement);
    });
    noble.stopScanningAsync.mockResolvedValue(undefined);
    delay.mockResolvedValue(undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const details = vi.spyOn(console, 'dir').mockImplementation(() => {});

    await import('#ble-raw.ts');

    expect(details).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith('Dispositivi BLE rilevati: 1');
    expect(delay).toHaveBeenCalledWith(30_000);
    expect(noble.stopScanningAsync).toHaveBeenCalledOnce();
    expect(noble.listenerCount('discover')).toBe(0);
  });

  it('given a powered off adapter when it becomes powered on then starts and stops scanning', async () => {
    vi.resetModules();
    noble.state = 'poweredOff';
    noble.startScanningAsync.mockResolvedValue(undefined);
    noble.stopScanningAsync.mockResolvedValue(undefined);
    delay.mockResolvedValue(undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const diagnostics = import('#ble-raw.ts');
    await vi.waitFor(() => expect(noble.listenerCount('stateChange')).toBe(2));
    noble.emit('stateChange', 'poweredOn');
    await diagnostics;

    expect(noble.startScanningAsync).toHaveBeenCalledWith([], true);
    expect(noble.stopScanningAsync).toHaveBeenCalledOnce();
    expect(noble.listenerCount('stateChange')).toBe(0);
  });

  it('given a powered off adapter when access is denied then reports the error without scanning', async () => {
    vi.resetModules();
    noble.state = 'poweredOff';
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

    const diagnostics = import('#ble-raw.ts');
    await vi.waitFor(() => expect(noble.listenerCount('stateChange')).toBe(2));
    noble.emit('stateChange', 'unauthorized');
    await diagnostics;

    expect(errors).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Bluetooth non disponibile: unauthorized' }),
    );
    expect(noble.startScanningAsync).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(noble.listenerCount('stateChange')).toBe(0);
  });
});
