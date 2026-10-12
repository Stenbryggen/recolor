import { ROLE } from './constants.js';
import { ForbiddenError } from './errors.js';

// Who may do what (see *Who may do what* in the README). Each action lists the roles
// that may do it. Seeing tickets is a separate rule: see canSee.
const ACTIONS = {
  createTicket: { roles: [ROLE.OPERATOR], label: 'create tickets' },
  updateTicket: { roles: [ROLE.OPERATOR], label: 'change tickets' },
  deleteTicket: { roles: [ROLE.OPERATOR], label: 'delete tickets' },
  replaceTicketFile: { roles: [ROLE.OPERATOR], label: 'replace the files of a ticket' },
  sendTicket: { roles: [ROLE.OPERATOR], label: 'send tickets to a partner' },
  acknowledgeTicket: { roles: [ROLE.PARTNER], label: 'confirm receipt of tickets' },
  uploadResultImage: { roles: [ROLE.PARTNER], label: 'upload result images' },
  deliverTicket: { roles: [ROLE.PARTNER], label: 'deliver tickets' },
  approveTicket: { roles: [ROLE.MANAGER], label: 'approve tickets' },
  rejectTicket: { roles: [ROLE.MANAGER], label: 'reject tickets' },
  viewPartners: { roles: [ROLE.OPERATOR, ROLE.MANAGER], label: 'see the partner overview' },
};

// Throws a ForbiddenError (403) if the actor's role may not do the action.
export function assertAllowed(actor, action) {
  const { roles, label } = ACTIONS[action];
  if (!roles.includes(actor.role)) {
    throw new ForbiddenError(`${actor.role} users cannot ${label}`);
  }
}

// Operators and Managers see every ticket. A partner user sees only the tickets of its own partner.
export function canSee(actor, ticket) {
  return actor.role !== ROLE.PARTNER || ticket.partnerId === actor.partnerId;
}
