import { API_PREFIX } from './prefix.js';

export const fileUrl = (fileId) => `${API_PREFIX}/files/${fileId}`;

// The storage key of a file is internal, so it is replaced by a url the client can use.
const withUrl = ({ file, ...rest }) => ({ ...rest, url: fileUrl(rest.id) });

// What the API returns for a ticket.
export function presentTicket(ticket) {
  return {
    ...ticket,
    files: ticket.files.map(withUrl),
    results: ticket.results.map(withUrl),
  };
}

// What the API returns for an item of the Approved Library.
export function presentApprovedPhoto(item) {
  return { ...item, images: item.images.map((image) => ({ ...image, url: fileUrl(image.id) })) };
}
