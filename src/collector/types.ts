import { z } from 'zod';

const serviceDataSchema = z.object({
  uuid: z.string(),
  data: z.instanceof(Buffer),
});

export const advertisementSchema = z.object({
  manufacturerData: z.instanceof(Buffer).optional(),
  serviceData: z.array(serviceDataSchema),
  signalPowerDBM: z.number(),
});

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

export const meterSchema = z.object({
  type: meterTypeSchema,
  deviceId: z
    .string()
    .trim()
    .min(1)
    .transform((deviceId) => deviceId.toLowerCase()),
});

export type Meter = z.infer<typeof meterSchema>;

export const measureSchema = weatherReadingSchema.extend({
  id: z.uuid(),
  deviceId: z.string(),
  deviceType: meterTypeSchema,
  measuredAt: z.string(),
});

export type Measure = z.infer<typeof measureSchema>;

export type MeterInterface = {
  getMeter: () => Meter;
  read: () => Promise<Measure>;
};
