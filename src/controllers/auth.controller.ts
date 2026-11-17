import type { Request, Response } from 'express';
import { ACCESS_COOKIE_NAME, accessCookieOptions, clearAccessCookieOptions } from '../config/cookies';
import { getCurrentUser, login } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import type { LoginInput } from '../validators/auth';

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const result = await login(req.body as LoginInput);
  res.cookie(ACCESS_COOKIE_NAME, result.token, accessCookieOptions());
  sendSuccess(res, { user: result.user, expiresIn: result.expiresIn }, 200, 'Signed in successfully');
});

export const logoutController = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(ACCESS_COOKIE_NAME, clearAccessCookieOptions());
  sendSuccess(res, { signedOut: true }, 200, 'Signed out successfully');
});

export const meController = asyncHandler(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req.user!.id);
  sendSuccess(res, { user });
});
