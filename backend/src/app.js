import express, { Router } from 'express';
import healthRouter from './routes/health.js';

export const API_PREFIX = '/api/v1';

export function createApp() {
  const app = express();

  app.use(express.json());

  // All version 1 routes are registered on this router.
  const v1 = Router();
  v1.use('/health', healthRouter);
  app.use(API_PREFIX, v1);

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
