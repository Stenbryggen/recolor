import { describe, expect, it } from 'vitest';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../src/domain/errors.js';
import {
  actors,
  catchError,
  createPendingTicket,
  pngUpload,
  testContainer,
  ticketWithStatus,
  uploadAllResults,
  validData,
  validUploads,
} from '../helpers.js';

const { maria, thomas, jens, anh, ravi } = actors;

describe('the whole workflow', () => {
  it('takes a ticket from PENDING to APPROVED, and writes an audit event for every step', async () => {
    const container = testContainer();
    const { useCases, repositories, clock } = container;
    const ticket = await createPendingTicket(container);
    const id = ticket.id;

    clock.set('2026-10-10T08:00:00.000Z');
    const sent = await useCases.sendTicket(id, maria);
    clock.set('2026-10-10T09:00:00.000Z');
    const acknowledged = await useCases.acknowledgeTicket(id, ravi);
    clock.set('2026-10-10T10:00:00.000Z');
    await uploadAllResults(container, id);
    const delivered = await useCases.deliverTicket(id, ravi);
    clock.set('2026-10-10T11:00:00.000Z');
    const approved = await useCases.approveTicket(id, jens);

    expect(sent).toMatchObject({ status: 'SENT', round: 1, sentAt: '2026-10-10T08:00:00.000Z' });
    expect(acknowledged).toMatchObject({ status: 'IN_PROGRESS', receivedAt: '2026-10-10T09:00:00.000Z' });
    expect(delivered).toMatchObject({ status: 'COMPLETED', completedAt: '2026-10-10T10:00:00.000Z' });
    expect(approved).toMatchObject({ status: 'APPROVED', approvedBy: 'user-jens', approvedAt: '2026-10-10T11:00:00.000Z' });

    const events = await repositories.audit.list(id);
    expect(events.map((event) => [event.action, event.actorId])).toEqual([
      ['CREATED', 'user-maria'],
      ['SENT', 'user-maria'],
      ['ACKNOWLEDGED', 'user-ravi'],
      ['RESULT_UPLOADED', 'user-ravi'],
      ['RESULT_UPLOADED', 'user-ravi'],
      ['RESULT_UPLOADED', 'user-ravi'],
      ['DELIVERED', 'user-ravi'],
      ['APPROVED', 'user-jens'],
    ]);
    expect(events[1].changes).toContainEqual({ field: 'status', from: 'PENDING', to: 'SENT' });
  });

  it('sends a rejected ticket again, which starts round 2', async () => {
    const container = testContainer();
    const { useCases, repositories } = container;
    const rejected = await ticketWithStatus(container, 'REJECTED');

    expect(rejected).toMatchObject({ status: 'REJECTED', round: 1, rejectionReason: 'The colour is too dark' });
    const reject = (await repositories.audit.list(rejected.id)).at(-1);
    expect(reject).toMatchObject({ action: 'REJECTED', actorId: 'user-jens', comment: 'The colour is too dark' });

    const sentAgain = await useCases.sendTicket(rejected.id, maria);
    expect(sentAgain).toMatchObject({ status: 'SENT', round: 2, receivedAt: null, completedAt: null });
    // The partner still sees what to correct.
    expect(sentAgain.rejectionReason).toBe('The colour is too dark');

    await useCases.acknowledgeTicket(rejected.id, ravi);
    await expect(useCases.deliverTicket(rejected.id, ravi)).rejects.toBeInstanceOf(ValidationError);

    await uploadAllResults(container, rejected.id);
    const completed = await useCases.deliverTicket(rejected.id, ravi);
    expect(completed.results.map((result) => result.round)).toEqual([1, 1, 1, 2, 2, 2]);

    const approved = await useCases.approveTicket(rejected.id, jens);
    expect(approved).toMatchObject({ status: 'APPROVED', rejectionReason: null });
  });
});

