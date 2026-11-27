// Define validated domain schemas and types used by this workspace.

import { z } from 'zod';

export const METER_TYPES = {
  OUTDOOR: 'outdoor',
  INDOOR: 'indoor',
} as const;

export const meterTypeSchema = z.enum(METER_TYPES);

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

export const measurementSchema = z.object({
  id: z.uuid(),
  device_id: z.string().nullable(),
  device_type: meterTypeSchema,
  device_name: z.string(),
  address: z.string().nullable(),
  measured_at: z.string(),
  temperature: z.number(),
  humidity: z.number(),
  dew_point: z.number(),
  heat_index: z.number(),
  battery: z.number(),
  signal_power_dbm: z.number(),
});

export type Measurement = z.infer<typeof measurementSchema>;
