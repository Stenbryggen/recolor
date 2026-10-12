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

describe('in-memory ticket repository: list', () => {
  const ticket = (n, overrides = {}) => ({
    id: `ticket-${n}`,
    articleNo: `1537700${n}`,
    reference: `508100${n}`,
    status: 'PENDING',
    priority: 'NORMAL',
    partnerId: 'partner-pixelworks',
    createdAt: `2026-10-0${n}T10:00:00.000Z`,
    updatedAt: `2026-10-0${n}T10:00:00.000Z`,
    files: [],
    results: [],
    ...overrides,
  });

  async function repositoryWith(tickets) {
    const repository = createMemoryTicketRepository();
    for (const t of tickets) await repository.create(t);
    return repository;
  }

  const idsOf = async (repository, filter) => (await repository.list(filter)).items.map((t) => t.id);

  it('lists newest first by default and counts the total', async () => {
    const repository = await repositoryWith([ticket(1), ticket(2), ticket(3)]);

    const result = await repository.list({});

    expect(result.items.map((t) => t.id)).toEqual(['ticket-3', 'ticket-2', 'ticket-1']);
    expect(result.total).toBe(3);
  });

  it('filters on status (one or several), priority and partner', async () => {
    const repository = await repositoryWith([
      ticket(1, { status: 'SENT', priority: 'HIGH' }),
      ticket(2, { status: 'COMPLETED', partnerId: 'partner-clipmaster' }),
      ticket(3),
    ]);

    expect(await idsOf(repository, { statuses: ['SENT'] })).toEqual(['ticket-1']);
    expect(await idsOf(repository, { statuses: ['SENT', 'COMPLETED'], order: 'asc' })).toEqual(['ticket-1', 'ticket-2']);
    expect(await idsOf(repository, { priority: 'HIGH' })).toEqual(['ticket-1']);
    expect(await idsOf(repository, { partnerId: 'partner-clipmaster' })).toEqual(['ticket-2']);
  });

  it('searches article number and reference, ignoring case', async () => {
    const repository = await repositoryWith([ticket(1), ticket(2, { reference: 'ABC-77' })]);

    expect(await idsOf(repository, { q: '15377002' })).toEqual(['ticket-2']);
    expect(await idsOf(repository, { q: 'abc-7' })).toEqual(['ticket-2']);
    expect(await idsOf(repository, { q: 'nothing' })).toEqual([]);
  });

  it('filters on the created date, including both ends', async () => {
    const repository = await repositoryWith([ticket(1), ticket(2), ticket(3)]);

    expect(
      await idsOf(repository, { createdFrom: '2026-10-02T10:00:00.000Z', createdTo: '2026-10-03T10:00:00.000Z', order: 'asc' }),
    ).toEqual(['ticket-2', 'ticket-3']);
  });

  it('sorts on priority and on status, and orders equal values by id', async () => {
    const repository = await repositoryWith([
      ticket(1, { priority: 'LOW', status: 'COMPLETED' }),
      ticket(2, { priority: 'HIGH', status: 'SENT' }),
      ticket(3, { priority: 'HIGH', status: 'PENDING' }),
    ]);

    expect(await idsOf(repository, { sort: 'priority', order: 'desc' })).toEqual(['ticket-3', 'ticket-2', 'ticket-1']);
    expect(await idsOf(repository, { sort: 'priority', order: 'asc' })).toEqual(['ticket-1', 'ticket-2', 'ticket-3']);
    expect(await idsOf(repository, { sort: 'status', order: 'asc' })).toEqual(['ticket-3', 'ticket-2', 'ticket-1']);
  });

  it('sorts ticket-10 after ticket-9', async () => {
    const same = { createdAt: NOW_STAMP, updatedAt: NOW_STAMP };
    const repository = await repositoryWith([ticket(1, { id: 'ticket-10', ...same }), ticket(2, { id: 'ticket-9', ...same })]);

    expect(await idsOf(repository, { order: 'asc' })).toEqual(['ticket-9', 'ticket-10']);
  });

  it('returns one page at a time, with the total of all pages', async () => {
    const repository = await repositoryWith([ticket(1), ticket(2), ticket(3), ticket(4), ticket(5)]);

    const second = await repository.list({ order: 'asc', page: 2, pageSize: 2 });

    expect(second.items.map((t) => t.id)).toEqual(['ticket-3', 'ticket-4']);
    expect(second.total).toBe(5);
    expect((await repository.list({ order: 'asc', page: 3, pageSize: 2 })).items.map((t) => t.id)).toEqual(['ticket-5']);
  });

  it('finds the ticket that holds a file', async () => {
    const repository = await repositoryWith([ticket(1, { files: [{ id: 'ticket-1-front' }] }), ticket(2)]);

    expect((await repository.findByFileId('ticket-1-front')).id).toBe('ticket-1');
    expect(await repository.findByFileId('nope')).toBeNull();
  });
});

const NOW_STAMP = '2026-10-09T12:00:00.000Z';

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
