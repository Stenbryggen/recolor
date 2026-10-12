import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError, UnsupportedFileTypeError, ValidationError } from '../../src/domain/errors.js';
import { createContainer } from '../../src/compositionRoot.js';
import { PNG, actors, catchError, createPendingTicket, pngUpload, testClock, testContainer } from '../helpers.js';

const LATER = '2026-10-10T08:00:00.000Z';

describe('listTickets', () => {
  it('returns a page with the total, page and pageSize', async () => {
    const container = testContainer();
    for (let i = 0; i < 3; i += 1) await createPendingTicket(container);

    const result = await container.useCases.listTickets({ pageSize: '2', page: '2', order: 'asc' }, actors.maria);

    expect(result.items.map((ticket) => ticket.id)).toEqual(['ticket-3']);
    expect(result).toMatchObject({ total: 3, page: 2, pageSize: 2 });
  });

  it('filters by what the query says', async () => {
    const container = testContainer();
    await createPendingTicket(container, { data: { priority: 'LOW' } });
    await createPendingTicket(container, { data: { priority: 'HIGH', articleNo: '99999' } });

    const result = await container.useCases.listTickets({ priority: 'HIGH' }, actors.maria);
    expect(result.items.map((ticket) => ticket.articleNo)).toEqual(['99999']);

    const search = await container.useCases.listTickets({ q: '9999' }, actors.maria);
    expect(search.total).toBe(1);
  });

  it('rejects a bad query with an error per field', async () => {
    const { useCases } = testContainer();

    const error = await catchError(() => useCases.listTickets({ status: 'NOPE', page: '0' }, actors.maria));

    expect(error).toBeInstanceOf(ValidationError);
    expect(Object.keys(error.errors)).toEqual(['status.0', 'page']);
  });
});

describe('updateTicket', () => {
  it('changes the ticket, stamps who and when, and writes an UPDATED audit event', async () => {
    const container = testContainer();
    const { useCases, repositories, clock } = container;
    const ticket = await createPendingTicket(container);
    clock.set(LATER);

    const updated = await useCases.updateTicket(ticket.id, { priority: 'LOW' }, actors.thomas);

    expect(updated).toMatchObject({ priority: 'LOW', updatedBy: 'user-thomas', updatedAt: LATER, createdBy: 'user-maria' });
    expect(await repositories.tickets.get(ticket.id)).toEqual(updated);
    expect((await repositories.audit.list(ticket.id)).at(-1)).toEqual({
      ticketId: ticket.id,
      action: 'UPDATED',
      actorId: 'user-thomas',
      at: LATER,
      changes: [{ field: 'priority', from: 'HIGH', to: 'LOW' }],
      comment: null,
    });
  });

  it('writes no audit event when nothing changes', async () => {
    const container = testContainer();
    const ticket = await createPendingTicket(container);

    await container.useCases.updateTicket(ticket.id, { priority: 'HIGH' }, actors.maria);

    expect(await container.repositories.audit.list(ticket.id)).toHaveLength(1);
  });

  it('changes the variants', async () => {
    const container = testContainer();
    const ticket = await createPendingTicket(container);

    const updated = await container.useCases.updateTicket(
      ticket.id,
      { variants: [{ operations: [{ type: 'RECOLOUR', colourId: 'navy-blazer' }, { type: 'RESIZE', width: 800, height: 1200 }] }] },
      actors.maria,
    );

    expect(updated.variants[0].operations.map((operation) => operation.type)).toEqual(['RECOLOUR', 'RESIZE']);
  });

  it('refuses an unknown partner, colour or pattern', async () => {
    const container = testContainer();
    const ticket = await createPendingTicket(container, { aop: true });

    const error = await catchError(() =>
      container.useCases.updateTicket(
        ticket.id,
        {
          partnerId: 'partner-nope',
          variants: [{ operations: [{ type: 'RECOLOUR', colourId: 'pink' }, { type: 'AOP', patternId: 'stripes' }] }],
        },
        actors.maria,
      ),
    );

    expect(error.errors).toEqual({
      partnerId: 'Unknown partner',
      'variants.0.operations.0.colourId': 'Unknown colour',
      'variants.0.operations.1.patternId': 'Unknown pattern',
    });
  });

  it('needs a REFERENCE file before the ticket can get an AOP variant', async () => {
    const container = testContainer();
    const ticket = await createPendingTicket(container);

    const error = await catchError(() =>
      container.useCases.updateTicket(
        ticket.id,
        { variants: [{ operations: [{ type: 'AOP', patternId: 'block-libre' }] }] },
        actors.maria,
      ),
    );
    expect(error.errors).toEqual({ 'files.REFERENCE': 'A REFERENCE file is required' });

    await container.useCases.replaceTicketFile(ticket.id, 'REFERENCE', pngUpload('Block Libre'), actors.maria);
    const updated = await container.useCases.updateTicket(
      ticket.id,
      { variants: [{ operations: [{ type: 'AOP', patternId: 'block-libre' }] }] },
      actors.maria,
    );
    expect(updated.variants[0].operations[0].type).toBe('AOP');
  });

  it('throws NotFoundError for an unknown ticket', async () => {
    const { useCases } = testContainer();
    const error = await catchError(() => useCases.updateTicket('ticket-9', { priority: 'LOW' }, actors.maria));
    expect(error).toBeInstanceOf(NotFoundError);
  });

  it('throws ConflictError when the ticket is no longer PENDING', async () => {
    const container = testContainer();
    const ticket = await createPendingTicket(container);
    await container.repositories.tickets.update({ ...ticket, status: 'SENT' });

    const error = await catchError(() => container.useCases.updateTicket(ticket.id, { priority: 'LOW' }, actors.maria));

    expect(error).toBeInstanceOf(ConflictError);
  });
});

