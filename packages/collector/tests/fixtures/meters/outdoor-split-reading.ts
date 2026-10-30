// Supply split outdoor advertisements when verifying a complete collector reading.
import { METER_TYPES } from '@wx/shared';

import { type Advertisement, type Meter, SWITCHBOT_UUIDS } from '#types.ts';

export const outdoorReading = {
  meter: {
    type: METER_TYPES.OUTDOOR,
    deviceName: 'outdoor meter',
    deviceId: 'outdoor-device',
    address: 'cc:dd',
  },
  advertisements: [
    {
      deviceId: 'outdoor-device',
      address: 'cc:dd',
      manufacturerData: Buffer.from([0x69, 0x09, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0x99, 70]),
      serviceData: [],
      signalPowerDBM: -50,
    },
    {
      deviceId: 'outdoor-device',
      address: 'cc:dd',
      manufacturerData: undefined,
      serviceData: [{ uuid: SWITCHBOT_UUIDS.METER_SERVICE, data: Buffer.from([0x77, 0, 90]) }],
      signalPowerDBM: -50,
    },
  ],
} satisfies { meter: Meter; advertisements: Advertisement[] };
