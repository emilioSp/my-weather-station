// Signal a missing application resource when requested by a service.
import { AppError } from '#application-errors/app.error.ts';

export const notFoundErrorCode = 'NOT_FOUND';

export class NotFoundError extends AppError {
  readonly code = notFoundErrorCode;
  readonly status = 404;
}
