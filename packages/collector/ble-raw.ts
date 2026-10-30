// Inspect raw BLE advertisements when diagnosing meter discovery and signal data.

import { on } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

import noble, { type AdapterState, type Peripheral } from '@stoprocent/noble';

const formatServiceData = (serviceData: Peripheral['advertisement']['serviceData'] = []) =>
  serviceData.map((item) => ({ uuid: item.uuid, data: item.data?.toString('hex') }));

class BleDiscoveryLog {
  private readonly devices = new Set<string>();
  private readonly packets = new Set<string>();

  public record(peripheral: Peripheral): void {
    const { id, address, rssi, connectable, advertisement } = peripheral;
    const manufacturerData = advertisement.manufacturerData?.toString('hex') ?? null;
    const serviceData = formatServiceData(advertisement.serviceData);
    const signature = JSON.stringify({ id, manufacturerData, serviceData });

    if (this.packets.has(signature)) return;

    this.packets.add(signature);
    this.devices.add(id);

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
      { depth: null, colors: true },
    );
  }

  public getDeviceCount(): number {
    return this.devices.size;
  }
}

const discoveryLog = new BleDiscoveryLog();

noble.on('stateChange', (state) => {
  console.log('Stato Bluetooth:', state);
});

noble.on('discover', (peripheral) => discoveryLog.record(peripheral));

function assertBluetoothAvailable(state: AdapterState): void {
  if (state === 'unauthorized' || state === 'unsupported') {
    throw new Error(`Bluetooth non disponibile: ${state}`);
  }
}

const waitForBluetooth = async (): Promise<void> => {
  if (noble.state === 'poweredOn') return;

  // JUSTIFICATION: Noble emits one AdapterState per stateChange event; node:events.on loses that type.
  const states = on(noble, 'stateChange') as AsyncIterable<[AdapterState]>;

  for await (const [state] of states) {
    if (state === 'poweredOn') return;
    assertBluetoothAvailable(state);
  }
};

try {
  await waitForBluetooth();
  console.log('Scansione BLE grezza per 30 secondi...');
  await noble.startScanningAsync([], true);
  await delay(30_000);
  await noble.stopScanningAsync();
  console.log(`Dispositivi BLE rilevati: ${discoveryLog.getDeviceCount()}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  noble.removeAllListeners();
}
