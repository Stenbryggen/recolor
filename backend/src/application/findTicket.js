import { NotFoundError } from '../domain/errors.js';
import { canSee } from '../domain/permissions.js';

// Looks up a ticket for an actor. A ticket the actor may not see is reported as not found,
// so a partner cannot even tell that another partner's ticket exists.
export async function findTicket(tickets, id, actor) {
  const ticket = await tickets.get(id);
  if (!ticket || !canSee(actor, ticket)) throw new NotFoundError('Ticket', id);
  return ticket;
}
