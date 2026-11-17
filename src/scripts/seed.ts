import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { connectDB, disconnectDB } from '../db/connect';

dotenv.config();

const name = process.env.ADMIN_NAME?.trim() || 'System Administrator';
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_IN_PRODUCTION !== 'true') {
    throw new Error('Refusing to seed in production without ALLOW_SEED_IN_PRODUCTION=true');
  }
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  await connectDB();
  const hash = await bcrypt.hash(password, 12);
  const result = await User.findOneAndUpdate(
    { email },
    { $set: { name, password: hash, role: 'admin' }, $setOnInsert: { email } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  // Never echo credentials (including the password hash) into logs.
  console.log(`[seed] Admin ready: ${result.email} (${result.role})`);
  console.log('[seed] ID:', String(result._id));
  await disconnectDB();
}

seed().catch(async (error) => {
  console.error('[seed] Failed:', error instanceof Error ? error.message : error);
  await disconnectDB();
  process.exit(1);
});
