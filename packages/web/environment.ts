// Validate Vite configuration and resolve device icons at web app startup.
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

// JUSTIFICATION: This non-empty local object has only DeviceIconName keys; Object.keys loses their literal types.
const deviceIconNames = Object.keys(deviceIconMap) as [DeviceIconName, ...DeviceIconName[]];

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
        (devices) => new Set(devices.map(({ deviceName }) => deviceName)).size === devices.length,
        { message: 'VITE_DEVICES must contain unique device names' },
      ),
  );

export const environmentSchema = z.object({
  VITE_API_BASE_URL: z.url({ protocol: /^https?$/ }),
  VITE_DEVICES: devicesSchema,
});

export type DeviceConfiguration = z.infer<typeof deviceSchema>;

const viteEnvironment = environmentSchema.parse(import.meta.env);

export const environment = {
  API_BASE_URL: viteEnvironment.VITE_API_BASE_URL,
  DEVICES: viteEnvironment.VITE_DEVICES,
};
