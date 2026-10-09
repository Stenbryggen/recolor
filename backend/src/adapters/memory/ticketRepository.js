// In-memory TicketRepository. Data is lost when the server stops.
// It stores copies, so changing a ticket you got back never changes the stored one.

export function createMemoryTicketRepository() {
  const tickets = new Map();
  let lastNumber = 0;

  return {
    async nextId() {
      lastNumber += 1;
      return `ticket-${lastNumber}`;
    },

    async list() {
      return [...tickets.values()].map((ticket) => structuredClone(ticket));
    },

    async get(id) {
      const ticket = tickets.get(id);
      return ticket ? structuredClone(ticket) : null;
    },

    async create(ticket) {
      tickets.set(ticket.id, structuredClone(ticket));
    },

    async update(ticket) {
      if (!tickets.has(ticket.id)) throw new Error(`Ticket ${ticket.id} does not exist`);
      tickets.set(ticket.id, structuredClone(ticket));
    },

    async delete(id) {
      tickets.delete(id);
    },
  };
}
