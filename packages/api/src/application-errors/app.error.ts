// Represent expected application failures handled by the central HTTP error manager.
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { $ZodError } from 'zod/v4/core';

export const appErrorCode = 'APP_ERROR';

export type AppErrorOptions = {
  message: string;
  context?: Record<string, unknown>;
  error?: $ZodError;
};

export class AppError extends Error {
  readonly code: string = appErrorCode;
  readonly status: ContentfulStatusCode = 500;
  readonly context?: Record<string, unknown>;
  readonly details?: Array<{ field: string; message: string }>;

  constructor({ message, error, context }: AppErrorOptions) {
    super(message);
    this.context = context;
    this.details = error?.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  }
}
