import { parseTicketQuery } from './ticketQuery.js';

// Returns { items, total, page, pageSize } for the given query (see ticketQuery.js).
export function makeListTickets({ tickets }) {
  return async function listTickets(rawQuery, actor) {
    const filter = parseTicketQuery(rawQuery);
    const { items, total } = await tickets.list(filter);
    return { items, total, page: filter.page, pageSize: filter.pageSize };
  };
}
