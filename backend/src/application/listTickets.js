import { ROLE } from '../domain/constants.js';
import { parseTicketQuery } from './ticketQuery.js';

// Returns { items, total, page, pageSize } for the given query (see ticketQuery.js).
// A partner user only gets the tickets of its own partner, whatever the query says.
export function makeListTickets({ tickets }) {
  return async function listTickets(rawQuery, actor) {
    const filter = parseTicketQuery(rawQuery);
    if (actor.role === ROLE.PARTNER) filter.partnerId = actor.partnerId;
    const { items, total } = await tickets.list(filter);
    return { items, total, page: filter.page, pageSize: filter.pageSize };
  };
}
