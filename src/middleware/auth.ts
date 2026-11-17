import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ACCESS_COOKIE_NAME } from '../config/cookies';
import { User } from '../models/User';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: 'admin';
}

function extractToken(req: Request): string | undefined {
  const fromCookie = req.cookies?.[ACCESS_COOKIE_NAME];
  if (typeof fromCookie === 'string' && fromCookie) return fromCookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  return undefined;
}

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required');

  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
  } catch {
    throw ApiError.unauthorized('Session expired or invalid');
  }

  if (!payload.sub || !payload.email) throw ApiError.unauthorized('Invalid session');

  const user = await User.findById(payload.sub).select('email role').lean();
  if (!user) throw ApiError.unauthorized('Account no longer exists');

  req.user = { id: String(user._id), email: user.email, role: user.role };
  next();
});

/** Used on the login route: if a valid token is present, reject with 400. */
export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    jwt.verify(token, env.JWT_SECRET);
    throw ApiError.badRequest('Already authenticated');
  } catch (error) {
    if (error instanceof ApiError) throw error;
    next();
  }
});
