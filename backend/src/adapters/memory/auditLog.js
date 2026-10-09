// In-memory AuditLog. Events can only be added, never changed or removed.

export function createMemoryAuditLog() {
  const events = [];

  return {
    async append(event) {
      events.push(structuredClone(event));
    },

    async list(ticketId) {
      return events
        .filter((event) => event.ticketId === ticketId)
        .map((event) => structuredClone(event));
    },
  };
}
