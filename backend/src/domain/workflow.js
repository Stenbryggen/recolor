import { z } from 'zod';
import { SOURCE_SLOTS, STATUS } from './constants.js';
import { NotFoundError, ValidationError } from './errors.js';
import { assertStatus } from './ticket.js';
import { parseWith } from './validation.js';

// The workflow of a ticket (see *Status flow* in the README). Every function here is pure:
// it takes a ticket and returns a changed copy, so nothing is saved until a use case does it.
// Each one returns { ticket, changes }, where changes is the list of { field, from, to } for the audit log.

function change(field, from, to) {
  return { field, from, to };
}

// Moves a ticket to a new status and stamps who and when. `extra` holds other fields to set.
function moveTo(ticket, status, { actorId, now }, extra = {}) {
  const updated = { ...ticket, ...extra, status, updatedBy: actorId, updatedAt: now.toISOString() };
  const changes = [change('status', ticket.status, status)];
  for (const [field, to] of Object.entries(extra)) {
    if (ticket[field] !== to) changes.push(change(field, ticket[field], to));
  }
  return { ticket: updated, changes };
}

// An Operator sends a PENDING (or REJECTED) ticket to its partner. This starts a new round.
export function sendTicket(ticket, ctx) {
  assertStatus(ticket, [STATUS.PENDING, STATUS.REJECTED], 'sent');
  return moveTo(ticket, STATUS.SENT, ctx, {
    round: ticket.round + 1,
    sentAt: ctx.now.toISOString(),
    receivedAt: null,
    completedAt: null,
  });
}

// The partner confirms receipt.
export function acknowledgeTicket(ticket, ctx) {
  assertStatus(ticket, [STATUS.SENT], 'acknowledged');
  return moveTo(ticket, STATUS.IN_PROGRESS, ctx, { receivedAt: ctx.now.toISOString() });
}

// The result images that are missing in the current round: one per variant and view.
function missingResults(ticket) {
  const missing = [];
  for (const variant of ticket.variants) {
    for (const slot of SOURCE_SLOTS) {
      const found = ticket.results.some(
        (result) => result.round === ticket.round && result.variantId === variant.id && result.slot === slot,
      );
      if (!found) missing.push({ variantId: variant.id, slot });
    }
  }
  return missing;
}

// The partner delivers. Needs a result image for every variant and every view in this round.
export function deliverTicket(ticket, ctx) {
  assertStatus(ticket, [STATUS.IN_PROGRESS], 'delivered');

  const missing = missingResults(ticket);
  if (missing.length > 0) {
    throw new ValidationError(
      Object.fromEntries(missing.map(({ variantId, slot }) => [`results.${variantId}.${slot}`, 'A result image is required'])),
    );
  }

  return moveTo(ticket, STATUS.COMPLETED, ctx, { completedAt: ctx.now.toISOString() });
}

// A Manager approves the whole ticket. The reason of an earlier rejection no longer applies.
export function approveTicket(ticket, ctx) {
  assertStatus(ticket, [STATUS.COMPLETED], 'approved');
  return moveTo(ticket, STATUS.APPROVED, ctx, {
    approvedAt: ctx.now.toISOString(),
    approvedBy: ctx.actorId,
    rejectionReason: null,
  });
}

const rejectionSchema = z.object({
  reason: z
    .string({ error: 'A reason is required' })
    .trim()
    .min(1, 'A reason is required')
    .max(1000, 'The reason can be at most 1000 characters'),
});

// Validates the body of a rejection: { reason }.
export function parseRejection(rawBody) {
  return parseWith(rejectionSchema, rawBody ?? {});
}

// A Manager sends the whole ticket back and says what to correct.
export function rejectTicket(ticket, reason, ctx) {
  assertStatus(ticket, [STATUS.COMPLETED], 'rejected');
  return moveTo(ticket, STATUS.REJECTED, ctx, { rejectionReason: reason });
}

// The partner puts a result image on a variant, in one view. Replaces the one from this round, if any.
// Returns the changed ticket, the result that was replaced (or null) and the change for the audit log.
export function putResultImage(ticket, { variantId, slot, photoId, file }, { actorId, now }) {
  assertStatus(ticket, [STATUS.IN_PROGRESS], 'given result images');

  if (!SOURCE_SLOTS.includes(slot)) {
    throw new ValidationError({ slot: `The slot must be one of ${SOURCE_SLOTS.join(', ')}` });
  }
  if (!ticket.variants.some((variant) => variant.id === variantId)) {
    throw new NotFoundError('Variant', variantId);
  }

  const id = `${variantId}-${slot.toLowerCase()}-r${ticket.round}`;
  const previous = ticket.results.find((result) => result.id === id) ?? null;
  const result = {
    id,
    ticketId: ticket.id,
    variantId,
    slot,
    round: ticket.round,
    photoId,
    file,
    uploadedAt: now.toISOString(),
  };

  return {
    ticket: {
      ...ticket,
      results: [...ticket.results.filter((candidate) => candidate.id !== id), result],
      updatedBy: actorId,
      updatedAt: now.toISOString(),
    },
    previous,
    change: change(`results.${variantId}.${slot}`, previous?.photoId ?? null, photoId),
  };
}

// The result images of the current round.
export function currentResults(ticket) {
  return ticket.results.filter((result) => result.round === ticket.round);
}
