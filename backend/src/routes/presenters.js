import { API_PREFIX } from './prefix.js';

export const fileUrl = (fileId) => `${API_PREFIX}/files/${fileId}`;

// What the API returns for a ticket: the storage key of each file is internal,
// so it is replaced by a url the client can use.
export function presentTicket(ticket) {
  return {
    ...ticket,
    files: ticket.files.map(({ file, ...rest }) => ({ ...rest, url: fileUrl(rest.id) })),
  };
}
