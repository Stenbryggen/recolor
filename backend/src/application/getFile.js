import { NotFoundError } from '../domain/errors.js';
import { canSee } from '../domain/permissions.js';
import { contentTypeOf } from './uploads.js';

// Reads a stored file by its id (a file of a ticket, or a result image).
// Files are scoped like tickets: a partner cannot read another partner's files.
export function makeGetFile({ tickets, fileStorage }) {
  return async function getFile(fileId, actor) {
    const ticket = await tickets.findByFileId(fileId);
    if (!ticket || !canSee(actor, ticket)) throw new NotFoundError('File', fileId);

    const entry = [...ticket.files, ...ticket.results].find((file) => file.id === fileId);
    const buffer = await fileStorage.read(entry.file);
    if (!buffer) throw new NotFoundError('File', fileId);

    return { buffer, contentType: contentTypeOf(entry.file), photoId: entry.photoId };
  };
}
