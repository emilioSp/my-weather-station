import type { IconType } from 'react-icons';
import { FaBed, FaCouch, FaKitchenSet, FaSeedling } from 'react-icons/fa6';
import { z } from 'zod';

export const deviceIconMap = {
  FaSeedling,
  FaKitchenSet,
  FaCouch,
  FaBed,
} as const satisfies Record<string, IconType>;

export type DeviceIconName = keyof typeof deviceIconMap;

const deviceIconNames = Object.keys(deviceIconMap) as [
  DeviceIconName,
  ...DeviceIconName[],
];

const deviceSchema = z.object({
  deviceName: z.string().trim().min(1),
  icon: z.enum(deviceIconNames),
});

const devicesSchema = z
  .string()
  .transform((value, context) => {
    try {
      return JSON.parse(value);
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'VITE_DEVICES must be valid JSON',
      });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(deviceSchema)
      .min(1)
      .refine(
        (devices) =>
          new Set(devices.map(({ deviceName }) => deviceName)).size ===
          devices.length,
        { message: 'VITE_DEVICES must contain unique device names' },
      ),
  );

export const environmentSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_DEVICES: devicesSchema,
});

export type DeviceConfiguration = z.infer<typeof deviceSchema>;

const viteEnvironment = environmentSchema.parse(import.meta.env);

export const environment = {
  SUPABASE_URL: viteEnvironment.VITE_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: viteEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY,
  DEVICES: viteEnvironment.VITE_DEVICES,
};
