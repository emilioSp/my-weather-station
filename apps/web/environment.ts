import { z } from 'zod';

const environmentSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
});

type Environment = z.infer<typeof environmentSchema>;

export const environment: Environment = environmentSchema.parse(
  import.meta.env,
);