describe('deleteTicket', () => {
  it('deletes the ticket and its files, and keeps a DELETED audit event', async () => {
    const container = testContainer();
    const ticket = await createPendingTicket(container);

    await container.useCases.deleteTicket(ticket.id, actors.maria);

    expect(await container.repositories.tickets.get(ticket.id)).toBeNull();
    expect((await container.repositories.audit.list(ticket.id)).map((event) => event.action)).toEqual(['CREATED', 'DELETED']);
    expect(await catchError(() => container.useCases.getFile(`${ticket.id}-front`, actors.maria))).toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError for an unknown ticket', async () => {
    const { useCases } = testContainer();
    expect(await catchError(() => useCases.deleteTicket('ticket-9', actors.maria))).toBeInstanceOf(NotFoundError);
  });

  it('throws ConflictError when the ticket is no longer PENDING', async () => {
    const container = testContainer();
    const ticket = await createPendingTicket(container);
    await container.repositories.tickets.update({ ...ticket, status: 'COMPLETED' });

    expect(await catchError(() => container.useCases.deleteTicket(ticket.id, actors.maria))).toBeInstanceOf(ConflictError);
    expect(await container.repositories.tickets.get(ticket.id)).not.toBeNull();
  });
});

describe('replaceTicketFile', () => {
  it('replaces the file, stamps the ticket and writes a FILE_REPLACED audit event', async () => {
    const container = testContainer();
    const { useCases, repositories, clock } = container;
    const ticket = await createPendingTicket(container);
    clock.set(LATER);
    const jpeg = { originalName: 'new_front.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('jpeg bytes') };

    const updated = await useCases.replaceTicketFile(ticket.id, 'FRONT', jpeg, actors.thomas);

    const front = updated.files.find((file) => file.slot === 'FRONT');
    expect(front).toMatchObject({ photoId: 'new_front', file: 'ticket-1/front.jpg' });
    expect(updated).toMatchObject({ updatedBy: 'user-thomas', updatedAt: LATER });
    expect((await useCases.getFile(front.id, actors.maria)).contentType).toBe('image/jpeg');
    expect((await repositories.audit.list(ticket.id)).at(-1)).toEqual({
      ticketId: ticket.id,
      action: 'FILE_REPLACED',
      actorId: 'user-thomas',
      at: LATER,
      changes: [{ field: 'files.FRONT', from: '15377522_5081887_001', to: 'new_front' }],
      comment: null,
    });
  });

  it('removes the old file when the new one has another extension', async () => {
    const stored = new Map();
    const fileStorage = {
      save: async (key, buffer) => stored.set(key, buffer),
      read: async (key) => stored.get(key) ?? null,
      delete: async (key) => stored.delete(key),
    };
    const container = { ...createContainer({ fileStorage, clock: testClock() }) };
    const ticket = await createPendingTicket(container);
    expect([...stored.keys()]).toContain('ticket-1/front.png');

    const jpeg = { originalName: 'new.jpg', mimeType: 'image/jpeg', buffer: PNG };
    await container.useCases.replaceTicketFile(ticket.id, 'FRONT', jpeg, actors.maria);

    expect([...stored.keys()]).toContain('ticket-1/front.jpg');
    expect([...stored.keys()]).not.toContain('ticket-1/front.png');
  });

  it('can add the REFERENCE file to a ticket that has none', async () => {
    const container = testContainer();
    const ticket = await createPendingTicket(container);

    const updated = await container.useCases.replaceTicketFile(ticket.id, 'REFERENCE', pngUpload('Block Libre'), actors.maria);

    expect(updated.files.map((file) => file.slot)).toEqual(['FRONT', 'BACK', 'STYLE', 'REFERENCE']);
  });

  it('refuses an unknown slot (422), a wrong file type (415), an unknown ticket (404) and a ticket that was sent (409)', async () => {
    const container = testContainer();
    const { useCases } = container;
    const ticket = await createPendingTicket(container);

    expect(await catchError(() => useCases.replaceTicketFile(ticket.id, 'SIDE', pngUpload('x'), actors.maria))).toBeInstanceOf(ValidationError);
    expect(
      await catchError(() =>
        useCases.replaceTicketFile(ticket.id, 'FRONT', { originalName: 'a.pdf', mimeType: 'application/pdf', buffer: PNG }, actors.maria),
      ),
    ).toBeInstanceOf(UnsupportedFileTypeError);
    expect(await catchError(() => useCases.replaceTicketFile('ticket-9', 'FRONT', pngUpload('x'), actors.maria))).toBeInstanceOf(NotFoundError);

    await container.repositories.tickets.update({ ...ticket, status: 'SENT' });
    expect(await catchError(() => useCases.replaceTicketFile(ticket.id, 'FRONT', pngUpload('x'), actors.maria))).toBeInstanceOf(ConflictError);
  });
});

describe('listAudit', () => {
  it('lists the events of a ticket in the order they happened', async () => {
    const container = testContainer();
    const ticket = await createPendingTicket(container);
    await container.useCases.updateTicket(ticket.id, { priority: 'LOW' }, actors.thomas);
    await container.useCases.replaceTicketFile(ticket.id, 'BACK', pngUpload('new_back'), actors.maria);

    const events = await container.useCases.listAudit(ticket.id, actors.maria);

    expect(events.map((event) => [event.action, event.actorId])).toEqual([
      ['CREATED', 'user-maria'],
      ['UPDATED', 'user-thomas'],
      ['FILE_REPLACED', 'user-maria'],
    ]);
  });

  it('does not mix up the events of different tickets', async () => {
    const container = testContainer();
    const first = await createPendingTicket(container);
    await createPendingTicket(container);

    expect(await container.useCases.listAudit(first.id, actors.maria)).toHaveLength(1);
  });

  it('throws NotFoundError for an unknown ticket', async () => {
    const { useCases } = testContainer();
    expect(await catchError(() => useCases.listAudit('ticket-9', actors.maria))).toBeInstanceOf(NotFoundError);
  });
});

describe('getFile', () => {
  it('returns the bytes, the content type and the photo ID', async () => {
    const container = testContainer();
    const ticket = await createPendingTicket(container);

    const file = await container.useCases.getFile(`${ticket.id}-front`, actors.maria);

    expect(file.buffer.equals(PNG)).toBe(true);
    expect(file).toMatchObject({ contentType: 'image/png', photoId: '15377522_5081887_001' });
  });

  it('throws NotFoundError for an unknown file', async () => {
    const { useCases } = testContainer();
    expect(await catchError(() => useCases.getFile('nope', actors.maria))).toBeInstanceOf(NotFoundError);
  });
});

describe('reference data', () => {
  it('lists users, colours and patterns', async () => {
    const { useCases } = testContainer();

    expect((await useCases.listUsers()).map((user) => user.id)).toContain('user-maria');
    expect(await useCases.listColours()).toHaveLength(5);
    expect(await useCases.listPatterns()).toHaveLength(2);
  });

  it('identifies a user by id, and refuses a missing or unknown one', async () => {
    const { useCases } = testContainer();

    expect((await useCases.identifyUser('user-jens')).role).toBe('MANAGER');
    expect((await catchError(() => useCases.identifyUser(undefined))).name).toBe('UnauthorizedError');
    expect((await catchError(() => useCases.identifyUser('user-nope'))).name).toBe('UnauthorizedError');
  });
});
