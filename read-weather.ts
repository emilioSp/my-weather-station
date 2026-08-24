import noble, { type Peripheral } from '@stoprocent/noble';

type WeatherReading = {
  temperature: number;
  humidity: number;
  battery: number;
  signalPowerDBM: number;
};

const DEVICE_ID = process.env.DEVICE_ID?.trim().toLowerCase();
const TIMEOUT_MS = Number.parseInt(process.env.BLE_TIMEOUT_MS ?? '120000', 10);
const SCAN_RESTART_MS = 15000;

if (!DEVICE_ID) {
  throw new Error('DEVICE_ID is required in .env');
}

if (!Number.isFinite(TIMEOUT_MS) || TIMEOUT_MS <= 0) {
  throw new Error('BLE_TIMEOUT_MS must be a positive number of milliseconds');
}

function normalizeUuid(uuid = ''): string {
  return String(uuid).toLowerCase().replaceAll('-', '');
}

function decodeManufacturerData(
  data: Buffer | undefined,
): Pick<WeatherReading, 'temperature' | 'humidity'> | null {
  // SwitchBot Outdoor Meter W3400010 advertisement layout.
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
}

function decodeBatteryLevel(
  serviceData: Peripheral['advertisement']['serviceData'] = [],
): number | null {
  const batteryData = serviceData.find(
    ({ uuid, data }) =>
      normalizeUuid(uuid) === 'fd3d' && data.length >= 3 && data[0] === 0x77,
  )?.data;

  return batteryData ? batteryData[2] & 0x7f : null;
}

async function readWeather(): Promise<WeatherReading> {
  await noble.waitForPoweredOnAsync();

  return new Promise<WeatherReading>((resolve, reject) => {
    let finished = false;
    let restarting = false;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    let restartTimer: ReturnType<typeof setInterval> | undefined;
    const reading: Partial<WeatherReading> = {};
    let onDiscover: (peripheral: Peripheral) => void;

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutTimer);
      clearInterval(restartTimer);
      noble.off('discover', onDiscover);
      void noble.stopScanningAsync().catch(() => {});

      if (error) {
        reject(error);
      } else {
        resolve(reading as WeatherReading);
      }
    };

    onDiscover = (peripheral) => {
      if (peripheral.id.toLowerCase() !== DEVICE_ID) return;

      const advertisement = peripheral.advertisement;
      const measurements = decodeManufacturerData(
        advertisement.manufacturerData,
      );
      const battery = decodeBatteryLevel(advertisement.serviceData);

      reading.signalPowerDBM = peripheral.rssi;
      if (measurements) Object.assign(reading, measurements);
      if (battery !== null) reading.battery = battery;

      if (
        reading.temperature !== undefined &&
        reading.humidity !== undefined &&
        reading.battery !== undefined &&
        reading.signalPowerDBM !== undefined
      ) {
        finish();
      }
    };

    const restartScan = async () => {
      if (finished || restarting) return;
      restarting = true;

      try {
        await noble.stopScanningAsync();
        if (!finished) await noble.startScanningAsync([], true);
      } catch (error: unknown) {
        finish(error instanceof Error ? error : new Error(String(error)));
      } finally {
        restarting = false;
      }
    };

    noble.on('discover', onDiscover);
    timeoutTimer = setTimeout(() => {
      finish(
        new Error(
          `No complete reading from ${DEVICE_ID} within ${TIMEOUT_MS} ms. ` +
            'Move the Bluetooth adapter closer to the thermometer.',
        ),
      );
    }, TIMEOUT_MS);

    noble
      .startScanningAsync([], true)
      .then(() => {
        if (!finished) {
          restartTimer = setInterval(() => void restartScan(), SCAN_RESTART_MS);
        }
      })
      .catch((error: unknown) => {
        finish(error instanceof Error ? error : new Error(String(error)));
      });
  });
}

let exitCode = 0;

try {
  const reading = await readWeather();
  console.log(JSON.stringify([{ deviceId: DEVICE_ID, ...reading }], null, 2));
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  exitCode = 1;
}

// noble keeps the Bluetooth adapter handle open after scanning stops.
process.exit(exitCode);
