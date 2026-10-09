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

export const AUDIT_ACTION = Object.freeze({
  CREATED: 'CREATED',
});
