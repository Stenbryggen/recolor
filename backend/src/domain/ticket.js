import { z } from 'zod';
import { PRIORITY, SLOT, SOURCE_SLOTS, STATUS } from './constants.js';
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

const text = (message) => z.string({ error: message }).trim().min(1, message);

const fileSchema = z.object({
  photoId: text('A photo ID is required'),
  file: text('A file is required'),
});

// What it takes to create a ticket. `files` maps a slot to the stored file.
export const createTicketSchema = z
  .object({
    articleNo: text('An article number is required'),
    reference: text('A reference number is required'),
    priority: z
      .enum(Object.values(PRIORITY), { error: 'The priority must be LOW, NORMAL or HIGH' })
      .default(PRIORITY.NORMAL),
    partnerId: text('A partner is required'),
    guidelineText: text('A guideline is required'),
    singleClippingPath: z.boolean({ error: 'singleClippingPath must be true or false' }).default(true),
    variants: z
      .array(variantSchema, { error: 'A ticket needs at least one variant' })
      .min(1, 'A ticket needs at least one variant'),
    files: z.partialRecord(z.enum(Object.values(SLOT)), fileSchema, { error: 'Files are required' }),
  })
  .superRefine((input, ctx) => {
    for (const slot of requiredSlots(input.variants)) {
      if (!input.files[slot]) {
        ctx.addIssue({ code: 'custom', path: ['files', slot], message: `A ${slot} file is required` });
      }
    }
  });

// Validates the input for a new ticket. Throws a ValidationError with one message per field.
export function parseTicketInput(rawInput) {
  return parseWith(createTicketSchema, rawInput);
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
    variants: input.variants.map((variant, index) => ({
      id: `${id}-v${index + 1}`,
      ticketId: id,
      operations: variant.operations,
      notes: variant.notes ?? null,
    })),
    createdBy: actorId,
    createdAt: at,
    updatedBy: actorId,
    updatedAt: at,
  };
}
