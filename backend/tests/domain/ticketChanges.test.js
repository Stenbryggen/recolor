import { describe, expect, it } from 'vitest';
import { ConflictError, ValidationError } from '../../src/domain/errors.js';
import {
  applyTicketPatch,
  assertPending,
  buildTicket,
  parseTicketInput,
  parseTicketPatch,
  replaceTicketFile,
} from '../../src/domain/ticket.js';
import { NOW, catchError, validAopInput, validInput } from '../helpers.js';

const LATER = '2026-10-10T08:00:00.000Z';

const newTicket = (input = validInput()) =>
  buildTicket({ id: 'ticket-1', input: parseTicketInput(input), actorId: 'user-maria', now: new Date(NOW) });

const patchOptions = { actorId: 'user-thomas', now: new Date(LATER) };

describe('parseTicketPatch', () => {
  it('accepts some of the fields', () => {
    expect(parseTicketPatch({ priority: 'LOW' })).toEqual({ priority: 'LOW' });
  });

  it('needs at least one field', async () => {
    const error = await catchError(() => parseTicketPatch({}));
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toEqual({ _: 'Provide at least one field to change' });
  });

  it('refuses fields that cannot be changed, such as the status', async () => {
    const error = await catchError(() => parseTicketPatch({ status: 'APPROVED' }));
    expect(error.errors._).toMatch(/status/);
  });

  it('validates the fields it is given', async () => {
    const error = await catchError(() => parseTicketPatch({ priority: 'URGENT', guidelineText: ' ', variants: [] }));
    expect(error.errors).toEqual({
      priority: 'The priority must be LOW, NORMAL or HIGH',
      guidelineText: 'A guideline is required',
      variants: 'A ticket needs at least one variant',
    });
  });
});

describe('assertPending', () => {
  it('passes for a PENDING ticket', () => {
    expect(() => assertPending({ status: 'PENDING' }, 'changed')).not.toThrow();
  });

  it('throws a ConflictError for any other status', async () => {
    const error = await catchError(() => assertPending({ status: 'SENT' }, 'deleted'));
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).toBe('A ticket can only be deleted while it is PENDING (this one is SENT)');
  });
});

describe('applyTicketPatch', () => {
  it('changes the fields and lists each change with from and to', () => {
    const ticket = newTicket();

    const result = applyTicketPatch(ticket, { priority: 'LOW', guidelineText: 'New text' }, patchOptions);

    expect(result.ticket).toMatchObject({ priority: 'LOW', guidelineText: 'New text' });
    expect(result.changes).toEqual([
      { field: 'priority', from: 'HIGH', to: 'LOW' },
      { field: 'guidelineText', from: 'Please make Granita', to: 'New text' },
    ]);
  });

  it('stamps who and when, and leaves createdBy and createdAt alone', () => {
    const result = applyTicketPatch(newTicket(), { priority: 'LOW' }, patchOptions);

    expect(result.ticket).toMatchObject({
      updatedBy: 'user-thomas',
      updatedAt: LATER,
      createdBy: 'user-maria',
      createdAt: NOW,
    });
  });

  it('does not change the ticket it was given', () => {
    const ticket = newTicket();
    applyTicketPatch(ticket, { priority: 'LOW' }, patchOptions);
    expect(ticket.priority).toBe('HIGH');
  });

  it('records nothing if the values are the same as before', () => {
    const ticket = newTicket();

    const result = applyTicketPatch(ticket, { priority: 'HIGH' }, patchOptions);

    expect(result.changes).toEqual([]);
    expect(result.ticket).toBe(ticket);
  });

  it('replaces the variants and gives them new ids', () => {
    const result = applyTicketPatch(
      newTicket(),
      {
        variants: [
          { operations: [{ type: 'RECOLOUR', colourId: 'night-sky' }] },
          { operations: [{ type: 'RECOLOUR', colourId: 'hedge-green' }], notes: 'Darker' },
        ],
      },
      patchOptions,
    );

    expect(result.ticket.variants.map((variant) => variant.id)).toEqual(['ticket-1-v1', 'ticket-1-v2']);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({ field: 'variants' });
    expect(result.changes[0].to[1]).toEqual({ operations: [{ type: 'RECOLOUR', colourId: 'hedge-green' }], notes: 'Darker' });
  });

  it('needs a REFERENCE file when the new variants have AOP', async () => {
    const error = await catchError(() =>
      applyTicketPatch(
        newTicket(),
        { variants: [{ operations: [{ type: 'AOP', patternId: 'block-libre' }] }] },
        patchOptions,
      ),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toEqual({ 'files.REFERENCE': 'A REFERENCE file is required' });
  });

  it('accepts AOP variants when the ticket already has a REFERENCE file', () => {
    const result = applyTicketPatch(
      newTicket(validAopInput()),
      { variants: [{ operations: [{ type: 'AOP', patternId: 'dots-cloud-dancer' }] }] },
      patchOptions,
    );

    expect(result.changes).toHaveLength(1);
  });
});

describe('replaceTicketFile', () => {
  const photo = { slot: 'FRONT', photoId: 'new_front', file: 'ticket-1/front.jpg' };

  it('replaces the file in a slot and says what it replaced', () => {
    const result = replaceTicketFile(newTicket(), photo, patchOptions);

    expect(result.ticket.files.find((file) => file.slot === 'FRONT')).toEqual({
      id: 'ticket-1-front',
      ticketId: 'ticket-1',
      slot: 'FRONT',
      photoId: 'new_front',
      file: 'ticket-1/front.jpg',
    });
    expect(result.previous.photoId).toBe('15377522_5081887_001');
    expect(result.change).toEqual({ field: 'files.FRONT', from: '15377522_5081887_001', to: 'new_front' });
    expect(result.ticket).toMatchObject({ updatedBy: 'user-thomas', updatedAt: LATER });
  });

  it('adds a file to an empty slot, in slot order', () => {
    const result = replaceTicketFile(
      newTicket(),
      { slot: 'REFERENCE', photoId: 'Block Libre', file: 'ticket-1/reference.png' },
      patchOptions,
    );

    expect(result.previous).toBeNull();
    expect(result.change.from).toBeNull();
    expect(result.ticket.files.map((file) => file.slot)).toEqual(['FRONT', 'BACK', 'STYLE', 'REFERENCE']);
  });
});
