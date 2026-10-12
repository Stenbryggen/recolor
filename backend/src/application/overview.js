import { ALL_ROWS, ROLE } from '../domain/constants.js';
import { NotFoundError } from '../domain/errors.js';
import { assertAllowed } from '../domain/permissions.js';

// The partner overview and the dashboard. All numbers are queries over the tickets.

// The dashboard: the number of tickets per status (a partner user only counts its own).
// For example PENDING is "pending" and COMPLETED is "awaiting approval".
export function makeGetKpis({ tickets }) {
  return async function getKpis(actor) {
    const partnerId = actor.role === ROLE.PARTNER ? actor.partnerId : undefined;
    const byStatus = await tickets.countByStatus({ partnerId });
    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
    return { total, byStatus };
  };
}

// All partners with the number of tickets per status. SENT is the tickets that wait for a receipt.
export function makeListPartners({ partners, tickets }) {
  return async function listPartners(actor) {
    assertAllowed(actor, 'viewPartners');

    const result = [];
    for (const partner of await partners.list()) {
      const counts = await tickets.countByStatus({ partnerId: partner.id });
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      result.push({ id: partner.id, name: partner.name, total, counts });
    }
    return result;
  };
}

// One partner with its tickets and when each was sent, received and delivered (the receipt status).
export function makeGetPartner({ partners, tickets }) {
  return async function getPartner(id, actor) {
    assertAllowed(actor, 'viewPartners');

    const partner = await partners.get(id);
    if (!partner) throw new NotFoundError('Partner', id);

    const { items } = await tickets.list({ partnerId: id, sort: 'updatedAt', order: 'desc', page: 1, pageSize: ALL_ROWS });
    const counts = await tickets.countByStatus({ partnerId: id });

    return {
      id: partner.id,
      name: partner.name,
      counts,
      tickets: items.map((ticket) => ({
        id: ticket.id,
        articleNo: ticket.articleNo,
        reference: ticket.reference,
        priority: ticket.priority,
        status: ticket.status,
        round: ticket.round,
        sentAt: ticket.sentAt,
        receivedAt: ticket.receivedAt,
        completedAt: ticket.completedAt,
      })),
    };
  };
}
