// Define validated domain schemas and types used by this workspace.

import { deviceIdentifiersSchema, type Measure, meterTypeSchema } from '@wx/shared';
import { z } from 'zod';

export const SWITCHBOT_UUIDS = {
  METER_SERVICE: 'fd3d',
} as const;

const serviceDataSchema = z.object({
  uuid: z.string(),
  data: z.instanceof(Buffer),
});

export const advertisementSchema = z
  .object({
    manufacturerData: z.instanceof(Buffer).optional(),
    serviceData: z.array(serviceDataSchema),
    signalPowerDBM: z.number(),
  })
  .and(deviceIdentifiersSchema);

export type Advertisement = z.infer<typeof advertisementSchema>;

export const meterSchema = z
  .object({
    type: meterTypeSchema,
    deviceName: z.string().trim().min(1),
  })
  .and(deviceIdentifiersSchema);

type ParsedMeter = z.infer<typeof meterSchema>;

export type Meter = Omit<ParsedMeter, 'deviceName'> & {
  deviceName?: ParsedMeter['deviceName'];
};

export type MeterInterface = {
  getMeter: () => Meter;
  read: () => Promise<Measure>;
};
