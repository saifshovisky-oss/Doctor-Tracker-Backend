import type { CookieOptions } from 'express';
import { env, isProduction } from './env';

export const ACCESS_COOKIE_NAME = 'dt_access_token';

/** Cookie options for the JWT access token. */
export function accessCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE || isProduction,
    sameSite: env.COOKIE_SAME_SITE,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export const clearAccessCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE || isProduction,
  sameSite: env.COOKIE_SAME_SITE,
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  path: '/',
});
