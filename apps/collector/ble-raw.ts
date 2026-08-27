import { setTimeout as delay } from 'node:timers/promises';
import noble, { type AdapterState, type Peripheral } from '@stoprocent/noble';

const devices = new Set<string>();
const packets = new Set<string>();

function formatServiceData(
  serviceData: Peripheral['advertisement']['serviceData'] = [],
) {
  return serviceData.map((item) => ({
    uuid: item.uuid,
    data: item.data?.toString('hex'),
  }));
}

noble.on('stateChange', (state) => {
  console.log('Stato Bluetooth:', state);
});

noble.on('discover', (peripheral) => {
  const { id, address, rssi, connectable, advertisement } = peripheral;

  const manufacturerData =
    advertisement.manufacturerData?.toString('hex') ?? null;

  const serviceData = formatServiceData(advertisement.serviceData);

  const signature = JSON.stringify({
    id,
    manufacturerData,
    serviceData,
  });

  if (packets.has(signature)) {
    return;
  }

  packets.add(signature);
  devices.add(id);

  console.dir(
    {
      id,
      address,
      rssi,
      connectable,
      name: advertisement.localName,
      manufacturerData,
      serviceData,
    },
    {
      depth: null,
      colors: true,
    },
  );
});

async function waitForBluetooth() {
  if (noble.state === 'poweredOn') {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const handler = (state: AdapterState) => {
      if (state === 'poweredOn') {
        noble.off('stateChange', handler);
        resolve();
      }

      if (state === 'unauthorized' || state === 'unsupported') {
        noble.off('stateChange', handler);
        reject(new Error(`Bluetooth non disponibile: ${state}`));
      }
    };

    noble.on('stateChange', handler);
  });
}

try {
  await waitForBluetooth();

  console.log('Scansione BLE grezza per 30 secondi...');

  noble.startScanning([], true);

  await delay(30_000);

  noble.stopScanning();

  console.log(`Dispositivi BLE rilevati: ${devices.size}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  noble.removeAllListeners();
}
