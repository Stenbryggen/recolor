import express, { Router } from 'express';
import healthRouter from './routes/health.js';

export const API_PREFIX = '/api/v1';

// The container comes from the composition root. Routes (step 2) reach the use cases through it.
export function createApp(container) {
  const app = express();
  app.locals.container = container;

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
