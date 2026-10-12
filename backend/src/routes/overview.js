import { Router } from 'express';
import { presentApprovedPhoto } from './presenters.js';

// Partner overview, dashboard and Approved Library.
export function overviewRoutes(useCases) {
  const router = Router();

  router.get('/partners', async (req, res) => {
    res.json(await useCases.listPartners(req.actor));
  });

  router.get('/partners/:id', async (req, res) => {
    res.json(await useCases.getPartner(req.params.id, req.actor));
  });

  router.get('/dashboard/kpis', async (req, res) => {
    res.json(await useCases.getKpis(req.actor));
  });

  router.get('/approved-photos', async (req, res) => {
    const page = await useCases.listApprovedPhotos(req.query, req.actor);
    res.json({ ...page, items: page.items.map(presentApprovedPhoto) });
  });

  return router;
}
