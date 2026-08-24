import noble, { type Peripheral } from '@stoprocent/noble';

type IndoorMeterReading = {
  temperature: number;
  humidity: number;
  battery: number;
  signalPowerDBM: number;
};

const DEVICE_ID = 'f2c1f72ae2258e5affbe6f8e7bc147b3';
const TIMEOUT_MS = Number.parseInt(process.env.BLE_TIMEOUT_MS ?? '120000', 10);
const SCAN_RESTART_MS = 15000;

if (!Number.isFinite(TIMEOUT_MS) || TIMEOUT_MS <= 0) {
  throw new Error('BLE_TIMEOUT_MS must be a positive number of milliseconds');
}

function normalizeUuid(uuid = ''): string {
  return String(uuid).toLowerCase().replaceAll('-', '');
}

function decodeServiceData(
  serviceData: Peripheral['advertisement']['serviceData'] = [],
): Omit<IndoorMeterReading, 'signalPowerDBM'> | null {
  const data = serviceData.find(
    ({ uuid, data }) =>
      normalizeUuid(uuid) === 'fd3d' &&
      data.length >= 6 &&
      (data[0] & 0x7f) === 0x54,
  )?.data;

  if (!data) return null;

  const temperatureDecimal = (data[3] & 0x0f) / 10;
  const temperatureInteger = data[4] & 0x7f;
  const temperatureSign = data[4] & 0x80 ? 1 : -1;

  return {
    temperature: Number(
      ((temperatureInteger + temperatureDecimal) * temperatureSign).toFixed(1),
    ),
    humidity: data[5] & 0x7f,
    battery: data[2] & 0x7f,
  };
}

async function readIndoorMeter(): Promise<IndoorMeterReading> {
  await noble.waitForPoweredOnAsync();

  return new Promise<IndoorMeterReading>((resolve, reject) => {
    let finished = false;
    let restarting = false;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    let restartTimer: ReturnType<typeof setInterval> | undefined;
    let onDiscover: (peripheral: Peripheral) => void;

    const finish = (reading?: IndoorMeterReading, error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutTimer);
      clearInterval(restartTimer);
      noble.off('discover', onDiscover);
      void noble.stopScanningAsync().catch(() => {});

      if (error) {
        reject(error);
      } else if (reading) {
        resolve(reading);
      }
    };

    onDiscover = (peripheral) => {
      if (peripheral.id.toLowerCase() !== DEVICE_ID) return;

      const measurements = decodeServiceData(
        peripheral.advertisement.serviceData,
      );

      if (!measurements) return;

      finish({
        signalPowerDBM: peripheral.rssi,
        ...measurements,
      });
    };

    const restartScan = async () => {
      if (finished || restarting) return;
      restarting = true;

      try {
        await noble.stopScanningAsync();
        if (!finished) await noble.startScanningAsync([], true);
      } catch (error: unknown) {
        finish(
          undefined,
          error instanceof Error ? error : new Error(String(error)),
        );
      } finally {
        restarting = false;
      }
    };

    noble.on('discover', onDiscover);
    timeoutTimer = setTimeout(() => {
      finish(
        undefined,
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
        finish(
          undefined,
          error instanceof Error ? error : new Error(String(error)),
        );
      });
  });
}

let exitCode = 0;

try {
  const reading = await readIndoorMeter();
  console.log(JSON.stringify([{ deviceId: DEVICE_ID, ...reading }], null, 2));
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  exitCode = 1;
}

// noble keeps the Bluetooth adapter handle open after scanning stops.
process.exit(exitCode);
