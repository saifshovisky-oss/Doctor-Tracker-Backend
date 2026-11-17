import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { connectDB, disconnectDB } from '../db/connect';
import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { User } from '../models/User';
import { env } from '../config/env';

export const TEST_ADMIN = {
  name: 'Test Admin',
  email: 'admin@test.local',
  password: 'TestPassword123!',
};

beforeAll(async () => {
  await connectDB();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Doctor.deleteMany({}),
    Patient.deleteMany({}),
  ]);
  await User.create({
    name: TEST_ADMIN.name,
    email: TEST_ADMIN.email,
    password: await bcrypt.hash(TEST_ADMIN.password, 10),
    role: 'admin',
  });
  // Ensure indexes (unique email) exist before tests exercise duplicates.
  await Promise.all([User.init(), Doctor.init(), Patient.init()]);
});

afterAll(async () => {
  await disconnectDB();
});

// Silence the unused import warning while keeping the config module loaded.
void env;
