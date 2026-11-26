// Validate PostgreSQL environment variables for the API and collector at startup.
import { z } from 'zod';

export const postgresEnvironmentSchema = z.object({
  POSTGRES_HOST: z.string().trim().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive().max(65535),
  POSTGRES_DB: z.string().trim().min(1),
  POSTGRES_USER: z.string().trim().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
});
