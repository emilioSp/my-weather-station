import { on } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import noble, { type Peripheral } from '@stoprocent/noble';
import { environment } from '#environment.ts';
import { type Advertisement, advertisementSchema, type Meter } from '#types.ts';

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

const findPeripheral = async (meter: Meter): Promise<Peripheral | null> => {
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
      if (
        peripheral.id.toLowerCase() === meter.deviceId ||
        peripheral.address.toLowerCase() === meter.address
      ) {
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
  meter: Meter,
): Promise<Advertisement | null> => {
  const peripheral = await findPeripheral(meter);
  if (!peripheral) return null;

  return advertisementSchema.parse({
    deviceId: peripheral.id,
    address: peripheral.address,
    manufacturerData: peripheral.advertisement.manufacturerData,
    serviceData: peripheral.advertisement.serviceData,
    signalPowerDBM: peripheral.rssi,
  });
};
