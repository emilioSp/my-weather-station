// Send HTTP requests to the Node.js weather API and report server errors to callers.
import { z } from 'zod';

import { environment } from '#environment.ts';

const errorResponseSchema = z.object({ error: z.object({ message: z.string() }) });

type MeasurementRequest = {
  endpoint: string;
  query: Record<string, string>;
};

export const requestWeatherApi = async <T>({ endpoint, query }: MeasurementRequest): Promise<T> => {
  const url = new URL(endpoint, environment.API_BASE_URL);
  url.search = new URLSearchParams(query).toString();
  const response = await fetch(url);

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const error = errorResponseSchema.safeParse(body);
    throw new Error(error.data?.error.message ?? `Request failed (HTTP ${response.status})`);
  }

  return response.json();
};
