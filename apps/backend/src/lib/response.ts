import type { Context } from 'hono';
import type { ApiResponse, ApiError, ErrorCode } from '@taskflow/shared';
import { ErrorCodes } from '@taskflow/shared';

export function ok<T>(c: Context, data: T, status: 200 | 201 = 200) {
  const body: ApiResponse<T> = { success: true, data };
  return c.json(body, status);
}

export function fail(
  c: Context,
  code: ErrorCode,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 500 = 400,
  details?: ApiError['details'],
) {
  const body: ApiResponse = {
    success: false,
    error: { code, message, ...(details && { details }) },
  };
  return c.json(body, status);
}

// Shorthand helpers
export const unauthorized = (c: Context, message = 'Unauthorized') =>
  fail(c, ErrorCodes.UNAUTHORIZED, message, 401);

export const forbidden = (c: Context, message = 'Forbidden') =>
  fail(c, ErrorCodes.FORBIDDEN, message, 403);

export const notFound = (c: Context, message = 'Not found') =>
  fail(c, ErrorCodes.NOT_FOUND, message, 404);

export const conflict = (c: Context, message: string) =>
  fail(c, ErrorCodes.CONFLICT, message, 409);

export const validationError = (c: Context, details: ApiError['details']) =>
  fail(c, ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400, details);

export const internalError = (c: Context, message = 'Internal server error') =>
  fail(c, ErrorCodes.INTERNAL_ERROR, message, 500);