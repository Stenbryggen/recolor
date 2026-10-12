import express, { Router } from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { requireUser } from './middleware/requireUser.js';
import { fileRoutes } from './routes/files.js';
import healthRouter from './routes/health.js';
import { API_PREFIX } from './routes/prefix.js';
import { overviewRoutes } from './routes/overview.js';
import { referenceRoutes } from './routes/reference.js';
import { ticketRoutes } from './routes/tickets.js';

export { API_PREFIX };

// The container comes from the composition root. The routes only talk to its use cases.
export function createApp(container) {
  const { useCases } = container;
  const app = express();
  app.locals.container = container;

  app.use(express.json());

  // All version 1 routes are registered on this router.
  const v1 = Router();

  // These two need no user: the UI needs the user list to let you choose who you are.
  v1.use('/health', healthRouter);
  v1.get('/users', async (req, res) => {
    res.json(await useCases.listUsers());
  });

  // Everything below needs an X-User-Id header.
  v1.use(requireUser(useCases.identifyUser));
  v1.use(referenceRoutes(useCases));
  v1.use(overviewRoutes(useCases));
  v1.use('/tickets', ticketRoutes(useCases));
  v1.use('/files', fileRoutes(useCases));

  app.use(API_PREFIX, v1);

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(errorHandler);

  return app;
}