describe('who may do what', () => {
  it('lets only Operators create, change, delete, replace files and send', async () => {
    const container = testContainer();
    const { useCases } = container;
    const ticket = await createPendingTicket(container);

    for (const user of [jens, ravi]) {
      const refused = [
        () => createPendingTicketAs(container, user),
        () => useCases.updateTicket(ticket.id, { priority: 'LOW' }, user),
        () => useCases.deleteTicket(ticket.id, user),
        () => useCases.replaceTicketFile(ticket.id, 'FRONT', pngUpload('x'), user),
        () => useCases.sendTicket(ticket.id, user),
      ];
      for (const attempt of refused) expect(await catchError(attempt)).toBeInstanceOf(ForbiddenError);
    }

    // Both Operators may.
    expect((await useCases.updateTicket(ticket.id, { priority: 'LOW' }, thomas)).priority).toBe('LOW');
    expect((await useCases.sendTicket(ticket.id, thomas)).status).toBe('SENT');
  });

  it('lets only the partner acknowledge, upload results and deliver', async () => {
    const container = testContainer();
    const { useCases } = container;
    const sent = await ticketWithStatus(container, 'SENT');

    for (const user of [maria, jens]) {
      expect(await catchError(() => useCases.acknowledgeTicket(sent.id, user))).toBeInstanceOf(ForbiddenError);
    }

    await useCases.acknowledgeTicket(sent.id, ravi);
    for (const user of [maria, jens]) {
      expect(await catchError(() => useCases.uploadResultImage(sent.id, `${sent.id}-v1`, 'FRONT', pngUpload('x'), user))).toBeInstanceOf(ForbiddenError);
      expect(await catchError(() => useCases.deliverTicket(sent.id, user))).toBeInstanceOf(ForbiddenError);
    }
  });

  it('lets only a Manager approve or reject', async () => {
    const container = testContainer();
    const { useCases } = container;
    const completed = await ticketWithStatus(container, 'COMPLETED');

    for (const user of [maria, ravi]) {
      expect(await catchError(() => useCases.approveTicket(completed.id, user))).toBeInstanceOf(ForbiddenError);
      expect(await catchError(() => useCases.rejectTicket(completed.id, user, { reason: 'x' }))).toBeInstanceOf(ForbiddenError);
    }
    expect((await useCases.getTicket(completed.id, maria)).status).toBe('COMPLETED');
  });

  it('lets only Operators and Managers see the partner overview', async () => {
    const { useCases } = testContainer();

    expect(await useCases.listPartners(maria)).toHaveLength(2);
    expect(await useCases.listPartners(jens)).toHaveLength(2);
    expect(await catchError(() => useCases.listPartners(ravi))).toBeInstanceOf(ForbiddenError);
    expect(await catchError(() => useCases.getPartner('partner-clipmaster', ravi))).toBeInstanceOf(ForbiddenError);
  });

  it('checks the role before it looks for the ticket', async () => {
    const { useCases } = testContainer();
    expect(await catchError(() => useCases.approveTicket('ticket-99', maria))).toBeInstanceOf(ForbiddenError);
    expect(await catchError(() => useCases.approveTicket('ticket-99', jens))).toBeInstanceOf(NotFoundError);
  });
});

function createPendingTicketAs(container, user) {
  return container.useCases.createTicket(validData(), validUploads(), user);
}

