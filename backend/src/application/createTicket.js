import { AUDIT_ACTION, SLOT } from '../domain/constants.js';
import { ValidationError } from '../domain/errors.js';
import { buildTicket, parseTicketInput } from '../domain/ticket.js';
import { findUnknownReferences } from './references.js';
import { checkUpload, photoIdFrom } from './uploads.js';

export const fileKey = (ticketId, slot, extension) => `${ticketId}/${slot.toLowerCase()}.${extension}`;

// `rawData` is the ticket data from the client. `uploads` maps a slot to an uploaded file:
// { FRONT: { originalName, mimeType, buffer }, ... }. The photo ID is the file name without extension.
export function makeCreateTicket({ tickets, partners, catalog, audit, fileStorage, clock }) {
  return async function createTicket(rawData, uploads, actor) {
    const extensions = {};
    const files = {};
    for (const slot of Object.values(SLOT)) {
      const upload = uploads?.[slot];
      if (!upload) continue;
      extensions[slot] = checkUpload(slot, upload);
      files[slot] = { photoId: photoIdFrom(upload.originalName), file: upload.originalName };
    }

    const input = parseTicketInput({ ...rawData, files });

    const errors = await findUnknownReferences(input, { partners, catalog });
    if (Object.keys(errors).length > 0) throw new ValidationError(errors);

    const ticket = buildTicket({
      id: await tickets.nextId(),
      input,
      actorId: actor.id,
      now: clock.now(),
    });

    // Store the files, then the ticket. If something fails, remove the files again.
    const savedKeys = [];
    try {
      for (const file of ticket.files) {
        const key = fileKey(ticket.id, file.slot, extensions[file.slot]);
        await fileStorage.save(key, uploads[file.slot].buffer);
        savedKeys.push(key);
        file.file = key;
      }

      await tickets.create(ticket);
      await audit.append({
        ticketId: ticket.id,
        action: AUDIT_ACTION.CREATED,
        actorId: actor.id,
        at: ticket.createdAt,
        changes: [],
        comment: null,
      });
    } catch (error) {
      await Promise.all(savedKeys.map((key) => fileStorage.delete(key)));
      throw error;
    }

    return ticket;
  };
}
