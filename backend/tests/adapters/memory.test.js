import { describe, expect, it } from 'vitest';
import { fixedClock, systemClock } from '../../src/adapters/clock.js';
import { createMemoryCatalogRepository } from '../../src/adapters/memory/catalogRepository.js';
import { createMemoryTicketRepository } from '../../src/adapters/memory/ticketRepository.js';
import { referenceData } from '../../src/seed/referenceData.js';

describe('Clock adapters', () => {
  it('fixedClock always returns the same time', () => {
    const clock = fixedClock('2026-10-09T12:00:00.000Z');
    expect(clock.now().toISOString()).toBe('2026-10-09T12:00:00.000Z');
    expect(clock.now().toISOString()).toBe('2026-10-09T12:00:00.000Z');
  });

  it('systemClock returns a Date', () => {
    expect(systemClock.now()).toBeInstanceOf(Date);
  });
});

describe('in-memory ticket repository', () => {
  it('stores copies, so changing a returned ticket does not change the stored one', async () => {
    const repository = createMemoryTicketRepository();
    await repository.create({ id: 'ticket-1', status: 'PENDING' });

    const copy = await repository.get('ticket-1');
    copy.status = 'SENT';

    expect((await repository.get('ticket-1')).status).toBe('PENDING');
  });

  it('updates and deletes', async () => {
    const repository = createMemoryTicketRepository();
    await repository.create({ id: 'ticket-1', status: 'PENDING' });

    await repository.update({ id: 'ticket-1', status: 'SENT' });
    expect((await repository.get('ticket-1')).status).toBe('SENT');

    await repository.delete('ticket-1');
    expect(await repository.get('ticket-1')).toBeNull();
  });

  it('refuses to update a ticket that does not exist', async () => {
    const repository = createMemoryTicketRepository();
    await expect(repository.update({ id: 'ticket-1' })).rejects.toThrow('does not exist');
  });
});

describe('in-memory catalog repository', () => {
  const catalog = createMemoryCatalogRepository(referenceData);

  it('lists the colours and patterns', async () => {
    expect((await catalog.list('colour')).map((colour) => colour.pantoneName)).toEqual([
      'Granita',
      'Fuchsia Fedora',
      'Night Sky',
      'Hedge Green',
      'Navy Blazer',
    ]);
    expect((await catalog.list('pattern')).map((pattern) => pattern.name)).toEqual([
      'Block Libre',
      'Dots (Cloud Dancer)',
    ]);
  });

  it('knows which items exist, per list', async () => {
    expect(await catalog.exists('colour', 'granita')).toBe(true);
    expect(await catalog.exists('colour', 'block-libre')).toBe(false);
    expect(await catalog.exists('pattern', 'block-libre')).toBe(true);
    expect(await catalog.exists('shoe', 'granita')).toBe(false);
  });
});
