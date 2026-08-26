import { on } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import noble, { type Peripheral } from '@stoprocent/noble';
import { environment } from '../environment.ts';
import { type Advertisement, advertisementSchema } from '../types.ts';

type IsAbortErrorInput = {
  error: unknown;
};

const isAbortError = ({ error }: IsAbortErrorInput): boolean => {
  return error instanceof Error && error.name === 'AbortError';
};

type AbortScanAfterTimeoutInput = {
  abortController: AbortController;
};

const abortScanAfterTimeout = async ({
  abortController,
}: AbortScanAfterTimeoutInput): Promise<void> => {
  try {
    await delay(environment.BLE_TIMEOUT_MS, undefined, {
      signal: abortController.signal,
    });
    abortController.abort();
  } catch (error: unknown) {
    if (!isAbortError({ error })) throw error;
  }
};

const findPeripheral = async (deviceId: string): Promise<Peripheral | null> => {
  await noble.waitForPoweredOnAsync();

  const abortController = new AbortController();
  const peripheralEvents = on(noble, 'discover', {
    signal: abortController.signal,
  }) as AsyncIterable<[Peripheral]>;

  try {
    await noble.startScanningAsync([], true);
  } catch (error: unknown) {
    abortController.abort();
    throw error;
  }

  const scanTimeout = abortScanAfterTimeout({ abortController });

  try {
    for await (const [peripheral] of peripheralEvents) {
      if (peripheral.id.toLowerCase() === deviceId) {
        abortController.abort();
        return peripheral;
      }
    }
  } catch (error: unknown) {
    if (!isAbortError({ error })) throw error;
  } finally {
    await scanTimeout;
    await noble.stopScanningAsync();
  }

  return null;
};

export const getAdvertisement = async (
  deviceId: string,
): Promise<Advertisement | null> => {
  const peripheral = await findPeripheral(deviceId);
  if (!peripheral) return null;

  return advertisementSchema.parse({
    manufacturerData: peripheral.advertisement.manufacturerData,
    serviceData: peripheral.advertisement.serviceData,
    signalPowerDBM: peripheral.rssi,
  });
};
