// Define the query parameters accepted by the temporary hello-world endpoint.
import { z } from 'zod';

export const helloWorldQuerySchema = z.object({
  name: z.string().min(1).max(20).optional(),
});
