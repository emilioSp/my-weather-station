import { z } from 'zod';

const environmentSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const viteEnvironment = environmentSchema.parse(import.meta.env);

export const environment = {
  SUPABASE_URL: viteEnvironment.VITE_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: viteEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY,
};