describe('a partner only sees its own tickets', () => {
  async function twoPartners() {
    const container = testContainer();
    const own = await createPendingTicket(container); // partner-clipmaster
    const other = await createPendingTicket(container, { data: { partnerId: 'partner-pixelworks' } });
    return { container, own, other };
  }

  it('lists only the tickets of its own partner, whatever the query says', async () => {
    const { container, own } = await twoPartners();
    const { useCases } = container;

    expect((await useCases.listTickets({}, ravi)).items.map((ticket) => ticket.id)).toEqual([own.id]);
    expect((await useCases.listTickets({ partnerId: 'partner-pixelworks' }, ravi)).total).toBe(1);
    expect((await useCases.listTickets({ partnerId: 'partner-pixelworks' }, ravi)).items[0].id).toBe(own.id);
    expect((await useCases.listTickets({}, anh)).items.map((ticket) => ticket.partnerId)).toEqual(['partner-pixelworks']);
    expect((await useCases.listTickets({}, maria)).total).toBe(2);
  });

  it('reports another partner\'s ticket as not found everywhere', async () => {
    const { container, other } = await twoPartners();
    const { useCases } = container;
    await useCases.sendTicket(other.id, maria);

    expect(await catchError(() => useCases.getTicket(other.id, ravi))).toBeInstanceOf(NotFoundError);
    expect(await catchError(() => useCases.listAudit(other.id, ravi))).toBeInstanceOf(NotFoundError);
    expect(await catchError(() => useCases.getFile(`${other.id}-front`, ravi))).toBeInstanceOf(NotFoundError);
    expect(await catchError(() => useCases.acknowledgeTicket(other.id, ravi))).toBeInstanceOf(NotFoundError);
    // The ticket is untouched.
    expect((await useCases.getTicket(other.id, maria)).status).toBe('SENT');

    // The right partner can.
    expect((await useCases.acknowledgeTicket(other.id, anh)).status).toBe('IN_PROGRESS');
  });

  it('keeps another partner from uploading results', async () => {
    const container = testContainer();
    const { useCases } = container;
    const ticket = await ticketWithStatus(container, 'IN_PROGRESS');

    const error = await catchError(() => useCases.uploadResultImage(ticket.id, `${ticket.id}-v1`, 'FRONT', pngUpload('x'), anh));

    expect(error).toBeInstanceOf(NotFoundError);
    expect((await useCases.getTicket(ticket.id, maria)).results).toEqual([]);
  });

  it('lets a partner read the files of its own tickets, including result images', async () => {
    const container = testContainer();
    const { useCases } = container;
    const ticket = await ticketWithStatus(container, 'COMPLETED');

    expect((await useCases.getFile(`${ticket.id}-front`, ravi)).contentType).toBe('image/png');
    const result = ticket.results[0];
    expect((await useCases.getFile(result.id, ravi)).photoId).toBe(result.photoId);
    expect(await catchError(() => useCases.getFile(result.id, anh))).toBeInstanceOf(NotFoundError);
  });
});

describe('workflow rules', () => {
  it('refuses a step in the wrong status with a ConflictError', async () => {
    const container = testContainer();
    const { useCases } = container;
    const pending = await createPendingTicket(container);

    expect(await catchError(() => useCases.acknowledgeTicket(pending.id, ravi))).toBeInstanceOf(ConflictError);
    expect(await catchError(() => useCases.deliverTicket(pending.id, ravi))).toBeInstanceOf(ConflictError);
    expect(await catchError(() => useCases.approveTicket(pending.id, jens))).toBeInstanceOf(ConflictError);
    expect(await catchError(() => useCases.uploadResultImage(pending.id, `${pending.id}-v1`, 'FRONT', pngUpload('x'), ravi))).toBeInstanceOf(ConflictError);

    await useCases.sendTicket(pending.id, maria);
    expect(await catchError(() => useCases.sendTicket(pending.id, maria))).toBeInstanceOf(ConflictError);
    expect(await catchError(() => useCases.updateTicket(pending.id, { priority: 'LOW' }, maria))).toBeInstanceOf(ConflictError);
    expect(await catchError(() => useCases.deleteTicket(pending.id, maria))).toBeInstanceOf(ConflictError);
  });

  it('writes no audit event and changes nothing when a step is refused', async () => {
    const container = testContainer();
    const { useCases, repositories } = container;
    const pending = await createPendingTicket(container);

    await catchError(() => useCases.approveTicket(pending.id, jens));

    expect(await repositories.audit.list(pending.id)).toHaveLength(1);
    expect((await useCases.getTicket(pending.id, maria)).status).toBe('PENDING');
  });

  it('refuses to deliver until every variant has all three views', async () => {
    const container = testContainer();
    const { useCases } = container;
    const ticket = await ticketWithStatus(container, 'IN_PROGRESS', { data: { variants: twoVariants() } });
    const [v1, v2] = ticket.variants.map((variant) => variant.id);

    await useCases.uploadResultImage(ticket.id, v1, 'FRONT', pngUpload('a'), ravi);
    await useCases.uploadResultImage(ticket.id, v1, 'BACK', pngUpload('b'), ravi);
    await useCases.uploadResultImage(ticket.id, v1, 'STYLE', pngUpload('c'), ravi);
    await useCases.uploadResultImage(ticket.id, v2, 'FRONT', pngUpload('d'), ravi);

    const error = await catchError(() => useCases.deliverTicket(ticket.id, ravi));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toEqual({
      [`results.${v2}.BACK`]: 'A result image is required',
      [`results.${v2}.STYLE`]: 'A result image is required',
    });
    expect((await useCases.getTicket(ticket.id, maria)).status).toBe('IN_PROGRESS');
  });

  it('requires a reason to reject', async () => {
    const container = testContainer();
    const completed = await ticketWithStatus(container, 'COMPLETED');

    const error = await catchError(() => container.useCases.rejectTicket(completed.id, jens, {}));

    expect(error.errors).toEqual({ reason: 'A reason is required' });
    expect((await container.useCases.getTicket(completed.id, jens)).status).toBe('COMPLETED');
  });
});

