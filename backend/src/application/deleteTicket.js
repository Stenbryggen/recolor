import { AUDIT_ACTION } from '../domain/constants.js';
import { NotFoundError } from '../domain/errors.js';
import { assertPending } from '../domain/ticket.js';

// Deletes a PENDING ticket and its files. The audit log keeps a DELETED event.
export function makeDeleteTicket({ tickets, audit, fileStorage, clock }) {
  return async function deleteTicket(id, actor) {
    const ticket = await tickets.get(id);
    if (!ticket) throw new NotFoundError('Ticket', id);
    assertPending(ticket, 'deleted');

    await Promise.all(ticket.files.map((file) => fileStorage.delete(file.file)));
    await tickets.delete(id);
    await audit.append({
      ticketId: id,
      action: AUDIT_ACTION.DELETED,
      actorId: actor.id,
      at: clock.now().toISOString(),
      changes: [],
      comment: null,
    });
  };
}
