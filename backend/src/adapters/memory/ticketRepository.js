import { PRIORITY_ORDER, STATUS_ORDER } from '../../domain/constants.js';

// In-memory TicketRepository. Data is lost when the server stops.
// It stores copies, so changing a ticket you got back never changes the stored one.

const SORT_KEYS = {
  createdAt: (ticket) => ticket.createdAt,
  updatedAt: (ticket) => ticket.updatedAt,
  priority: (ticket) => PRIORITY_ORDER.indexOf(ticket.priority),
  status: (ticket) => STATUS_ORDER.indexOf(ticket.status),
};

function matches(ticket, filter) {
  const { statuses = [], priority, partnerId, q, createdFrom, createdTo } = filter;

  if (statuses.length > 0 && !statuses.includes(ticket.status)) return false;
  if (priority && ticket.priority !== priority) return false;
  if (partnerId && ticket.partnerId !== partnerId) return false;
  if (createdFrom && ticket.createdAt < createdFrom) return false;
  if (createdTo && ticket.createdAt > createdTo) return false;
  if (q) {
    const needle = q.toLowerCase();
    if (![ticket.articleNo, ticket.reference].some((value) => value.toLowerCase().includes(needle))) return false;
  }
  return true;
}

export function createMemoryTicketRepository() {
  const tickets = new Map();
  let lastNumber = 0;

  return {
    async nextId() {
      lastNumber += 1;
      return `ticket-${lastNumber}`;
    },

    async list(filter = {}) {
      const { sort = 'createdAt', order = 'desc', page = 1, pageSize = 20 } = filter;
      const keyOf = SORT_KEYS[sort];
      const direction = order === 'asc' ? 1 : -1;

      // Tickets with the same sort value are ordered by id, so the order is always the same.
      const compare = (a, b) => {
        const [keyA, keyB] = [keyOf(a), keyOf(b)];
        if (keyA !== keyB) return keyA < keyB ? -direction : direction;
        return a.id.localeCompare(b.id, undefined, { numeric: true }) * direction;
      };

      const found = [...tickets.values()].filter((ticket) => matches(ticket, filter)).sort(compare);
      const start = (page - 1) * pageSize;
      return {
        items: found.slice(start, start + pageSize).map((ticket) => structuredClone(ticket)),
        total: found.length,
      };
    },

    async get(id) {
      const ticket = tickets.get(id);
      return ticket ? structuredClone(ticket) : null;
    },

    async findByFileId(fileId) {
      const ticket = [...tickets.values()].find((candidate) => candidate.files.some((file) => file.id === fileId));
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
