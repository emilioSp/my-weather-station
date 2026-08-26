import { z } from 'zod';
import { meterSchema } from './types.ts';

const devicesSchema = z
  .string()
  .transform((value, context) => {
    try {
      return JSON.parse(value);
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'DEVICES must be valid JSON',
      });
      return z.NEVER;
    }
  })
  .pipe(z.array(meterSchema).min(1));

const environmentSchema = z.object({
  DEVICES: devicesSchema,
  BLE_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  SCAN_RETRIES: z.coerce.number().int().positive().default(8),
  POSTGRES_HOST: z.string().trim().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive().max(65535),
  POSTGRES_DB: z.string().trim().min(1),
  POSTGRES_USER: z.string().trim().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
});

type Environment = z.infer<typeof environmentSchema>;

export const environment: Environment = environmentSchema.parse(process.env);
