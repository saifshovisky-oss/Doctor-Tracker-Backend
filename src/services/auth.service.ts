import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { ApiError } from '../utils/apiError';
import type { LoginInput } from '../validators/auth';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin';
}

export interface LoginResult {
  user: AuthenticatedUser;
  token: string;
  expiresIn: string;
}

// Pre-computed once so missing users still pay the bcrypt cost.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export async function login(input: LoginInput): Promise<LoginResult> {
  const user = await User.findOne({ email: input.email.toLowerCase().trim() }).select('+password').lean();

  // Compare against a dummy hash when the user does not exist to reduce
  // username enumeration through response timing.
  const hash = user?.password ?? DUMMY_HASH;
  const valid = await bcrypt.compare(input.password, hash);

  if (!user || !valid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = jwt.sign(
    { sub: String(user._id), email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );

  return {
    user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
    token,
    expiresIn: env.JWT_EXPIRES_IN,
  };
}

export async function getCurrentUser(id: string): Promise<AuthenticatedUser> {
  const user = await User.findById(id).select('name email role').lean();
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}
