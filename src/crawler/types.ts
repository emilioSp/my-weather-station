import { z } from 'zod';

const serviceDataSchema = z.object({
  uuid: z.string(),
  data: z.instanceof(Buffer),
});

export const meterAdvertisementSchema = z.object({
  manufacturerData: z.instanceof(Buffer).optional(),
  serviceData: z.array(serviceDataSchema),
  signalPowerDBM: z.number(),
});

export type MeterAdvertisement = z.infer<typeof meterAdvertisementSchema>;

export const weatherReadingSchema = z.object({
  temperature: z.number(),
  humidity: z.number(),
  battery: z.number(),
  signalPowerDBM: z.number(),
});

export type WeatherReading = z.infer<typeof weatherReadingSchema>;

export const meterSchema = z.object({
  type: z.enum(['outdoor', 'indoor']),
  deviceId: z
    .string()
    .trim()
    .min(1)
    .transform((deviceId) => deviceId.toLowerCase()),
});

export type Meter = z.infer<typeof meterSchema>;

export type MeterInterface = {
  getMeter: () => Meter;
  read: () => Promise<WeatherReading>;
};
