import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../src/domain/errors.js';
import { NOW, catchError, testContainer, validAopInput, validInput } from '../helpers.js';

describe('createTicket', () => {
  it('stores a PENDING ticket and returns it', async () => {
    const { useCases, repositories } = testContainer();

    const ticket = await useCases.createTicket(validInput(), 'user-maria');

    expect(ticket).toMatchObject({ id: 'ticket-1', status: 'PENDING', createdBy: 'user-maria', createdAt: NOW });
    expect(await repositories.tickets.get('ticket-1')).toEqual(ticket);
  });

  it('writes a CREATED audit event with who and when', async () => {
    const { useCases, repositories } = testContainer();

    await useCases.createTicket(validInput(), 'user-maria');

    expect(await repositories.audit.list('ticket-1')).toEqual([
      { ticketId: 'ticket-1', action: 'CREATED', actorId: 'user-maria', at: NOW, changes: [], comment: null },
    ]);
  });

  it('gives each ticket its own id', async () => {
    const { useCases } = testContainer();

    const first = await useCases.createTicket(validInput(), 'user-maria');
    const second = await useCases.createTicket(validAopInput(), 'user-maria');

    expect([first.id, second.id]).toEqual(['ticket-1', 'ticket-2']);
  });

  it('rejects invalid input with an error per field, and stores nothing', async () => {
    const { useCases, repositories } = testContainer();

    const error = await catchError(() => useCases.createTicket(validInput({ articleNo: '', variants: [] }), 'user-maria'));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toEqual({
      articleNo: 'An article number is required',
      variants: 'A ticket needs at least one variant',
    });
    expect(await repositories.tickets.list()).toEqual([]);
    expect(await repositories.audit.list('ticket-1')).toEqual([]);
  });

  it('rejects an unknown partner', async () => {
    const { useCases } = testContainer();

    const error = await catchError(() => useCases.createTicket(validInput({ partnerId: 'partner-nope' }), 'user-maria'));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toEqual({ partnerId: 'Unknown partner' });
  });

  it('rejects an unknown colour or pattern, with the path to the field', async () => {
    const { useCases, repositories } = testContainer();
    const input = validAopInput({
      variants: [
        { operations: [{ type: 'RECOLOUR', colourId: 'granita' }] },
        {
          operations: [
            { type: 'RECOLOUR', colourId: 'pink' },
            { type: 'AOP', patternId: 'stripes' },
          ],
        },
      ],
    });

    const error = await catchError(() => useCases.createTicket(input, 'user-maria'));

    expect(error.errors).toEqual({
      'variants.1.operations.0.colourId': 'Unknown colour',
      'variants.1.operations.1.patternId': 'Unknown pattern',
    });
    expect(await repositories.tickets.list()).toEqual([]);
  });

  it('does not use up a ticket id when the input is invalid', async () => {
    const { useCases } = testContainer();

    await catchError(() => useCases.createTicket(validInput({ variants: [] }), 'user-maria'));
    const ticket = await useCases.createTicket(validInput(), 'user-maria');

    expect(ticket.id).toBe('ticket-1');
  });
});

describe('getTicket', () => {
  it('returns a ticket by id', async () => {
    const { useCases } = testContainer();
    const created = await useCases.createTicket(validInput(), 'user-maria');

    expect(await useCases.getTicket(created.id)).toEqual(created);
  });

  it('throws NotFoundError for an unknown id', async () => {
    const { useCases } = testContainer();

    const error = await catchError(() => useCases.getTicket('ticket-99'));

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe('Ticket ticket-99 was not found');
  });
});

describe('listTickets', () => {
  it('is empty at first and then lists the tickets in the order they were created', async () => {
    const { useCases } = testContainer();
    expect(await useCases.listTickets()).toEqual([]);

    await useCases.createTicket(validInput(), 'user-maria');
    await useCases.createTicket(validAopInput(), 'user-thomas');

    const tickets = await useCases.listTickets();
    expect(tickets.map((ticket) => [ticket.id, ticket.createdBy])).toEqual([
      ['ticket-1', 'user-maria'],
      ['ticket-2', 'user-thomas'],
    ]);
  });
});
