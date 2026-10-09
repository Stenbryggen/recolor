import { describe, expect, it } from 'vitest';
import { createContainer } from '../src/compositionRoot.js';
import { seedDemoTickets } from '../src/seed/demoTickets.js';

async function seededContainer() {
  const container = createContainer();
  await seedDemoTickets(container);
  return container;
}

describe('seed data', () => {
  it('has users in all three roles, and every partner user belongs to a partner', async () => {
    const { repositories } = createContainer();
    const users = await repositories.users.list();
    const partners = await repositories.partners.list();

    expect([...new Set(users.map((user) => user.role))].sort()).toEqual(['MANAGER', 'OPERATOR', 'PARTNER']);
    for (const user of users.filter((candidate) => candidate.role === 'PARTNER')) {
      expect(partners.map((partner) => partner.id)).toContain(user.partnerId);
    }
  });

  it('creates the four tickets from the case, all PENDING', async () => {
    const { useCases } = await seededContainer();
    const tickets = await useCases.listTickets();

    expect(tickets.map((ticket) => ticket.articleNo)).toEqual(['15377489', '15377486', '15377488', '15377522']);
    expect(tickets.every((ticket) => ticket.status === 'PENDING')).toBe(true);
  });

  it('has 10 variants in total, as the README says', async () => {
    const { useCases } = await seededContainer();
    const tickets = await useCases.listTickets();

    expect(tickets.map((ticket) => ticket.variants.length)).toEqual([2, 3, 3, 2]);
  });

  it('gives every ticket four files, with the reference image', async () => {
    const { useCases } = await seededContainer();
    const tickets = await useCases.listTickets();

    for (const ticket of tickets) {
      expect(ticket.files.map((file) => file.slot)).toEqual(['FRONT', 'BACK', 'STYLE', 'REFERENCE']);
    }
    expect(tickets[0].files.map((file) => file.photoId)).toEqual([
      '15377489_5081878_001',
      '15377489_5081878_002',
      '15377489_5081878_007',
      'Block Libre',
    ]);
  });

  it('writes an audit event for each ticket', async () => {
    const { repositories } = await seededContainer();

    for (const ticket of await repositories.tickets.list()) {
      const events = await repositories.audit.list(ticket.id);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ action: 'CREATED', actorId: 'user-maria' });
    }
  });
});
