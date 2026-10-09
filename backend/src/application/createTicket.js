import { AUDIT_ACTION } from '../domain/constants.js';
import { ValidationError } from '../domain/errors.js';
import { getOperation } from '../domain/operations/index.js';
import { buildTicket, parseTicketInput } from '../domain/ticket.js';

// Checks that the partner and every colour/pattern the operations point to exist.
// The operations say which of their fields are references, so this code stays generic.
async function findUnknownReferences(input, { partners, catalog }) {
  const errors = {};

  if (!(await partners.get(input.partnerId))) {
    errors.partnerId = 'Unknown partner';
  }

  for (const [v, variant] of input.variants.entries()) {
    for (const [o, operation] of variant.operations.entries()) {
      const { references } = getOperation(operation.type);
      for (const [field, kind] of Object.entries(references)) {
        if (!(await catalog.exists(kind, operation[field]))) {
          errors[`variants.${v}.operations.${o}.${field}`] = `Unknown ${kind}`;
        }
      }
    }
  }

  return errors;
}

export function makeCreateTicket({ tickets, partners, catalog, audit, clock }) {
  return async function createTicket(rawInput, actorId) {
    const input = parseTicketInput(rawInput);

    const errors = await findUnknownReferences(input, { partners, catalog });
    if (Object.keys(errors).length > 0) throw new ValidationError(errors);

    const ticket = buildTicket({
      id: await tickets.nextId(),
      input,
      actorId,
      now: clock.now(),
    });

    await tickets.create(ticket);
    await audit.append({
      ticketId: ticket.id,
      action: AUDIT_ACTION.CREATED,
      actorId,
      at: ticket.createdAt,
      changes: [],
      comment: null,
    });

    return ticket;
  };
}
