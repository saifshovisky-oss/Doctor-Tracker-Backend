import type { ErrorRequestHandler, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ApiError } from '../utils/apiError';
import { isProduction } from '../config/env';

function duplicateMessage(keyPattern: string): string {
  if (keyPattern.includes('email')) return 'A record with this email already exists';
  return 'A record with this value already exists';
}

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown;

  if (err instanceof ApiError) {
    status = err.statusCode;
    message = err.message;
    code = status === 400 ? 'VALIDATION_ERROR' : status === 401 ? 'UNAUTHORIZED' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'ERROR';
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.flatten().fieldErrors;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = Object.values(err.errors).map((e) => e.message).join('; ');
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = `Invalid value for ${err.path}`;
  } else if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
    status = 409;
    code = 'DUPLICATE_KEY';
    const keyPattern = JSON.stringify((err as { keyPattern?: object }).keyPattern ?? {});
    message = duplicateMessage(keyPattern);
  } else if (err instanceof Error && err.message.includes('Origin not allowed by CORS')) {
    status = 403;
    code = 'FORBIDDEN';
    message = 'Origin not allowed by CORS';
  } else if (err instanceof SyntaxError && 'body' in err) {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Malformed JSON body';
  }

  if (status >= 500 && !isProduction) {
    console.error('[error]', err);
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(!isProduction && status >= 500 && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
};
