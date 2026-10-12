import { findTicket } from './findTicket.js';

export function makeGetTicket({ tickets }) {
  return function getTicket(id, actor) {
    return findTicket(tickets, id, actor);
  };
}