function twoVariants() {
  return [
    { operations: [{ type: 'RECOLOUR', colourId: 'granita' }] },
    { operations: [{ type: 'RECOLOUR', colourId: 'night-sky' }] },
  ];
}

describe('uploadResultImage', () => {
  it('stores the image, names it after the file and writes a RESULT_UPLOADED event', async () => {
    const container = testContainer();
    const { useCases, repositories } = container;
    const ticket = await ticketWithStatus(container, 'IN_PROGRESS');

    const updated = await useCases.uploadResultImage(ticket.id, `${ticket.id}-v1`, 'FRONT', pngUpload('front_done'), ravi);

    expect(updated.results).toHaveLength(1);
    expect(updated.results[0]).toMatchObject({ id: 'ticket-1-v1-front-r1', round: 1, photoId: 'front_done' });
    expect((await useCases.getFile('ticket-1-v1-front-r1', ravi)).photoId).toBe('front_done');
    expect((await repositories.audit.list(ticket.id)).at(-1)).toMatchObject({
      action: 'RESULT_UPLOADED',
      actorId: 'user-ravi',
      changes: [{ field: 'results.ticket-1-v1.FRONT', from: null, to: 'front_done' }],
    });
  });

  it('replaces an earlier upload of the same variant and view', async () => {
    const container = testContainer();
    const { useCases } = container;
    const ticket = await ticketWithStatus(container, 'IN_PROGRESS');

    await useCases.uploadResultImage(ticket.id, `${ticket.id}-v1`, 'FRONT', pngUpload('first'), ravi);
    const updated = await useCases.uploadResultImage(ticket.id, `${ticket.id}-v1`, 'FRONT', pngUpload('second'), ravi);

    expect(updated.results.map((result) => result.photoId)).toEqual(['second']);
  });

  it('refuses the REFERENCE slot (422), an unknown variant (404) and the wrong file type (415)', async () => {
    const container = testContainer();
    const { useCases } = container;
    const ticket = await ticketWithStatus(container, 'IN_PROGRESS');
    const v1 = `${ticket.id}-v1`;

    expect(await catchError(() => useCases.uploadResultImage(ticket.id, v1, 'REFERENCE', pngUpload('x'), ravi))).toBeInstanceOf(ValidationError);
    expect(await catchError(() => useCases.uploadResultImage(ticket.id, 'nope', 'FRONT', pngUpload('x'), ravi))).toBeInstanceOf(NotFoundError);
    const gif = { originalName: 'a.gif', mimeType: 'image/gif', buffer: pngUpload('x').buffer };
    expect((await catchError(() => useCases.uploadResultImage(ticket.id, v1, 'FRONT', gif, ravi))).name).toBe('UnsupportedFileTypeError');
  });

  it('keeps the results of earlier rounds when a later round replaces them', async () => {
    const container = testContainer();
    const { useCases } = container;
    const rejected = await ticketWithStatus(container, 'REJECTED');
    await useCases.sendTicket(rejected.id, maria);
    await useCases.acknowledgeTicket(rejected.id, ravi);

    await useCases.uploadResultImage(rejected.id, `${rejected.id}-v1`, 'FRONT', pngUpload('round2'), ravi);

    const ticket = await useCases.getTicket(rejected.id, maria);
    expect(ticket.results.filter((result) => result.slot === 'FRONT').map((result) => [result.round, result.photoId])).toEqual([
      [1, expect.any(String)],
      [2, 'round2'],
    ]);
    // The round 1 file can still be read.
    expect((await useCases.getFile('ticket-1-v1-front-r1', maria)).buffer.length).toBeGreaterThan(0);
  });
});

