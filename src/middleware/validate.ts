import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { ApiError } from '../utils/apiError';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function flatten(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const validate =
  ({ body, query, params }: Schemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (body) req.body = body.parse(req.body);
      if (query) Object.assign(req.query, query.parse(req.query));
      if (params) Object.assign(req.params, params.parse(req.params));
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(ApiError.badRequest('Validation failed', flatten(error)));
      } else {
        next(error);
      }
    }
  };
