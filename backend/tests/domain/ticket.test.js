import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/domain/errors.js';
import { buildTicket, parseTicketInput, requiredSlots } from '../../src/domain/ticket.js';
import { NOW, catchError, validAopInput, validInput } from '../helpers.js';

describe('requiredSlots', () => {
  it('always needs the three source photos', () => {
    const variants = [{ operations: [{ type: 'RECOLOUR', colourId: 'granita' }] }];
    expect(requiredSlots(variants)).toEqual(['FRONT', 'BACK', 'STYLE']);
  });

  it('adds the slots that the operations require', () => {
    const variants = [
      { operations: [{ type: 'RECOLOUR', colourId: 'granita' }] },
      { operations: [{ type: 'AOP', patternId: 'block-libre' }] },
    ];
    expect(requiredSlots(variants)).toEqual(['FRONT', 'BACK', 'STYLE', 'REFERENCE']);
  });
});

describe('parseTicketInput', () => {
  it('accepts valid input and fills in the defaults', () => {
    const input = parseTicketInput(validInput({ priority: undefined }));
    expect(input.priority).toBe('NORMAL');
    expect(input.singleClippingPath).toBe(true);
  });

  it('accepts a variant that combines RECOLOUR and AOP when the REFERENCE file is there', () => {
    expect(() => parseTicketInput(validAopInput())).not.toThrow();
  });

  it('gives one message per field', async () => {
    const error = await catchError(() =>
      parseTicketInput(validInput({ articleNo: '', guidelineText: undefined, priority: 'URGENT' })),
    );
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toEqual({
      articleNo: 'An article number is required',
      priority: 'The priority must be LOW, NORMAL or HIGH',
      guidelineText: 'A guideline is required',
    });
  });

  it('uses the full path for fields inside variants and operations', async () => {
    const error = await catchError(() =>
      parseTicketInput(
        validAopInput({
          variants: [
            { operations: [{ type: 'RECOLOUR', colourId: 'granita' }] },
            { operations: [{ type: 'RECOLOUR', colourId: 'night-sky' }, { type: 'AOP' }] },
          ],
        }),
      ),
    );
    expect(error.errors).toEqual({ 'variants.1.operations.1.patternId': 'A pattern is required for AOP' });
  });

  it('needs at least one variant', async () => {
    const error = await catchError(() => parseTicketInput(validInput({ variants: [] })));
    expect(error.errors).toEqual({ variants: 'A ticket needs at least one variant' });
  });

  it('needs a REFERENCE file when a variant has AOP', async () => {
    const { REFERENCE, ...withoutReference } = validAopInput().files;
    const error = await catchError(() => parseTicketInput(validAopInput({ files: withoutReference })));
    expect(error.errors).toEqual({ 'files.REFERENCE': 'A REFERENCE file is required' });
  });

  it('does not need a REFERENCE file without AOP', () => {
    expect(() => parseTicketInput(validInput())).not.toThrow();
  });

  it('needs the three source photos', async () => {
    const error = await catchError(() => parseTicketInput(validInput({ files: {} })));
    expect(error.errors).toEqual({
      'files.FRONT': 'A FRONT file is required',
      'files.BACK': 'A BACK file is required',
      'files.STYLE': 'A STYLE file is required',
    });
  });

  it('needs a photo ID and a file for every uploaded file', async () => {
    const error = await catchError(() =>
      parseTicketInput(validInput({ files: { ...validInput().files, FRONT: { photoId: '' } } })),
    );
    expect(error.errors).toEqual({
      'files.FRONT.photoId': 'A photo ID is required',
      'files.FRONT.file': 'A file is required',
    });
  });
});

describe('buildTicket', () => {
  const build = (input) =>
    buildTicket({ id: 'ticket-7', input: parseTicketInput(input), actorId: 'user-maria', now: new Date(NOW) });

  it('starts PENDING in round 0, stamped with who and when', () => {
    const ticket = build(validInput());
    expect(ticket).toMatchObject({
      id: 'ticket-7',
      status: 'PENDING',
      round: 0,
      sentAt: null,
      approvedAt: null,
      rejectionReason: null,
      createdBy: 'user-maria',
      createdAt: NOW,
      updatedBy: 'user-maria',
      updatedAt: NOW,
    });
  });

  it('gives variants and files ids that start with the ticket id', () => {
    const ticket = build(validAopInput());
    expect(ticket.variants.map((variant) => variant.id)).toEqual(['ticket-7-v1']);
    expect(ticket.files.map((file) => file.id)).toEqual([
      'ticket-7-front',
      'ticket-7-back',
      'ticket-7-style',
      'ticket-7-reference',
    ]);
    expect(ticket.files[0]).toMatchObject({ ticketId: 'ticket-7', slot: 'FRONT', photoId: '15377522_5081887_001' });
  });

  it('keeps the operations of a variant and defaults notes to null', () => {
    const ticket = build(validAopInput());
    expect(ticket.variants[0].operations).toEqual([
      { type: 'RECOLOUR', colourId: 'fuchsia-fedora' },
      { type: 'AOP', patternId: 'block-libre' },
    ]);
    expect(ticket.variants[0].notes).toBeNull();
  });
});
