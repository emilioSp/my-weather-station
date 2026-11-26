// Signal invalid request input for the central HTTP error manager.
import { AppError } from '#application-errors/app.error.ts';

export const badRequestErrorCode = 'BAD_REQUEST';

export class BadRequestError extends AppError {
  readonly code = badRequestErrorCode;
  readonly status = 400;
}
