import { describe, expect, it } from 'vitest';
import { PNG, validAopData, validData } from '../helpers.js';
import { createTestApi, postAopTicket, postTicket } from './apiHelpers.js';

const V1 = '/api/v1';
const as = (userId) => ({ 'X-User-Id': userId });
const MARIA = as('user-maria'); // Operator
const JENS = as('user-jens'); // Manager
const RAVI = as('user-ravi'); // partner user, ClipMaster
const ANH = as('user-anh'); // partner user, Pixelworks

const image = (name) => ({ filename: `${name}.png`, contentType: 'image/png' });

// Uploads a result image for every variant and view of a ticket, over HTTP.
async function uploadResults(api, ticketId, headers = RAVI) {
  const ticket = (await api.get(`${V1}/tickets/${ticketId}`).set(headers)).body;
  for (const variant of ticket.variants) {
    for (const slot of ['FRONT', 'BACK', 'STYLE']) {
      const response = await api
        .put(`${V1}/tickets/${ticketId}/variants/${variant.id}/results/${slot}`)
        .set(headers)
        .attach('file', PNG, image(`${variant.id}_${slot}`));
      expect(response.status).toBe(200);
    }
  }
}

// Takes ticket-1 (partner ClipMaster) to COMPLETED.
async function completedTicket(ctx, postOptions = {}) {
  const { api } = ctx;
  await postTicket(api, postOptions);
  await api.post(`${V1}/tickets/ticket-1/send`).set(MARIA);
  await api.post(`${V1}/tickets/ticket-1/acknowledge`).set(RAVI);
  await uploadResults(api, 'ticket-1');
  return api.post(`${V1}/tickets/ticket-1/deliver`).set(RAVI);
}

describe('the workflow over HTTP', () => {
  it('takes a ticket from PENDING to APPROVED with the right users', async () => {
    const { api } = createTestApi();
    await postAopTicket(api, {});

    const sent = await api.post(`${V1}/tickets/ticket-1/send`).set(MARIA);
    expect(sent.status).toBe(200);
    expect(sent.body).toMatchObject({ status: 'SENT', round: 1, updatedBy: 'user-maria' });
    expect(sent.body.sentAt).not.toBeNull();

    const acknowledged = await api.post(`${V1}/tickets/ticket-1/acknowledge`).set(RAVI);
    expect(acknowledged.body).toMatchObject({ status: 'IN_PROGRESS', updatedBy: 'user-ravi' });
    expect(acknowledged.body.receivedAt).not.toBeNull();

    await uploadResults(api, 'ticket-1');
    const delivered = await api.post(`${V1}/tickets/ticket-1/deliver`).set(RAVI);
    expect(delivered.body).toMatchObject({ status: 'COMPLETED' });
    expect(delivered.body.results).toHaveLength(3);

    const approved = await api.post(`${V1}/tickets/ticket-1/approve`).set(JENS);
    expect(approved.body).toMatchObject({ status: 'APPROVED', approvedBy: 'user-jens' });

    const audit = await api.get(`${V1}/tickets/ticket-1/audit`).set(MARIA);
    expect(audit.body.map((event) => event.action)).toEqual([
      'CREATED',
      'SENT',
      'ACKNOWLEDGED',
      'RESULT_UPLOADED',
      'RESULT_UPLOADED',
      'RESULT_UPLOADED',
      'DELIVERED',
      'APPROVED',
    ]);
  });

  it('sends a rejected ticket back to the partner with the reason, and a new round', async () => {
    const ctx = createTestApi();
    const { api } = ctx;
    await completedTicket(ctx);

    const rejected = await api.post(`${V1}/tickets/ticket-1/reject`).set(JENS).send({ reason: 'The colour is too dark' });
    expect(rejected.body).toMatchObject({ status: 'REJECTED', rejectionReason: 'The colour is too dark' });

    const resent = await api.post(`${V1}/tickets/ticket-1/send`).set(MARIA);
    expect(resent.body).toMatchObject({ status: 'SENT', round: 2, rejectionReason: 'The colour is too dark' });

    // The partner sees the reason on its own ticket.
    const seenByPartner = await api.get(`${V1}/tickets/ticket-1`).set(RAVI);
    expect(seenByPartner.body.rejectionReason).toBe('The colour is too dark');

    const audit = await api.get(`${V1}/tickets/ticket-1/audit`).set(MARIA);
    const rejection = audit.body.find((event) => event.action === 'REJECTED');
    expect(rejection).toMatchObject({ actorId: 'user-jens', comment: 'The colour is too dark' });
  });

  it('shows result images with a url and not the storage key', async () => {
    const ctx = createTestApi();
    const delivered = await completedTicket(ctx);

    expect(delivered.body.results[0]).toEqual({
      id: 'ticket-1-v1-front-r1',
      ticketId: 'ticket-1',
      variantId: 'ticket-1-v1',
      slot: 'FRONT',
      round: 1,
      photoId: 'ticket-1-v1_FRONT',
      uploadedAt: '2026-10-09T12:00:00.000Z',
      url: '/api/v1/files/ticket-1-v1-front-r1',
    });
    expect(JSON.stringify(delivered.body)).not.toContain('results/r1');
  });
});

