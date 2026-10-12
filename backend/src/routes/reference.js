import { Router } from 'express';

// The colour and pattern lists that the forms choose from.
export function referenceRoutes(useCases) {
  const router = Router();

  router.get('/colours', async (req, res) => {
    res.json(await useCases.listColours());
  });

  router.get('/patterns', async (req, res) => {
    res.json(await useCases.listPatterns());
  });

  return router;
}
