import { ALL_ROWS, SOURCE_SLOTS, STATUS } from '../../domain/constants.js';
import { currentResults } from '../../domain/workflow.js';

// In-memory ApprovedPhotoReader: the read side of the Approved Library.
// Nothing is copied: the list is computed from the approved tickets every time.
// Each item is one variant of an approved ticket, with the result images of the ticket's latest round.
export function createMemoryApprovedPhotoReader(tickets) {
  function variantMatches(variant, { operation, colourId }) {
    if (operation && !variant.operations.some((candidate) => candidate.type === operation)) return false;
    if (colourId && !variant.operations.some((candidate) => candidate.colourId === colourId)) return false;
    return true;
  }

  return {
    async list(filter = {}) {
      const { q, partnerId, approvedFrom, approvedTo, page = 1, pageSize = 20 } = filter;

      const approved = (await tickets.list({ statuses: [STATUS.APPROVED], partnerId, q, page: 1, pageSize: ALL_ROWS })).items
        .filter((ticket) => !approvedFrom || ticket.approvedAt >= approvedFrom)
        .filter((ticket) => !approvedTo || ticket.approvedAt <= approvedTo)
        .sort(
          (a, b) =>
            b.approvedAt.localeCompare(a.approvedAt) || b.id.localeCompare(a.id, undefined, { numeric: true }),
        );

      const items = [];
      for (const ticket of approved) {
        const results = currentResults(ticket);
        for (const variant of ticket.variants.filter((candidate) => variantMatches(candidate, filter))) {
          items.push({
            ticketId: ticket.id,
            articleNo: ticket.articleNo,
            reference: ticket.reference,
            partnerId: ticket.partnerId,
            approvedAt: ticket.approvedAt,
            round: ticket.round,
            variantId: variant.id,
            operations: variant.operations,
            notes: variant.notes,
            images: SOURCE_SLOTS.map((slot) => results.find((r) => r.variantId === variant.id && r.slot === slot))
              .filter(Boolean)
              .map(({ id, slot, photoId }) => ({ id, slot, photoId })),
          });
        }
      }

      const start = (page - 1) * pageSize;
      return { items: items.slice(start, start + pageSize), total: items.length };
    },
  };
}
