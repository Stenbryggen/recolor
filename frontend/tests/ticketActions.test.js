import { describe, expect, it } from 'vitest';
import { availableActions, canCreateTicket, canSeePartnerOverview } from '../src/ticketActions.js';

const operator = { role: 'OPERATOR' };
const manager = { role: 'MANAGER' };
const partner = { role: 'PARTNER' };
const ticket = (status) => ({ status });

describe('availableActions', () => {
  it('lets an operator send and delete a pending ticket', () => {
    expect(availableActions(operator, ticket('PENDING'))).toEqual(['send', 'delete']);
  });

  it('lets an operator send a rejected ticket again, but not delete it', () => {
    expect(availableActions(operator, ticket('REJECTED'))).toEqual(['send']);
  });

  it('gives an operator nothing once the ticket is with the partner', () => {
    for (const status of ['SENT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED']) {
      expect(availableActions(operator, ticket(status))).toEqual([]);
    }
  });

  it('follows the work of a partner user', () => {
    expect(availableActions(partner, ticket('SENT'))).toEqual(['acknowledge']);
    expect(availableActions(partner, ticket('IN_PROGRESS'))).toEqual(['uploadResults', 'deliver']);
    expect(availableActions(partner, ticket('PENDING'))).toEqual([]);
  });

  it('lets a manager approve or reject a completed ticket only', () => {
    expect(availableActions(manager, ticket('COMPLETED'))).toEqual(['approve', 'reject']);
    expect(availableActions(manager, ticket('SENT'))).toEqual([]);
  });
});

describe('pages per role', () => {
  it('only operators create tickets', () => {
    expect(canCreateTicket(operator)).toBe(true);
    expect(canCreateTicket(manager)).toBe(false);
    expect(canCreateTicket(partner)).toBe(false);
  });

  it('partner users do not see the Partner Overview', () => {
    expect(canSeePartnerOverview(operator)).toBe(true);
    expect(canSeePartnerOverview(manager)).toBe(true);
    expect(canSeePartnerOverview(partner)).toBe(false);
  });
});
