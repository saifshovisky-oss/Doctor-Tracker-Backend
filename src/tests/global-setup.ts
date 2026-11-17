import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer | undefined;

export async function setup(): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough-1234567890';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.CORS_ORIGINS = 'http://localhost:3000';
  process.env.COOKIE_SAME_SITE = 'lax';
  process.env.COOKIE_SECURE = 'false';
  process.env.RATE_LIMIT_MAX = '1000';

  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('doctor_tracker_test');
}

export async function teardown(): Promise<void> {
  await mongo?.stop();
}
