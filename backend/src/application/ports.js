// The ports: the small interfaces the use cases depend on.
// JavaScript has no interfaces, so they are described here as JSDoc types.
// Adapters implement them (src/adapters/), and the composition root plugs them in.
// All methods are async so a real database can replace the in-memory versions.

/**
 * @typedef {Object} Clock
 * @property {() => Date} now  The current time. Tests use a fixed clock.
 */

/**
 * The filter for TicketRepository.list (see ticketQuery.js): statuses (array, empty = all),
 * priority, partnerId, q, createdFrom, createdTo (ISO timestamps), sort, order, page, pageSize.
 * @typedef {Object} TicketFilter
 */

/**
 * @typedef {Object} TicketRepository
 * @property {() => Promise<string>} nextId        A new, unused ticket id.
 * @property {(filter: TicketFilter) => Promise<{ items: Object[], total: number }>} list
 *           One page of tickets that match the filter, and the total number that match.
 * @property {(id: string) => Promise<Object|null>} get
 * @property {(fileId: string) => Promise<Object|null>} findByFileId  The ticket that holds a file.
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

/**
 * Stores the bytes of uploaded files under a key like "ticket-1/front.jpg".
 * @typedef {Object} FileStorage
 * @property {(key: string, buffer: Buffer) => Promise<void>} save
 * @property {(key: string) => Promise<Buffer|null>} read   null if there is no such file.
 * @property {(key: string) => Promise<void>} delete
 */

export {};
