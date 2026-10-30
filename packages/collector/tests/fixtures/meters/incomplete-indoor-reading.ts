// Supply an incomplete indoor advertisement when verifying scan exhaustion.
import { METER_TYPES } from '@wx/shared';

import { type Advertisement, type Meter, SWITCHBOT_UUIDS } from '#types.ts';

export const incompleteIndoorReading = {
  meter: {
    type: METER_TYPES.INDOOR,
    deviceName: 'indoor meter',
    deviceId: 'indoor-device',
    address: 'aa:bb',
  },
  advertisement: {
    deviceId: 'indoor-device',
    address: 'aa:bb',
    manufacturerData: undefined,
    serviceData: [{ uuid: SWITCHBOT_UUIDS.METER_SERVICE, data: Buffer.from([0x54]) }],
    signalPowerDBM: -50,
  },
} satisfies { meter: Meter; advertisement: Advertisement };
