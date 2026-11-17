import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';
import { corsOrigins } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import v1Routes from './routes/v1';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: false, // API only; no HTML is served.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      // Requests without an Origin (curl, server-to-server, tests) are allowed.
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.get('/', (_req, res) => {
    res.json({ name: 'Doctor Tracker API', version: '1.0.0', docs: '/api/v1/health' });
  });

  app.use('/api/v1', v1Routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
