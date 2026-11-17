import mongoose from 'mongoose';
import { env, isTest } from '../config/env';

mongoose.set('strictQuery', true);

/**
 * Connect to MongoDB. Cached so hot reloads / parallel imports never open
 * duplicate connection pools.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;

  if (mongoose.connection.readyState === 2) {
    await new Promise<void>((resolve) => mongoose.connection.once('open', () => resolve()));
    return mongoose;
  }

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: isTest ? 10000 : 15000,
      maxPoolSize: 20,
      minPoolSize: isTest ? 0 : 2,
    });
    return mongoose;
  } catch (error) {
    console.error('[db] MongoDB connection failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
