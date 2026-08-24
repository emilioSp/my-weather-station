import { on } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import noble, {
  type Peripheral,
  type PeripheralAdvertisement,
} from '@stoprocent/noble';
import { z } from 'zod';
import { normalizeUuid } from './src/crawler/normalizeUuid.util.ts';

type WeatherReading = {
  temperature: number;
  humidity: number;
  battery: number;
  signalPowerDBM: number;
};

type Measurements = Pick<WeatherReading, 'temperature' | 'humidity'>;

type DecodeManufacturerDataInput = {
  data: Buffer | undefined;
};

type DecodeBatteryLevelInput = {
  serviceData: PeripheralAdvertisement['serviceData'];
};

type BuildWeatherReadingInput = {
  reading: Partial<WeatherReading>;
};

type UpdateWeatherReadingInput = {
  deviceId: string;
  peripheral: Peripheral;
  reading: Partial<WeatherReading>;
};

type ScanForWeatherReadingInput = {
  deviceId: string;
  durationMs: number;
  reading: Partial<WeatherReading>;
};

type ReadWeatherInput = {
  deviceId: string;
  timeoutMs: number;
};

type EndScanWindowInput = {
  abortController: AbortController;
  durationMs: number;
};

type IsAbortErrorInput = {
  error: unknown;
};

const environmentSchema = z.object({
  DEVICE_ID: z
    .string()
    .trim()
    .min(1)
    .transform((deviceId) => deviceId.toLowerCase()),
  BLE_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
});

type Environment = z.infer<typeof environmentSchema>;

const environment: Environment = environmentSchema.parse(process.env);
const DEVICE_ID = environment.DEVICE_ID;
const TIMEOUT_MS = environment.BLE_TIMEOUT_MS;
const SCAN_RESTART_MS = 15000;

const decodeManufacturerData = ({
  data,
}: DecodeManufacturerDataInput): Measurements | null => {
  if (
    !data ||
    data.length < 13 ||
    data[0] !== 0x69 ||
    data[1] !== 0x09 ||
    data[2] !== 0xd1
  ) {
    return null;
  }

  const temperatureDecimal = (data[10] & 0x0f) / 10;
  const temperatureInteger = data[11] & 0x7f;
  const temperatureSign = data[11] & 0x80 ? 1 : -1;

  return {
    temperature: Number(
      ((temperatureInteger + temperatureDecimal) * temperatureSign).toFixed(1),
    ),
    humidity: data[12] & 0x7f,
  };
};

const decodeBatteryLevel = ({
  serviceData,
}: DecodeBatteryLevelInput): number | null => {
  const batteryData = serviceData.find(
    ({ uuid, data }) =>
      normalizeUuid(uuid) === 'fd3d' && data.length >= 3 && data[0] === 0x77,
  )?.data;

  return batteryData ? batteryData[2] & 0x7f : null;
};

const buildWeatherReading = ({
  reading,
}: BuildWeatherReadingInput): WeatherReading | null => {
  const { temperature, humidity, battery, signalPowerDBM } = reading;

  if (
    temperature === undefined ||
    humidity === undefined ||
    battery === undefined ||
    signalPowerDBM === undefined
  ) {
    return null;
  }

  return { temperature, humidity, battery, signalPowerDBM };
};

const updateWeatherReading = ({
  deviceId,
  peripheral,
  reading,
}: UpdateWeatherReadingInput): WeatherReading | null => {
  if (peripheral.id.toLowerCase() !== deviceId) return null;

  const { advertisement } = peripheral;
  const measurements = decodeManufacturerData({
    data: advertisement.manufacturerData,
  });
  const battery = decodeBatteryLevel({
    serviceData: advertisement.serviceData,
  });

  reading.signalPowerDBM = peripheral.rssi;
  if (measurements) Object.assign(reading, measurements);
  if (battery !== null) reading.battery = battery;

  return buildWeatherReading({ reading });
};

const isAbortError = ({ error }: IsAbortErrorInput): boolean => {
  return error instanceof Error && error.name === 'AbortError';
};

const endScanWindow = async ({
  abortController,
  durationMs,
}: EndScanWindowInput): Promise<void> => {
  try {
    await delay(durationMs, undefined, { signal: abortController.signal });
    abortController.abort();
  } catch (error: unknown) {
    if (!isAbortError({ error })) throw error;
  }
};

const stopScanning = async (): Promise<void> => {
  try {
    await noble.stopScanningAsync();
  } catch {}
};

const scanForWeatherReading = async ({
  deviceId,
  durationMs,
  reading,
}: ScanForWeatherReadingInput): Promise<WeatherReading | null> => {
  const abortController = new AbortController();
  const peripheralEvents = on(noble, 'discover', {
    signal: abortController.signal,
  }) as AsyncIterable<[Peripheral]>;
  const endScanWindowPromise = endScanWindow({
    abortController,
    durationMs,
  });
  let scanningStarted = false;

  try {
    await noble.startScanningAsync([], true);
    scanningStarted = true;

    for await (const [peripheral] of peripheralEvents) {
      const completeReading = updateWeatherReading({
        deviceId,
        peripheral,
        reading,
      });
      if (completeReading) return completeReading;
    }
  } catch (error: unknown) {
    if (!isAbortError({ error })) throw error;
  } finally {
    abortController.abort();
    await endScanWindowPromise;
    if (scanningStarted) await stopScanning();
  }

  return null;
};

const readWeather = async ({
  deviceId,
  timeoutMs,
}: ReadWeatherInput): Promise<WeatherReading> => {
  await noble.waitForPoweredOnAsync();

  const deadline = Date.now() + timeoutMs;
  const reading: Partial<WeatherReading> = {};

  while (Date.now() < deadline) {
    const durationMs = Math.min(SCAN_RESTART_MS, deadline - Date.now());
    const completeReading = await scanForWeatherReading({
      deviceId,
      durationMs,
      reading,
    });
    if (completeReading) return completeReading;
  }

  throw new Error(
    `No complete reading from ${deviceId} within ${timeoutMs} ms. ` +
      'Move the Bluetooth adapter closer to the thermometer.',
  );
};

const run = async (): Promise<void> => {
  const reading = await readWeather({
    deviceId: DEVICE_ID,
    timeoutMs: TIMEOUT_MS,
  });
  console.log(JSON.stringify([{ deviceId: DEVICE_ID, ...reading }], null, 2));
};

try {
  await run();
  process.exit(0);
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
