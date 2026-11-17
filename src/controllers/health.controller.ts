import type { Request, Response } from 'express';
import mongoose from 'mongoose';

export function healthController(_req: Request, res: Response): void {
  const state = mongoose.connection.readyState;
  const healthy = state === 1;
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? 'ok' : 'unavailable',
      database: state === 1 ? 'connected' : state === 2 ? 'connecting' : 'disconnected',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
}
