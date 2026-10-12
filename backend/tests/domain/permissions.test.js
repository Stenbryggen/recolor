import { describe, expect, it } from 'vitest';
import { ForbiddenError } from '../../src/domain/errors.js';
import { assertAllowed, canSee } from '../../src/domain/permissions.js';
import { actors } from '../helpers.js';

const OPERATOR = actors.maria;
const MANAGER = actors.jens;
const PARTNER = actors.ravi;

// The table "Who may do what" from the README, one row per action.
const MATRIX = {
  createTicket: [OPERATOR],
  updateTicket: [OPERATOR],
  deleteTicket: [OPERATOR],
  replaceTicketFile: [OPERATOR],
  sendTicket: [OPERATOR],
  acknowledgeTicket: [PARTNER],
  uploadResultImage: [PARTNER],
  deliverTicket: [PARTNER],
  approveTicket: [MANAGER],
  rejectTicket: [MANAGER],
  viewPartners: [OPERATOR, MANAGER],
};

describe('assertAllowed', () => {
  for (const [action, allowed] of Object.entries(MATRIX)) {
    for (const user of [OPERATOR, MANAGER, PARTNER]) {
      const should = allowed.includes(user);
      it(`${should ? 'lets' : 'stops'} a ${user.role} ${should ? 'do' : 'from doing'} ${action}`, () => {
        if (should) expect(() => assertAllowed(user, action)).not.toThrow();
        else expect(() => assertAllowed(user, action)).toThrow(ForbiddenError);
      });
    }
  }

  it('says which role was refused and what it tried', () => {
    expect(() => assertAllowed(MANAGER, 'createTicket')).toThrow('MANAGER users cannot create tickets');
  });
});

describe('canSee', () => {
  const ticket = { partnerId: 'partner-clipmaster' };

  it('lets Operators and Managers see every ticket', () => {
    expect(canSee(OPERATOR, ticket)).toBe(true);
    expect(canSee(MANAGER, ticket)).toBe(true);
  });

  it('lets a partner user see only the tickets of its own partner', () => {
    expect(canSee(actors.ravi, ticket)).toBe(true);
    expect(canSee(actors.anh, ticket)).toBe(false);
  });
});
