import { AUDIT_ACTION } from '../domain/constants.js';
import { ValidationError } from '../domain/errors.js';
import { assertAllowed } from '../domain/permissions.js';
import { applyTicketPatch, assertPending, parseTicketPatch } from '../domain/ticket.js';
import { findTicket } from './findTicket.js';
import { findUnknownReferences } from './references.js';

// Changes priority, partner, guideline, clipping path or variants of a PENDING ticket.
export function makeUpdateTicket({ tickets, partners, catalog, audit, clock }) {
  return async function updateTicket(id, rawPatch, actor) {
    assertAllowed(actor, 'updateTicket');
    const ticket = await findTicket(tickets, id, actor);
    assertPending(ticket, 'changed');

    const patch = parseTicketPatch(rawPatch);

    const errors = await findUnknownReferences(patch, { partners, catalog });
    if (Object.keys(errors).length > 0) throw new ValidationError(errors);

    const result = applyTicketPatch(ticket, patch, { actorId: actor.id, now: clock.now() });
    if (result.changes.length === 0) return ticket;

    await tickets.update(result.ticket);
    await audit.append({
      ticketId: id,
      action: AUDIT_ACTION.UPDATED,
      actorId: actor.id,
      at: result.ticket.updatedAt,
      changes: result.changes,
      comment: null,
    });

    return result.ticket;
  };
}
