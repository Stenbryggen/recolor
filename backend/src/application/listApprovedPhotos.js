import { ROLE } from '../domain/constants.js';
import { parseApprovedPhotoQuery } from './approvedPhotoQuery.js';

// The Approved Library: the result images of the approved tickets, one item per variant.
// A partner user only gets its own tickets' results.
export function makeListApprovedPhotos({ approvedPhotos }) {
  return async function listApprovedPhotos(rawQuery, actor) {
    const filter = parseApprovedPhotoQuery(rawQuery);
    if (actor.role === ROLE.PARTNER) filter.partnerId = actor.partnerId;

    const { items, total } = await approvedPhotos.list(filter);
    return { items, total, page: filter.page, pageSize: filter.pageSize };
  };
}
