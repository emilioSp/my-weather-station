// Supply repeated BLE packets when checking raw diagnostic deduplication.
import { SWITCHBOT_UUIDS } from '#types.ts';

export const repeatedAdvertisement = {
  id: 'device-id',
  address: 'aa:bb',
  rssi: -50,
  connectable: false,
  advertisement: {
    localName: 'meter',
    manufacturerData: Buffer.from([1]),
    serviceData: [{ uuid: SWITCHBOT_UUIDS.METER_SERVICE, data: Buffer.from([2]) }],
  },
};
