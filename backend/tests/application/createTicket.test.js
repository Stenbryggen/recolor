import { describe, expect, it } from 'vitest';
import {
  FileTooLargeError,
  NotFoundError,
  UnsupportedFileTypeError,
  ValidationError,
} from '../../src/domain/errors.js';
import { MAX_FILE_BYTES } from '../../src/application/uploads.js';
import { createContainer } from '../../src/compositionRoot.js';
import {
  NOW,
  PNG,
  actors,
  catchError,
  pngUpload,
  testContainer,
  validAopData,
  validData,
  validUploads,
} from '../helpers.js';

describe('createTicket', () => {
  it('stores a PENDING ticket and returns it', async () => {
    const { useCases, repositories } = testContainer();

    const ticket = await useCases.createTicket(validData(), validUploads(), actors.maria);

    expect(ticket).toMatchObject({ id: 'ticket-1', status: 'PENDING', createdBy: 'user-maria', createdAt: NOW });
    expect(await repositories.tickets.get('ticket-1')).toEqual(ticket);
  });

  it('takes the photo ID from the file name and stores the files under the ticket', async () => {
    const { useCases } = testContainer();

    const ticket = await useCases.createTicket(validAopData(), validUploads({ reference: true }), actors.maria);

    expect(ticket.files.map((file) => [file.slot, file.photoId, file.file])).toEqual([
      ['FRONT', '15377522_5081887_001', 'ticket-1/front.png'],
      ['BACK', '15377522_5081887_002', 'ticket-1/back.png'],
      ['STYLE', '15377522_5081887_007', 'ticket-1/style.png'],
      ['REFERENCE', 'Block Libre', 'ticket-1/reference.png'],
    ]);
  });

  it('writes a CREATED audit event with who and when', async () => {
    const { useCases, repositories } = testContainer();

    await useCases.createTicket(validData(), validUploads(), actors.maria);

    expect(await repositories.audit.list('ticket-1')).toEqual([
      { ticketId: 'ticket-1', action: 'CREATED', actorId: 'user-maria', at: NOW, changes: [], comment: null },
    ]);
  });

  it('gives each ticket its own id', async () => {
    const { useCases } = testContainer();

    const first = await useCases.createTicket(validData(), validUploads(), actors.maria);
    const second = await useCases.createTicket(validAopData(), validUploads({ reference: true }), actors.maria);

    expect([first.id, second.id]).toEqual(['ticket-1', 'ticket-2']);
  });

  it('rejects invalid input with an error per field, and stores nothing', async () => {
    const { useCases, repositories } = testContainer();

    const error = await catchError(() =>
      useCases.createTicket(validData({ articleNo: '', variants: [] }), validUploads(), actors.maria),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toEqual({
      articleNo: 'An article number is required',
      variants: 'A ticket needs at least one variant',
    });
    expect((await repositories.tickets.list({})).total).toBe(0);
    expect(await repositories.audit.list('ticket-1')).toEqual([]);
  });

  it('needs the files that the operations require', async () => {
    const { useCases } = testContainer();

    const error = await catchError(() => useCases.createTicket(validAopData(), validUploads(), actors.maria));

    expect(error.errors).toEqual({ 'files.REFERENCE': 'A REFERENCE file is required' });
  });

  it('rejects an unknown partner', async () => {
    const { useCases } = testContainer();

    const error = await catchError(() =>
      useCases.createTicket(validData({ partnerId: 'partner-nope' }), validUploads(), actors.maria),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toEqual({ partnerId: 'Unknown partner' });
  });

  it('rejects an unknown colour or pattern, with the path to the field', async () => {
    const { useCases, repositories } = testContainer();
    const data = validAopData({
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

    const error = await catchError(() => useCases.createTicket(data, validUploads({ reference: true }), actors.maria));

    expect(error.errors).toEqual({
      'variants.1.operations.0.colourId': 'Unknown colour',
      'variants.1.operations.1.patternId': 'Unknown pattern',
    });
    expect((await repositories.tickets.list({})).total).toBe(0);
  });

  it('does not use up a ticket id when the input is invalid', async () => {
    const { useCases } = testContainer();

    await catchError(() => useCases.createTicket(validData({ variants: [] }), validUploads(), actors.maria));
    const ticket = await useCases.createTicket(validData(), validUploads(), actors.maria);

    expect(ticket.id).toBe('ticket-1');
  });

  it('refuses a file that is not a JPEG or PNG image (415)', async () => {
    const { useCases } = testContainer();
    const uploads = { ...validUploads(), FRONT: { originalName: 'front.pdf', mimeType: 'application/pdf', buffer: PNG } };

    const error = await catchError(() => useCases.createTicket(validData(), uploads, actors.maria));

    expect(error).toBeInstanceOf(UnsupportedFileTypeError);
    expect(error.message).toBe('The FRONT file must be a JPEG or PNG image');
  });

  it('refuses a file whose type does not match its extension (415)', async () => {
    const { useCases } = testContainer();
    const uploads = { ...validUploads(), BACK: { originalName: 'back.png', mimeType: 'image/jpeg', buffer: PNG } };

    const error = await catchError(() => useCases.createTicket(validData(), uploads, actors.maria));

    expect(error).toBeInstanceOf(UnsupportedFileTypeError);
  });

  it('refuses a file that is too large (413)', async () => {
    const { useCases } = testContainer();
    const big = { ...pngUpload('front'), buffer: Buffer.alloc(MAX_FILE_BYTES + 1) };

    const error = await catchError(() => useCases.createTicket(validData(), { ...validUploads(), FRONT: big }, actors.maria));

    expect(error).toBeInstanceOf(FileTooLargeError);
  });

  it('refuses an empty file (422)', async () => {
    const { useCases } = testContainer();
    const empty = { ...pngUpload('front'), buffer: Buffer.alloc(0) };

    const error = await catchError(() => useCases.createTicket(validData(), { ...validUploads(), FRONT: empty }, actors.maria));

    expect(error.errors).toEqual({ 'files.FRONT': 'The file is empty' });
  });

  it('ignores files in the data: only uploads count', async () => {
    const { useCases } = testContainer();
    const data = validData({ files: { FRONT: { photoId: 'x', file: 'y' } } });

    const ticket = await useCases.createTicket(data, validUploads(), actors.maria);

    expect(ticket.files[0].photoId).toBe('15377522_5081887_001');
  });

  it('removes the saved files again if the ticket cannot be stored', async () => {
    const saved = new Set();
    const storage = {
      save: async (key) => saved.add(key),
      read: async () => null,
      delete: async (key) => saved.delete(key),
    };
    const broken = createContainer({ fileStorage: storage });
    broken.repositories.tickets.create = async () => {
      throw new Error('disk full');
    };

    const error = await catchError(() => broken.useCases.createTicket(validData(), validUploads(), actors.maria));

    expect(error.message).toBe('disk full');
    expect(saved.size).toBe(0);
  });
});

describe('getTicket', () => {
  it('returns a ticket by id', async () => {
    const { useCases } = testContainer();
    const created = await useCases.createTicket(validData(), validUploads(), actors.maria);

    expect(await useCases.getTicket(created.id, actors.maria)).toEqual(created);
  });

  it('throws NotFoundError for an unknown id', async () => {
    const { useCases } = testContainer();

    const error = await catchError(() => useCases.getTicket('ticket-99', actors.maria));

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe('Ticket ticket-99 was not found');
  });
});
