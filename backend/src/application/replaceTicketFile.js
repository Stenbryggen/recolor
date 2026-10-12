import { AUDIT_ACTION, SLOT } from '../domain/constants.js';
import { NotFoundError, ValidationError } from '../domain/errors.js';
import { assertPending, replaceTicketFile } from '../domain/ticket.js';
import { fileKey } from './createTicket.js';
import { checkUpload, photoIdFrom } from './uploads.js';

// Replaces the file in one slot of a PENDING ticket. The replacement is recorded in the audit log.
export function makeReplaceTicketFile({ tickets, audit, fileStorage, clock }) {
  return async function replaceFile(id, slot, upload, actor) {
    if (!Object.values(SLOT).includes(slot)) {
      throw new ValidationError({ slot: `The slot must be one of ${Object.values(SLOT).join(', ')}` });
    }

    const ticket = await tickets.get(id);
    if (!ticket) throw new NotFoundError('Ticket', id);
    assertPending(ticket, 'changed');

    const extension = checkUpload(slot, upload);
    const key = fileKey(id, slot, extension);
    await fileStorage.save(key, upload.buffer);

    const { ticket: updated, previous, change } = replaceTicketFile(
      ticket,
      { slot, photoId: photoIdFrom(upload.originalName), file: key },
      { actorId: actor.id, now: clock.now() },
    );

    await tickets.update(updated);
    if (previous && previous.file !== key) await fileStorage.delete(previous.file);

    await audit.append({
      ticketId: id,
      action: AUDIT_ACTION.FILE_REPLACED,
      actorId: actor.id,
      at: updated.updatedAt,
      changes: [change],
      comment: null,
    });

    return updated;
  };
}
