import { NotFoundError } from '../domain/errors.js';
import { contentTypeOf } from './uploads.js';

// Reads a stored file by its id (the id of a ticket file).
export function makeGetFile({ tickets, fileStorage }) {
  return async function getFile(fileId, actor) {
    const ticket = await tickets.findByFileId(fileId);
    if (!ticket) throw new NotFoundError('File', fileId);

    const entry = ticket.files.find((file) => file.id === fileId);
    const buffer = await fileStorage.read(entry.file);
    if (!buffer) throw new NotFoundError('File', fileId);

    return { buffer, contentType: contentTypeOf(entry.file), photoId: entry.photoId };
  };
}
