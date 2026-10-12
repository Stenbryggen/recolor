// The fixed vocabulary of the domain. The words follow GLOSSARY.md.

export const STATUS = Object.freeze({
  PENDING: 'PENDING',
  SENT: 'SENT',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

export const PRIORITY = Object.freeze({
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
});

export const ROLE = Object.freeze({
  OPERATOR: 'OPERATOR',
  MANAGER: 'MANAGER',
  PARTNER: 'PARTNER',
});

// The four places (slots) for a file on a ticket.
export const SLOT = Object.freeze({
  FRONT: 'FRONT',
  BACK: 'BACK',
  STYLE: 'STYLE',
  REFERENCE: 'REFERENCE',
});

// Every ticket needs the three source photos. Operations can require more slots.
export const SOURCE_SLOTS = Object.freeze([SLOT.FRONT, SLOT.BACK, SLOT.STYLE]);

// A page size that returns every row (for the overviews that need all tickets).
export const ALL_ROWS = Number.MAX_SAFE_INTEGER;

// How tickets can be sorted in the queue.
export const SORT_FIELD = Object.freeze({
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  PRIORITY: 'priority',
  STATUS: 'status',
});

// For sorting: LOW < NORMAL < HIGH, and statuses in the order of the flow.
export const PRIORITY_ORDER = Object.values(PRIORITY);
export const STATUS_ORDER = Object.values(STATUS);

export const AUDIT_ACTION = Object.freeze({
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  FILE_REPLACED: 'FILE_REPLACED',
  DELETED: 'DELETED',
  SENT: 'SENT',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESULT_UPLOADED: 'RESULT_UPLOADED',
  DELIVERED: 'DELIVERED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});
