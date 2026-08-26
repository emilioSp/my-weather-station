import { z } from 'zod';

const serviceDataSchema = z.object({
  uuid: z.string(),
  data: z.instanceof(Buffer),
});

const deviceIdentifiersSchema = z
  .object({
    deviceId: z
      .string()
      .transform((deviceId) => deviceId.toLowerCase())
      .nullable()
      .default(null),
    address: z
      .string()
      .transform((address) => address.toLowerCase())
      .nullable()
      .default(null),
  })
  .refine(({ deviceId, address }) => deviceId !== null || address !== null, {
    message: 'A device ID or address is required',
  });

export const advertisementSchema = z
  .object({
    manufacturerData: z.instanceof(Buffer).optional(),
    serviceData: z.array(serviceDataSchema),
    signalPowerDBM: z.number(),
  })
  .and(deviceIdentifiersSchema);

export type Advertisement = z.infer<typeof advertisementSchema>;

export const weatherReadingSchema = z.object({
  temperature: z.number(),
  dewPoint: z.number(),
  heatIndex: z.number(),
  humidity: z.number(),
  battery: z.number(),
  signalPowerDBM: z.number(),
});

export type WeatherReading = z.infer<typeof weatherReadingSchema>;

const meterTypeSchema = z.enum(['outdoor', 'indoor']);

export const meterSchema = z
  .object({
    type: meterTypeSchema,
  })
  .and(deviceIdentifiersSchema);

export type Meter = z.infer<typeof meterSchema>;

export const measureSchema = weatherReadingSchema
  .extend({
    id: z.uuid(),
    deviceType: meterTypeSchema,
    measuredAt: z.string(),
  })
  .and(deviceIdentifiersSchema);

export type Measure = z.infer<typeof measureSchema>;

export type MeterInterface = {
  getMeter: () => Meter;
  read: () => Promise<Measure>;
};
