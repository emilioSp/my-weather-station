// Supply a complete indoor advertisement when verifying collector decoding.
import { METER_TYPES } from '@wx/shared';

import { type Advertisement, type Meter } from '#types.ts';

export const indoorReading = {
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
    serviceData: [{ uuid: 'FD3D', data: Buffer.from([0x54, 0, 80, 5, 0x94, 60]) }],
    signalPowerDBM: -50,
  },
} satisfies { meter: Meter; advertisement: Advertisement };
