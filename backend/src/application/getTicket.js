import { NotFoundError } from '../domain/errors.js';

export function makeGetTicket({ tickets }) {
  return async function getTicket(id) {
    const ticket = await tickets.get(id);
    if (!ticket) throw new NotFoundError('Ticket', id);
    return ticket;
  };
}