describe('roles', () => {
  it('gives 403 when the role may not do it', async () => {
    const { api } = createTestApi();
    await postTicket(api);

    const manager = await postTicket(api, { headers: JENS });
    expect(manager.status).toBe(403);
    expect(manager.body).toEqual({ error: 'MANAGER users cannot create tickets' });

    expect((await postTicket(api, { headers: RAVI })).status).toBe(403);
    expect((await api.patch(`${V1}/tickets/ticket-1`).set(JENS).send({ priority: 'LOW' })).status).toBe(403);
    expect((await api.delete(`${V1}/tickets/ticket-1`).set(RAVI)).status).toBe(403);
    expect((await api.post(`${V1}/tickets/ticket-1/send`).set(JENS)).status).toBe(403);
    expect((await api.post(`${V1}/tickets/ticket-1/acknowledge`).set(MARIA)).status).toBe(403);
    expect((await api.post(`${V1}/tickets/ticket-1/deliver`).set(MARIA)).status).toBe(403);
    expect((await api.post(`${V1}/tickets/ticket-1/approve`).set(MARIA)).status).toBe(403);
    expect((await api.post(`${V1}/tickets/ticket-1/reject`).set(RAVI).send({ reason: 'x' })).status).toBe(403);
    expect(
      (await api.put(`${V1}/tickets/ticket-1/files/FRONT`).set(JENS).attach('file', PNG, image('a'))).status,
    ).toBe(403);
    expect(
      (await api.put(`${V1}/tickets/ticket-1/variants/ticket-1-v1/results/FRONT`).set(MARIA).attach('file', PNG, image('a'))).status,
    ).toBe(403);

    // Nothing happened to the ticket.
    const ticket = await api.get(`${V1}/tickets/ticket-1`).set(MARIA);
    expect(ticket.body).toMatchObject({ status: 'PENDING', priority: 'HIGH' });
  });

  it('gives 403 for the partner overview to a partner user, and lets Operators and Managers in', async () => {
    const { api } = createTestApi();

    expect((await api.get(`${V1}/partners`).set(RAVI)).status).toBe(403);
    expect((await api.get(`${V1}/partners/partner-clipmaster`).set(RAVI)).status).toBe(403);
    expect((await api.get(`${V1}/partners`).set(MARIA)).status).toBe(200);
    expect((await api.get(`${V1}/partners`).set(JENS)).status).toBe(200);
  });
});

describe('partner scoping over HTTP', () => {
  async function twoPartners() {
    const ctx = createTestApi();
    await postTicket(ctx.api, { data: validData({ partnerId: 'partner-clipmaster', articleNo: 'for-clipmaster' }) });
    await postTicket(ctx.api, { data: validData({ partnerId: 'partner-pixelworks', articleNo: 'for-pixelworks' }) });
    return ctx.api;
  }

  it('lists only the tickets of the partner', async () => {
    const api = await twoPartners();

    const ravi = await api.get(`${V1}/tickets`).set(RAVI);
    expect(ravi.body.items.map((ticket) => ticket.articleNo)).toEqual(['for-clipmaster']);
    expect(ravi.body.total).toBe(1);

    const anh = await api.get(`${V1}/tickets`).query({ partnerId: 'partner-clipmaster' }).set(ANH);
    expect(anh.body.items.map((ticket) => ticket.articleNo)).toEqual(['for-pixelworks']);

    expect((await api.get(`${V1}/tickets`).set(MARIA)).body.total).toBe(2);
  });

  it('gives 404 for the tickets, files, audit log and actions of another partner', async () => {
    const api = await twoPartners();
    await api.post(`${V1}/tickets/ticket-2/send`).set(MARIA);

    expect((await api.get(`${V1}/tickets/ticket-2`).set(RAVI)).status).toBe(404);
    expect((await api.get(`${V1}/tickets/ticket-2/audit`).set(RAVI)).status).toBe(404);
    expect((await api.get(`${V1}/files/ticket-2-front`).set(RAVI)).status).toBe(404);
    expect((await api.post(`${V1}/tickets/ticket-2/acknowledge`).set(RAVI)).status).toBe(404);
    expect(
      (await api.put(`${V1}/tickets/ticket-2/variants/ticket-2-v1/results/FRONT`).set(RAVI).attach('file', PNG, image('a'))).status,
    ).toBe(404);

    // It looks exactly like a ticket that does not exist.
    const other = await api.get(`${V1}/tickets/ticket-2`).set(RAVI);
    const missing = await api.get(`${V1}/tickets/ticket-99`).set(RAVI);
    expect(other.body.error.replace('ticket-2', 'X')).toBe(missing.body.error.replace('ticket-99', 'X'));

    // The ticket is still SENT, and its own partner can read it and its files.
    expect((await api.get(`${V1}/tickets/ticket-2`).set(MARIA)).body.status).toBe('SENT');
    expect((await api.get(`${V1}/tickets/ticket-2`).set(ANH)).status).toBe(200);
    expect((await api.get(`${V1}/files/ticket-2-front`).set(ANH)).status).toBe(200);
  });
});

