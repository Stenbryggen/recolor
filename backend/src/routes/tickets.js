import { Router } from 'express';
import { parseDataField, singleFile, ticketFiles, uploadFromFile, uploadsFromFields } from '../middleware/upload.js';
import { presentTicket } from './presenters.js';

export function ticketRoutes(useCases) {
  const router = Router();

  router.get('/', async (req, res) => {
    const page = await useCases.listTickets(req.query, req.actor);
    res.json({ ...page, items: page.items.map(presentTicket) });
  });

  router.post('/', ticketFiles, async (req, res) => {
    const data = parseDataField(req.body?.data);
    const ticket = await useCases.createTicket(data, uploadsFromFields(req.files), req.actor);
    res.status(201).location(`${req.baseUrl}/${ticket.id}`).json(presentTicket(ticket));
  });

  router.get('/:id', async (req, res) => {
    res.json(presentTicket(await useCases.getTicket(req.params.id, req.actor)));
  });

  router.patch('/:id', async (req, res) => {
    res.json(presentTicket(await useCases.updateTicket(req.params.id, req.body, req.actor)));
  });

  router.put('/:id/files/:slot', singleFile, async (req, res) => {
    const upload = uploadFromFile(req.file);
    res.json(presentTicket(await useCases.replaceTicketFile(req.params.id, req.params.slot, upload, req.actor)));
  });

  router.delete('/:id', async (req, res) => {
    await useCases.deleteTicket(req.params.id, req.actor);
    res.status(204).end();
  });

  // The workflow: send (Operator), acknowledge, upload results and deliver (Partner), approve and reject (Manager).
  const action = (name) => async (req, res) => {
    res.json(presentTicket(await useCases[name](req.params.id, req.actor, req.body)));
  };
  router.post('/:id/send', action('sendTicket'));
  router.post('/:id/acknowledge', action('acknowledgeTicket'));
  router.post('/:id/deliver', action('deliverTicket'));
  router.post('/:id/approve', action('approveTicket'));
  router.post('/:id/reject', action('rejectTicket'));

  router.put('/:id/variants/:variantId/results/:slot', singleFile, async (req, res) => {
    const { id, variantId, slot } = req.params;
    const upload = uploadFromFile(req.file);
    res.json(presentTicket(await useCases.uploadResultImage(id, variantId, slot, upload, req.actor)));
  });

  router.get('/:id/audit', async (req, res) => {
    res.json(await useCases.listAudit(req.params.id, req.actor));
  });

  return router;
}
