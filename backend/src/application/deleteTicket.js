import { AUDIT_ACTION } from '../domain/constants.js';
import { assertAllowed } from '../domain/permissions.js';
import { assertPending } from '../domain/ticket.js';
import { findTicket } from './findTicket.js';

// Deletes a PENDING ticket and its files. The audit log keeps a DELETED event.
export function makeDeleteTicket({ tickets, audit, fileStorage, clock }) {
  return async function deleteTicket(id, actor) {
    assertAllowed(actor, 'deleteTicket');
    const ticket = await findTicket(tickets, id, actor);
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
