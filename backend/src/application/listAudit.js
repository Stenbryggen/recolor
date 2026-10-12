import { NotFoundError } from '../domain/errors.js';

export function makeListAudit({ tickets, audit }) {
  return async function listAudit(id, actor) {
    const ticket = await tickets.get(id);
    if (!ticket) throw new NotFoundError('Ticket', id);
    return audit.list(id);
  };
}