describe('workflow errors', () => {
  it('gives 409 for a step in the wrong status', async () => {
    const { api } = createTestApi();
    await postTicket(api);

    const early = await api.post(`${V1}/tickets/ticket-1/acknowledge`).set(RAVI);
    expect(early.status).toBe(409);
    expect(early.body).toEqual({ error: 'A ticket can only be acknowledged while it is SENT (this one is PENDING)' });

    expect((await api.post(`${V1}/tickets/ticket-1/approve`).set(JENS)).status).toBe(409);
    expect((await api.put(`${V1}/tickets/ticket-1/variants/ticket-1-v1/results/FRONT`).set(RAVI).attach('file', PNG, image('a'))).status).toBe(409);

    await api.post(`${V1}/tickets/ticket-1/send`).set(MARIA);
    expect((await api.post(`${V1}/tickets/ticket-1/send`).set(MARIA)).status).toBe(409);
    expect((await api.patch(`${V1}/tickets/ticket-1`).set(MARIA).send({ priority: 'LOW' })).status).toBe(409);
    expect((await api.delete(`${V1}/tickets/ticket-1`).set(MARIA)).status).toBe(409);
  });

  it('gives 422 when the partner delivers without all the result images', async () => {
    const { api } = createTestApi();
    await postTicket(api);
    await api.post(`${V1}/tickets/ticket-1/send`).set(MARIA);
    await api.post(`${V1}/tickets/ticket-1/acknowledge`).set(RAVI);
    await api
      .put(`${V1}/tickets/ticket-1/variants/ticket-1-v1/results/FRONT`)
      .set(RAVI)
      .attach('file', PNG, image('front'));

    const response = await api.post(`${V1}/tickets/ticket-1/deliver`).set(RAVI);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      errors: {
        'results.ticket-1-v1.BACK': 'A result image is required',
        'results.ticket-1-v1.STYLE': 'A result image is required',
      },
    });
  });

  it('gives 422 when a rejection has no reason', async () => {
    const ctx = createTestApi();
    await completedTicket(ctx);

    for (const body of [undefined, {}, { reason: '  ' }]) {
      const request = ctx.api.post(`${V1}/tickets/ticket-1/reject`).set(JENS);
      const response = await (body ? request.send(body) : request);
      expect(response.status).toBe(422);
      expect(response.body).toEqual({ errors: { reason: 'A reason is required' } });
    }
    expect((await ctx.api.get(`${V1}/tickets/ticket-1`).set(JENS)).body.status).toBe('COMPLETED');
  });

  it('checks the result upload: slot, variant, file and type', async () => {
    const { api } = createTestApi();
    await postTicket(api);
    await api.post(`${V1}/tickets/ticket-1/send`).set(MARIA);
    await api.post(`${V1}/tickets/ticket-1/acknowledge`).set(RAVI);
    const put = (path) => api.put(`${V1}/tickets/ticket-1/variants/${path}`).set(RAVI);

    expect((await put('ticket-1-v1/results/REFERENCE').attach('file', PNG, image('a'))).status).toBe(422);
    expect((await put('ticket-1-v9/results/FRONT').attach('file', PNG, image('a'))).status).toBe(404);
    expect((await put('ticket-1-v1/results/FRONT')).status).toBe(422);
    const gif = await put('ticket-1-v1/results/FRONT').attach('file', PNG, { filename: 'a.gif', contentType: 'image/gif' });
    expect(gif.status).toBe(415);
  });
});

