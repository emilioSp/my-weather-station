import { z } from 'zod';

export const meterTypeSchema = z.enum(['outdoor', 'indoor']);

export type MeterType = z.infer<typeof meterTypeSchema>;

export const deviceIdentifiersSchema = z
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

export type DeviceIdentifiers = z.infer<typeof deviceIdentifiersSchema>;

export const weatherReadingSchema = z.object({
  temperature: z.number(),
  dewPoint: z.number(),
  heatIndex: z.number(),
  humidity: z.number(),
  battery: z.number(),
  signalPowerDBM: z.number(),
});

export type WeatherReading = z.infer<typeof weatherReadingSchema>;

export const measureSchema = weatherReadingSchema
  .extend({
    id: z.uuid(),
    deviceType: meterTypeSchema,
    measuredAt: z.string(),
  })
  .and(deviceIdentifiersSchema);

export type Measure = z.infer<typeof measureSchema>;
