export function makeListTickets({ tickets }) {
  return async function listTickets() {
    return tickets.list();
  };
}