describe('dashboard and overviews over HTTP', () => {
  it('counts the tickets per status', async () => {
    const ctx = createTestApi();
    await completedTicket(ctx);
    await postTicket(ctx.api);
    await postTicket(ctx.api, { data: validData({ partnerId: 'partner-pixelworks' }) });

    const all = await ctx.api.get(`${V1}/dashboard/kpis`).set(MARIA);
    expect(all.body).toEqual({
      total: 3,
      byStatus: { PENDING: 2, SENT: 0, IN_PROGRESS: 0, COMPLETED: 1, APPROVED: 0, REJECTED: 0 },
    });

    const partner = await ctx.api.get(`${V1}/dashboard/kpis`).set(RAVI);
    expect(partner.body.total).toBe(2);
    expect((await ctx.api.get(`${V1}/dashboard/kpis`)).status).toBe(401);
  });

  it('shows the partners and the receipt status of their tickets', async () => {
    const ctx = createTestApi();
    await completedTicket(ctx);

    const partners = await ctx.api.get(`${V1}/partners`).set(JENS);
    expect(partners.body.map((partner) => [partner.id, partner.total])).toEqual([
      ['partner-pixelworks', 0],
      ['partner-clipmaster', 1],
    ]);
    expect(partners.body[1].counts.COMPLETED).toBe(1);

    const one = await ctx.api.get(`${V1}/partners/partner-clipmaster`).set(JENS);
    expect(one.status).toBe(200);
    expect(one.body).toMatchObject({ id: 'partner-clipmaster', name: 'ClipMaster' });
    expect(one.body.tickets[0]).toMatchObject({ id: 'ticket-1', status: 'COMPLETED', round: 1 });
    expect(one.body.tickets[0].sentAt).not.toBeNull();
    expect(one.body.tickets[0].receivedAt).not.toBeNull();
    expect(one.body.tickets[0].completedAt).not.toBeNull();

    expect((await ctx.api.get(`${V1}/partners/partner-nope`).set(JENS)).status).toBe(404);
  });

  it('lists the Approved Library with filters, and the images can be downloaded', async () => {
    const ctx = createTestApi();
    await completedTicket(ctx, { data: validAopData(), reference: true });
    expect((await ctx.api.get(`${V1}/approved-photos`).set(JENS)).body.total).toBe(0);
    await ctx.api.post(`${V1}/tickets/ticket-1/approve`).set(JENS);

    const library = await ctx.api.get(`${V1}/approved-photos`).set(JENS);

    expect(library.status).toBe(200);
    expect(library.body).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    expect(library.body.items[0]).toMatchObject({
      ticketId: 'ticket-1',
      articleNo: '15377522',
      reference: '5081887',
      partnerId: 'partner-clipmaster',
      variantId: 'ticket-1-v1',
    });
    expect(library.body.items[0].images).toEqual([
      { id: 'ticket-1-v1-front-r1', slot: 'FRONT', photoId: 'ticket-1-v1_FRONT', url: '/api/v1/files/ticket-1-v1-front-r1' },
      { id: 'ticket-1-v1-back-r1', slot: 'BACK', photoId: 'ticket-1-v1_BACK', url: '/api/v1/files/ticket-1-v1-back-r1' },
      { id: 'ticket-1-v1-style-r1', slot: 'STYLE', photoId: 'ticket-1-v1_STYLE', url: '/api/v1/files/ticket-1-v1-style-r1' },
    ]);

    const total = async (query, headers = JENS) => (await ctx.api.get(`${V1}/approved-photos`).query(query).set(headers)).body.total;
    expect(await total({ operation: 'AOP' })).toBe(1);
    expect(await total({ operation: 'RESIZE' })).toBe(0);
    expect(await total({ colourId: 'fuchsia-fedora' })).toBe(1);
    expect(await total({ q: 'nothing' })).toBe(0);
    expect(await total({}, RAVI)).toBe(1);
    expect(await total({}, ANH)).toBe(0);
    expect((await ctx.api.get(`${V1}/approved-photos`).query({ operation: 'SHARPEN' }).set(JENS)).status).toBe(422);

    const download = await ctx.api.get(library.body.items[0].images[0].url).set(RAVI);
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toMatch(/image\/png/);
    expect((await ctx.api.get(library.body.items[0].images[0].url).set(ANH)).status).toBe(404);
  });
});