describe('dashboard KPIs', () => {
  it('counts tickets per status, with 0 for the empty ones', async () => {
    const container = testContainer();
    await createPendingTicket(container);
    await ticketWithStatus(container, 'SENT');
    await ticketWithStatus(container, 'COMPLETED');
    await ticketWithStatus(container, 'COMPLETED');

    const kpis = await container.useCases.getKpis(maria);

    expect(kpis).toEqual({
      total: 4,
      byStatus: { PENDING: 1, SENT: 1, IN_PROGRESS: 0, COMPLETED: 2, APPROVED: 0, REJECTED: 0 },
    });
  });

  it('counts only the own tickets for a partner user', async () => {
    const container = testContainer();
    await createPendingTicket(container);
    await createPendingTicket(container, { data: { partnerId: 'partner-pixelworks' } });

    expect((await container.useCases.getKpis(ravi)).total).toBe(1);
    expect((await container.useCases.getKpis(anh)).total).toBe(1);
    expect((await container.useCases.getKpis(jens)).total).toBe(2);
  });
});

describe('partner overview', () => {
  it('lists the partners with their tickets per status', async () => {
    const container = testContainer();
    await createPendingTicket(container);
    await ticketWithStatus(container, 'SENT');
    await createPendingTicket(container, { data: { partnerId: 'partner-pixelworks' } });

    const partners = await container.useCases.listPartners(maria);

    expect(partners.map((partner) => [partner.id, partner.total])).toEqual([
      ['partner-pixelworks', 1],
      ['partner-clipmaster', 2],
    ]);
    expect(partners[1].counts).toMatchObject({ PENDING: 1, SENT: 1, COMPLETED: 0 });
  });

  it('shows the receipt status of every ticket of one partner', async () => {
    const container = testContainer();
    await ticketWithStatus(container, 'IN_PROGRESS');
    await createPendingTicket(container);

    const partner = await container.useCases.getPartner('partner-clipmaster', jens);

    expect(partner.name).toBe('ClipMaster');
    expect(partner.counts).toMatchObject({ PENDING: 1, IN_PROGRESS: 1 });
    expect(partner.tickets).toHaveLength(2);
    const inProgress = partner.tickets.find((ticket) => ticket.status === 'IN_PROGRESS');
    expect(inProgress).toMatchObject({ round: 1 });
    expect(inProgress.sentAt).not.toBeNull();
    expect(inProgress.receivedAt).not.toBeNull();
    expect(inProgress.completedAt).toBeNull();
  });

  it('throws NotFoundError for an unknown partner', async () => {
    const { useCases } = testContainer();
    expect(await catchError(() => useCases.getPartner('partner-nope', maria))).toBeInstanceOf(NotFoundError);
  });
});

