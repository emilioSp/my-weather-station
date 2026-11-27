// Normalize caught failures before returning weather API query results.
export const toWeatherApiError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error('Weather API request failed');
