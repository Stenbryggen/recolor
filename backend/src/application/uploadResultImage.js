import { AUDIT_ACTION } from '../domain/constants.js';
import { assertAllowed } from '../domain/permissions.js';
import { putResultImage } from '../domain/workflow.js';
import { findTicket } from './findTicket.js';
import { checkUpload, photoIdFrom } from './uploads.js';

// The partner uploads one result image: one variant, one view (FRONT, BACK or STYLE).
// A new upload for the same variant and view in the same round replaces the old one.
export function makeUploadResultImage({ tickets, audit, fileStorage, clock }) {
  return async function uploadResultImage(ticketId, variantId, slot, upload, actor) {
    assertAllowed(actor, 'uploadResultImage');
    const ticket = await findTicket(tickets, ticketId, actor);

    const extension = checkUpload(slot, upload);
    const key = `${ticketId}/results/r${ticket.round}-${variantId}-${slot}.${extension}`;

    // The domain checks the status, the slot and the variant before anything is stored.
    const { ticket: updated, previous, change } = putResultImage(
      ticket,
      { variantId, slot, photoId: photoIdFrom(upload.originalName), file: key },
      { actorId: actor.id, now: clock.now() },
    );

    await fileStorage.save(key, upload.buffer);
    await tickets.update(updated);
    if (previous && previous.file !== key) await fileStorage.delete(previous.file);

    await audit.append({
      ticketId,
      action: AUDIT_ACTION.RESULT_UPLOADED,
      actorId: actor.id,
      at: updated.updatedAt,
      changes: [change],
      comment: null,
    });

    return updated;
  };
}
