import { findTicket } from './findTicket.js';

export function makeListAudit({ tickets, audit }) {
  return async function listAudit(id, actor) {
    await findTicket(tickets, id, actor);
    return audit.list(id);
  };
}
