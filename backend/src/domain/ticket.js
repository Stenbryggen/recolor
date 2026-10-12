import { z } from 'zod';
import { PRIORITY, SLOT, SOURCE_SLOTS, STATUS } from './constants.js';
import { ConflictError, ValidationError } from './errors.js';
import { getOperation } from './operations/index.js';
import { parseWith } from './validation.js';
import { variantSchema } from './variant.js';

// All slots a ticket needs: the three source photos plus whatever its operations require.
export function requiredSlots(variants) {
  const slots = new Set(SOURCE_SLOTS);
  for (const variant of variants) {
    for (const operation of variant.operations) {
      for (const slot of getOperation(operation.type).requiredFiles) slots.add(slot);
    }
  }
  return [...slots];
}

// The required slots that have no file yet.
function missingSlots(variants, presentSlots) {
  return requiredSlots(variants).filter((slot) => !presentSlots.includes(slot));
}

const text = (message) => z.string({ error: message }).trim().min(1, message);

const fileSchema = z.object({
  photoId: text('A photo ID is required'),
  file: text('A file is required'),
});

// The fields that can be set when a ticket is created and changed while it is PENDING.
const priorityField = z.enum(Object.values(PRIORITY), { error: 'The priority must be LOW, NORMAL or HIGH' });
const clippingPathField = z.boolean({ error: 'singleClippingPath must be true or false' });
const variantsField = z
  .array(variantSchema, { error: 'A ticket needs at least one variant' })
  .min(1, 'A ticket needs at least one variant');

// What it takes to create a ticket. `files` maps a slot to the stored file.
export const createTicketSchema = z
  .object({
    articleNo: text('An article number is required'),
    reference: text('A reference number is required'),
    priority: priorityField.default(PRIORITY.NORMAL),
    partnerId: text('A partner is required'),
    guidelineText: text('A guideline is required'),
    singleClippingPath: clippingPathField.default(true),
    variants: variantsField,
    files: z.partialRecord(z.enum(Object.values(SLOT)), fileSchema, { error: 'Files are required' }),
  })
  .superRefine((input, ctx) => {
    for (const slot of missingSlots(input.variants, Object.keys(input.files))) {
      ctx.addIssue({ code: 'custom', path: ['files', slot], message: `A ${slot} file is required` });
    }
  });

// What can be changed on an existing ticket. Every field is optional, but at least one is needed.
// Unknown fields are refused, so a client cannot try to change the status this way.
export const updateTicketSchema = z
  .object({
    priority: priorityField.optional(),
    partnerId: text('A partner is required').optional(),
    guidelineText: text('A guideline is required').optional(),
    singleClippingPath: clippingPathField.optional(),
    variants: variantsField.optional(),
  })
  .strict();

// Validates the input for a new ticket. Throws a ValidationError with one message per field.
export function parseTicketInput(rawInput) {
  return parseWith(createTicketSchema, rawInput);
}

// Validates a change to a ticket.
export function parseTicketPatch(rawPatch) {
  const patch = parseWith(updateTicketSchema, rawPatch);
  if (Object.keys(patch).length === 0) {
    throw new ValidationError({ _: 'Provide at least one field to change' });
  }
  return patch;
}

// Tickets can only be edited or deleted while they are PENDING.
export function assertPending(ticket, action) {
  if (ticket.status !== STATUS.PENDING) {
    throw new ConflictError(`A ticket can only be ${action} while it is PENDING (this one is ${ticket.status})`);
  }
}

// Builds a new ticket from validated input. A new ticket is always PENDING in round 0.
export function buildTicket({ id, input, actorId, now }) {
  const at = now.toISOString();

  return {
    id,
    articleNo: input.articleNo,
    reference: input.reference,
    priority: input.priority,
    partnerId: input.partnerId,
    guidelineText: input.guidelineText,
    singleClippingPath: input.singleClippingPath,
    status: STATUS.PENDING,
    round: 0,
    sentAt: null,
    receivedAt: null,
    completedAt: null,
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
    files: Object.values(SLOT)
      .filter((slot) => input.files[slot])
      .map((slot) => ({
        id: `${id}-${slot.toLowerCase()}`,
        ticketId: id,
        slot,
        photoId: input.files[slot].photoId,
        file: input.files[slot].file,
      })),
    variants: buildVariants(id, input.variants),
    createdBy: actorId,
    createdAt: at,
    updatedBy: actorId,
    updatedAt: at,
  };
}

function buildVariants(ticketId, variants) {
  return variants.map((variant, index) => ({
    id: `${ticketId}-v${index + 1}`,
    ticketId,
    operations: variant.operations,
    notes: variant.notes ?? null,
  }));
}

// What the audit log stores about variants: the content, without ids.
const describeVariants = (variants) => variants.map(({ operations, notes }) => ({ operations, notes }));

const PLAIN_FIELDS = ['priority', 'partnerId', 'guidelineText', 'singleClippingPath'];

// Applies a validated patch. Returns the changed ticket and the list of changes
// ({ field, from, to }) for the audit log. If nothing actually changes, the ticket is returned as it was.
export function applyTicketPatch(ticket, patch, { actorId, now }) {
  const updated = { ...ticket };
  const changes = [];

  for (const field of PLAIN_FIELDS) {
    if (patch[field] !== undefined && patch[field] !== ticket[field]) {
      changes.push({ field, from: ticket[field], to: patch[field] });
      updated[field] = patch[field];
    }
  }

  if (patch.variants) {
    const variants = buildVariants(ticket.id, patch.variants);
    const before = describeVariants(ticket.variants);
    const after = describeVariants(variants);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes.push({ field: 'variants', from: before, to: after });
      updated.variants = variants;
    }
  }

  // New variants can need files the ticket does not have yet (for example AOP needs REFERENCE).
  const missing = missingSlots(updated.variants, ticket.files.map((file) => file.slot));
  if (missing.length > 0) {
    throw new ValidationError(
      Object.fromEntries(missing.map((slot) => [`files.${slot}`, `A ${slot} file is required`])),
    );
  }

  if (changes.length === 0) return { ticket, changes };

  updated.updatedBy = actorId;
  updated.updatedAt = now.toISOString();
  return { ticket: updated, changes };
}

// Puts a file in a slot, replacing the one that is there. Returns the changed ticket,
// the file that was replaced (or null) and the change for the audit log.
export function replaceTicketFile(ticket, { slot, photoId, file }, { actorId, now }) {
  const previous = ticket.files.find((candidate) => candidate.slot === slot) ?? null;
  const replacement = { id: `${ticket.id}-${slot.toLowerCase()}`, ticketId: ticket.id, slot, photoId, file };

  const others = ticket.files.filter((candidate) => candidate.slot !== slot);
  const files = [...others, replacement].sort(
    (a, b) => Object.values(SLOT).indexOf(a.slot) - Object.values(SLOT).indexOf(b.slot),
  );

  return {
    ticket: { ...ticket, files, updatedBy: actorId, updatedAt: now.toISOString() },
    previous,
    change: { field: `files.${slot}`, from: previous?.photoId ?? null, to: photoId },
  };
}
