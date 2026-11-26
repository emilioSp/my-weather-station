// Log HTTP failures and return structured error responses without exposing unexpected error details.
import { STATUS_CODES } from 'node:http';

import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { AppError } from '#application-errors/app.error.ts';
import { badRequestErrorCode } from '#application-errors/bad-request.error.ts';
import { notFoundErrorCode } from '#application-errors/not-found.error.ts';

export const httpErrorCodes = {
  http: 'HTTP_ERROR',
  internal: 'INTERNAL_SERVER_ERROR',
} as const;

const getPublicHttpError = (status: number) => {
  if (status >= 500) {
    return { code: httpErrorCodes.internal, message: 'An unexpected error occurred' };
  }

  switch (status) {
    case 400:
      return { code: badRequestErrorCode, message: 'Invalid request' };
    case 404:
      return { code: notFoundErrorCode, message: 'Not found' };
    default:
      return { code: httpErrorCodes.http, message: STATUS_CODES[status] ?? 'Request failed' };
  }
};

export const errorManager: ErrorHandler = (error, context) => {
  console.error({ message: 'Request failed', error });

  // Discriminate between application errors and unexpected errors.

  if (error instanceof AppError) {
    return context.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      error.status,
    );
  }

  if (error instanceof HTTPException) {
    return context.json({ error: getPublicHttpError(error.status) }, error.status);
  }

  return context.json(
    {
      error: {
        code: httpErrorCodes.internal,
        message: 'An unexpected error occurred',
      },
    },
    500,
  );
};
