// The ports: the small interfaces the use cases depend on.
// JavaScript has no interfaces, so they are described here as JSDoc types.
// Adapters implement them (src/adapters/), and the composition root plugs them in.
// All methods are async so a real database can replace the in-memory versions.

/**
 * @typedef {Object} Clock
 * @property {() => Date} now  The current time. Tests use a fixed clock.
 */

/**
 * @typedef {Object} TicketRepository
 * @property {() => Promise<string>} nextId        A new, unused ticket id.
 * @property {() => Promise<Object[]>} list        All tickets (filters arrive with the API).
 * @property {(id: string) => Promise<Object|null>} get
 * @property {(ticket: Object) => Promise<void>} create
 * @property {(ticket: Object) => Promise<void>} update
 * @property {(id: string) => Promise<void>} delete
 */

/**
 * @typedef {Object} UserRepository
 * @property {() => Promise<Object[]>} list
 * @property {(id: string) => Promise<Object|null>} get
 */

/**
 * @typedef {Object} PartnerRepository
 * @property {() => Promise<Object[]>} list
 * @property {(id: string) => Promise<Object|null>} get
 */

/**
 * The lookup lists (colours and patterns). `kind` is 'colour' or 'pattern'.
 * @typedef {Object} CatalogRepository
 * @property {(kind: string) => Promise<Object[]>} list
 * @property {(kind: string, id: string) => Promise<boolean>} exists
 */

/**
 * The audit log: an append-only list of audit events.
 * @typedef {Object} AuditLog
 * @property {(event: Object) => Promise<void>} append
 * @property {(ticketId: string) => Promise<Object[]>} list
 */

export {};