describe('Approved Library', () => {
  async function libraryWithTwoTickets() {
    const container = testContainer();
    const { clock } = container;
    clock.set('2026-10-10T10:00:00.000Z');
    const plain = await ticketWithStatus(container, 'APPROVED', { data: { articleNo: '111', variants: twoVariants() } });
    clock.set('2026-10-11T10:00:00.000Z');
    const printed = await ticketWithStatus(container, 'APPROVED', { aop: true, data: { articleNo: '222', partnerId: 'partner-pixelworks' } });
    await ticketWithStatus(container, 'COMPLETED', { data: { articleNo: '333' } });
    return { container, plain, printed };
  }

  it('lists the results of approved tickets only, one item per variant, newest approval first', async () => {
    const { container, printed, plain } = await libraryWithTwoTickets();

    const library = await container.useCases.listApprovedPhotos({}, jens);

    expect(library).toMatchObject({ total: 3, page: 1, pageSize: 20 });
    expect(library.items.map((item) => [item.articleNo, item.variantId])).toEqual([
      ['222', `${printed.id}-v1`],
      ['111', `${plain.id}-v1`],
      ['111', `${plain.id}-v2`],
    ]);
  });

  it('refers back to the ticket and has the three views of the latest round', async () => {
    const { container, printed } = await libraryWithTwoTickets();

    const [item] = (await container.useCases.listApprovedPhotos({}, jens)).items;

    expect(item).toMatchObject({
      ticketId: printed.id,
      articleNo: '222',
      reference: '5081887',
      partnerId: 'partner-pixelworks',
      approvedAt: '2026-10-11T10:00:00.000Z',
      round: 1,
      operations: [
        { type: 'RECOLOUR', colourId: 'fuchsia-fedora' },
        { type: 'AOP', patternId: 'block-libre' },
      ],
    });
    expect(item.images.map((image) => image.slot)).toEqual(['FRONT', 'BACK', 'STYLE']);
    expect(item.images[0]).toEqual({ id: `${printed.id}-v1-front-r1`, slot: 'FRONT', photoId: `${printed.id}-v1_FRONT` });
  });

  it('only shows the latest round of a ticket that was rejected and approved later', async () => {
    const container = testContainer();
    const { useCases } = container;
    const rejected = await ticketWithStatus(container, 'REJECTED');
    await useCases.sendTicket(rejected.id, maria);
    await useCases.acknowledgeTicket(rejected.id, ravi);
    await uploadAllResults(container, rejected.id);
    await useCases.deliverTicket(rejected.id, ravi);
    await useCases.approveTicket(rejected.id, jens);

    const { items } = await useCases.listApprovedPhotos({}, jens);

    expect(items).toHaveLength(1);
    expect(items[0].round).toBe(2);
    expect(items[0].images.map((image) => image.id)).toEqual([
      `${rejected.id}-v1-front-r2`,
      `${rejected.id}-v1-back-r2`,
      `${rejected.id}-v1-style-r2`,
    ]);
  });

  it('filters on search text, partner, operation, colour and approval date', async () => {
    const { container } = await libraryWithTwoTickets();
    const articleNos = async (query) => (await container.useCases.listApprovedPhotos(query, jens)).items.map((item) => item.articleNo);

    expect(await articleNos({ q: '22' })).toEqual(['222']);
    expect(await articleNos({ partnerId: 'partner-pixelworks' })).toEqual(['222']);
    expect(await articleNos({ operation: 'AOP' })).toEqual(['222']);
    expect(await articleNos({ colourId: 'night-sky' })).toEqual(['111']);
    expect(await articleNos({ approvedFrom: '2026-10-11' })).toEqual(['222']);
    expect(await articleNos({ approvedTo: '2026-10-10' })).toEqual(['111', '111']);
    expect(await articleNos({ operation: 'RESIZE' })).toEqual([]);
  });

  it('pages through the items', async () => {
    const { container } = await libraryWithTwoTickets();

    const second = await container.useCases.listApprovedPhotos({ page: '2', pageSize: '2' }, jens);

    expect(second).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(second.items).toHaveLength(1);
  });

  it('gives a partner user only its own results', async () => {
    const { container } = await libraryWithTwoTickets();

    expect((await container.useCases.listApprovedPhotos({}, anh)).items.map((item) => item.articleNo)).toEqual(['222']);
    expect((await container.useCases.listApprovedPhotos({ partnerId: 'partner-pixelworks' }, ravi)).items.map((item) => item.articleNo)).toEqual(['111', '111']);
  });

  it('is empty when nothing is approved, and rejects a bad query', async () => {
    const container = testContainer();
    await createPendingTicket(container);

    expect((await container.useCases.listApprovedPhotos({}, jens)).total).toBe(0);
    const error = await catchError(() => container.useCases.listApprovedPhotos({ operation: 'SHARPEN', page: '0' }, jens));
    expect(error.errors).toEqual({
      operation: 'The operation must be one of RECOLOUR, AOP, RESIZE',
      page: 'page must be at least 1',
    });
  });
});
