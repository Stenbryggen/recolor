import { AUDIT_ACTION } from '../domain/constants.js';
import { assertAllowed } from '../domain/permissions.js';
import {
  acknowledgeTicket,
  approveTicket,
  deliverTicket,
  parseRejection,
  rejectTicket,
  sendTicket,
} from '../domain/workflow.js';
import { findTicket } from './findTicket.js';

// The five workflow actions have the same shape: check the role, find the ticket, let the domain
// make the change, save it and write an audit event. Only the permission, the domain function
// and the audit action differ. `input` is the request body, for actions that take one.
function makeAction({ permission, auditAction, run }, { tickets, audit, clock }) {
  return async function action(id, actor, input) {
    assertAllowed(actor, permission);
    const ticket = await findTicket(tickets, id, actor);

    const { ticket: updated, changes, comment = null } = run(ticket, { actorId: actor.id, now: clock.now(), input });

    await tickets.update(updated);
    await audit.append({
      ticketId: id,
      action: auditAction,
      actorId: actor.id,
      at: updated.updatedAt,
      changes,
      comment,
    });

    return updated;
  };
}

export const makeSendTicket = (deps) =>
  makeAction({ permission: 'sendTicket', auditAction: AUDIT_ACTION.SENT, run: sendTicket }, deps);

export const makeAcknowledgeTicket = (deps) =>
  makeAction({ permission: 'acknowledgeTicket', auditAction: AUDIT_ACTION.ACKNOWLEDGED, run: acknowledgeTicket }, deps);

export const makeDeliverTicket = (deps) =>
  makeAction({ permission: 'deliverTicket', auditAction: AUDIT_ACTION.DELIVERED, run: deliverTicket }, deps);

export const makeApproveTicket = (deps) =>
  makeAction({ permission: 'approveTicket', auditAction: AUDIT_ACTION.APPROVED, run: approveTicket }, deps);

export const makeRejectTicket = (deps) =>
  makeAction(
    {
      permission: 'rejectTicket',
      auditAction: AUDIT_ACTION.REJECTED,
      run(ticket, ctx) {
        const { reason } = parseRejection(ctx.input);
        return { ...rejectTicket(ticket, reason, ctx), comment: reason };
      },
    },
    deps,
  );
