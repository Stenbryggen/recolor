import { Router } from 'express';

// Streams an uploaded file.
export function fileRoutes(useCases) {
  const router = Router();

  router.get('/:id', async (req, res) => {
    const { buffer, contentType, photoId } = await useCases.getFile(req.params.id, req.actor);
    res.type(contentType).set('Content-Disposition', `inline; filename="${photoId}"`).send(buffer);
  });

  return router;
}
