import { createApp } from './app';
import { env } from './config/env';
import { connectDB } from './db/connect';

async function bootstrap(): Promise<void> {
  await connectDB();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[server] Doctor Tracker API listening on http://localhost:${env.PORT}`);
    console.log(`[server] Health check: http://localhost:${env.PORT}/api/v1/health`);
  });

  const shutdown = (signal: string) => {
    console.log(`[server] Received ${signal}, shutting down...`);
    server.close(async () => {
      const { disconnectDB } = await import('./db/connect');
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('[server] Failed to start:', error);
  process.exit(1);
});
