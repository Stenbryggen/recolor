import { describe, expect, it } from 'vitest';
import { PNG, validAopData, validData } from '../helpers.js';
import { MARIA, createTestApi, postAopTicket, postTicket } from './apiHelpers.js';

const V1 = '/api/v1';

describe('who is acting', () => {
  it('needs no user for health and the user list', async () => {
    const { api } = createTestApi();

    expect((await api.get(`${V1}/health`)).status).toBe(200);
    const users = await api.get(`${V1}/users`);
    expect(users.status).toBe(200);
    expect(users.body.map((user) => user.id)).toContain('user-maria');
  });

  it('gives 401 without an X-User-Id header, and with an unknown user', async () => {
    const { api } = createTestApi();

    const missing = await api.get(`${V1}/tickets`);
    expect(missing.status).toBe(401);
    expect(missing.body).toEqual({ error: 'Send the id of a known user in the X-User-Id header' });

    expect((await api.get(`${V1}/tickets`).set('X-User-Id', 'user-nope')).status).toBe(401);
  });

  it('gives a JSON 404 for an unknown path', async () => {
    const { api } = createTestApi();
    const response = await api.get('/api/v2/tickets');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });
});

describe('reference data', () => {
  it('lists the colours and the patterns', async () => {
    const { api } = createTestApi();

    const colours = await api.get(`${V1}/colours`).set(MARIA);
    const patterns = await api.get(`${V1}/patterns`).set(MARIA);

    expect(colours.body.map((colour) => colour.pantoneName)).toContain('Granita');
    expect(patterns.body.map((pattern) => pattern.name)).toContain('Block Libre');
  });
});

describe('POST /tickets', () => {
  it('creates a ticket from multipart data and files', async () => {
    const { api } = createTestApi();

    const response = await postTicket(api);

    expect(response.status).toBe(201);
    expect(response.headers.location).toBe('/api/v1/tickets/ticket-1');
    expect(response.body).toMatchObject({
      id: 'ticket-1',
      status: 'PENDING',
      round: 0,
      createdBy: 'user-maria',
      priority: 'HIGH',
    });
    expect(response.body.files).toEqual([
      { id: 'ticket-1-front', ticketId: 'ticket-1', slot: 'FRONT', photoId: '15377522_5081887_001', url: '/api/v1/files/ticket-1-front' },
      { id: 'ticket-1-back', ticketId: 'ticket-1', slot: 'BACK', photoId: '15377522_5081887_002', url: '/api/v1/files/ticket-1-back' },
      { id: 'ticket-1-style', ticketId: 'ticket-1', slot: 'STYLE', photoId: '15377522_5081887_007', url: '/api/v1/files/ticket-1-style' },
    ]);
  });

  it('does not show the internal storage key of a file', async () => {
    const { api } = createTestApi();
    const response = await postTicket(api);
    expect(JSON.stringify(response.body)).not.toContain('ticket-1/front');
  });

  it('accepts a variant with RECOLOUR and AOP when the reference image is uploaded', async () => {
    const { api } = createTestApi();

    const response = await postAopTicket(api);

    expect(response.status).toBe(201);
    expect(response.body.files.map((file) => file.slot)).toContain('REFERENCE');
    expect(response.body.variants[0].operations.map((operation) => operation.type)).toEqual(['RECOLOUR', 'AOP']);
  });

  it('gives 422 with an error per field', async () => {
    const { api } = createTestApi();
    const data = validAopData({
      articleNo: '',
      variants: [
        { operations: [{ type: 'RECOLOUR', colourId: 'granita' }] },
        { operations: [{ type: 'RECOLOUR', colourId: 'night-sky' }, { type: 'AOP' }] },
      ],
    });

    const response = await postTicket(api, { data, reference: true });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      errors: {
        articleNo: 'An article number is required',
        'variants.1.operations.1.patternId': 'A pattern is required for AOP',
      },
    });
  });

  it('gives 422 when AOP is used without the reference image', async () => {
    const { api } = createTestApi();

    const response = await postTicket(api, { data: validAopData(), reference: false });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ errors: { 'files.REFERENCE': 'A REFERENCE file is required' } });
  });

  it('gives 422 for an unknown partner', async () => {
    const { api } = createTestApi();
    const response = await postTicket(api, { data: validData({ partnerId: 'partner-nope' }) });
    expect(response.body).toEqual({ errors: { partnerId: 'Unknown partner' } });
  });

  it('gives 400 when the data field is missing or is not JSON', async () => {
    const { api } = createTestApi();

    const missing = await api.post(`${V1}/tickets`).set(MARIA).attach('front', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({ error: 'The data field is required' });

    const broken = await api.post(`${V1}/tickets`).set(MARIA).field('data', '{not json');
    expect(broken.status).toBe(400);
    expect(broken.body).toEqual({ error: 'The data field must be valid JSON' });
  });

  it('gives 415 for a file that is not a JPEG or PNG image', async () => {
    const { api } = createTestApi();

    const response = await api
      .post(`${V1}/tickets`)
      .set(MARIA)
      .field('data', JSON.stringify(validData()))
      .attach('front', Buffer.from('%PDF-1.4'), { filename: 'front.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(415);
    expect(response.body).toEqual({ error: 'The FRONT file must be a JPEG or PNG image' });
  });

  it('gives 413 for a file that is too large', async () => {
    const { api } = createTestApi();

    const response = await api
      .post(`${V1}/tickets`)
      .set(MARIA)
      .field('data', JSON.stringify(validData()))
      .attach('front', Buffer.alloc(31 * 1024 * 1024), { filename: 'front.png', contentType: 'image/png' });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: 'The file is too large' });
  });

  it('gives 400 for a file in a field that does not exist', async () => {
    const { api } = createTestApi();

    const response = await api
      .post(`${V1}/tickets`)
      .set(MARIA)
      .field('data', JSON.stringify(validData()))
      .attach('side', PNG, { filename: 'side.png', contentType: 'image/png' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Unexpected file field "side"' });
  });

  it('stores nothing when the request is refused', async () => {
    const { api } = createTestApi();

    await postTicket(api, { data: validData({ articleNo: '' }) });

    const list = await api.get(`${V1}/tickets`).set(MARIA);
    expect(list.body.total).toBe(0);
  });
});

describe('GET /tickets', () => {
  async function apiWithTickets() {
    const ctx = createTestApi();
    await postTicket(ctx.api, { data: validData({ articleNo: '111', priority: 'LOW' }) });
    await postTicket(ctx.api, { data: validData({ articleNo: '222', priority: 'HIGH', partnerId: 'partner-pixelworks' }) });
    await postAopTicket(ctx.api, { data: validAopData({ articleNo: '333', priority: 'NORMAL' }) });
    return ctx;
  }

  it('lists tickets newest first with total, page and pageSize', async () => {
    const { api } = await apiWithTickets();

    const response = await api.get(`${V1}/tickets`).set(MARIA);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ total: 3, page: 1, pageSize: 20 });
    expect(response.body.items.map((ticket) => ticket.articleNo)).toEqual(['333', '222', '111']);
    expect(response.body.items[0].files[0].url).toBe('/api/v1/files/ticket-3-front');
  });

  it('filters on priority, partner and search text', async () => {
    const { api } = await apiWithTickets();
    const articleNos = async (query) => (await api.get(`${V1}/tickets`).query(query).set(MARIA)).body.items.map((t) => t.articleNo);

    expect(await articleNos({ priority: 'HIGH' })).toEqual(['222']);
    expect(await articleNos({ partnerId: 'partner-pixelworks' })).toEqual(['222']);
    expect(await articleNos({ q: '11' })).toEqual(['111']);
    expect(await articleNos({ status: 'SENT' })).toEqual([]);
    expect(await articleNos({ status: 'PENDING,SENT' })).toHaveLength(3);
  });

  it('sorts and pages', async () => {
    const { api } = await apiWithTickets();

    const response = await api.get(`${V1}/tickets`).query({ sort: 'priority', order: 'desc', page: 2, pageSize: 2 }).set(MARIA);

    expect(response.body).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(response.body.items.map((ticket) => ticket.priority)).toEqual(['LOW']);
  });

  it('filters on created date', async () => {
    const { api, container } = createTestApi();
    container.clock.set('2026-10-01T10:00:00.000Z');
    await postTicket(api, { data: validData({ articleNo: 'old' }) });
    container.clock.set('2026-10-09T10:00:00.000Z');
    await postTicket(api, { data: validData({ articleNo: 'new' }) });

    const found = await api.get(`${V1}/tickets`).query({ createdFrom: '2026-10-05', createdTo: '2026-10-09' }).set(MARIA);

    expect(found.body.items.map((ticket) => ticket.articleNo)).toEqual(['new']);
  });

  it('gives 422 for bad query values', async () => {
    const { api } = await apiWithTickets();

    const response = await api.get(`${V1}/tickets`).query({ status: 'NOPE', pageSize: 1000 }).set(MARIA);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      errors: { 'status.0': 'Unknown status', pageSize: 'pageSize can be at most 100' },
    });
  });
});

describe('GET /tickets/:id', () => {
  it('returns the ticket, or 404', async () => {
    const { api } = createTestApi();
    await postAopTicket(api);

    const found = await api.get(`${V1}/tickets/ticket-1`).set(MARIA);
    expect(found.status).toBe(200);
    expect(found.body.variants[0].id).toBe('ticket-1-v1');

    const missing = await api.get(`${V1}/tickets/ticket-9`).set(MARIA);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: 'Ticket ticket-9 was not found' });
  });
});

describe('PATCH /tickets/:id', () => {
  it('changes fields and stamps who and when', async () => {
    const { api, container } = createTestApi();
    await postTicket(api);
    container.clock.set('2026-10-10T08:00:00.000Z');

    const response = await api
      .patch(`${V1}/tickets/ticket-1`)
      .set('X-User-Id', 'user-thomas')
      .send({ priority: 'LOW', guidelineText: 'New text' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      priority: 'LOW',
      guidelineText: 'New text',
      updatedBy: 'user-thomas',
      updatedAt: '2026-10-10T08:00:00.000Z',
      createdBy: 'user-maria',
    });
  });

  it('gives 422 for invalid values and for fields that cannot be changed', async () => {
    const { api } = createTestApi();
    await postTicket(api);

    const invalid = await api.patch(`${V1}/tickets/ticket-1`).set(MARIA).send({ priority: 'URGENT' });
    expect(invalid.status).toBe(422);
    expect(invalid.body).toEqual({ errors: { priority: 'The priority must be LOW, NORMAL or HIGH' } });

    const status = await api.patch(`${V1}/tickets/ticket-1`).set(MARIA).send({ status: 'APPROVED' });
    expect(status.status).toBe(422);

    const empty = await api.patch(`${V1}/tickets/ticket-1`).set(MARIA).send({});
    expect(empty.body).toEqual({ errors: { _: 'Provide at least one field to change' } });
  });

  it('gives 400 for a body that is not JSON, and 404 for an unknown ticket', async () => {
    const { api } = createTestApi();
    await postTicket(api);

    const broken = await api.patch(`${V1}/tickets/ticket-1`).set(MARIA).set('Content-Type', 'application/json').send('{oops');
    expect(broken.status).toBe(400);

    expect((await api.patch(`${V1}/tickets/ticket-9`).set(MARIA).send({ priority: 'LOW' })).status).toBe(404);
  });

  it('gives 409 when the ticket is no longer PENDING', async () => {
    const { api, container } = createTestApi();
    await postTicket(api);
    const ticket = await container.repositories.tickets.get('ticket-1');
    await container.repositories.tickets.update({ ...ticket, status: 'SENT' });

    const response = await api.patch(`${V1}/tickets/ticket-1`).set(MARIA).send({ priority: 'LOW' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'A ticket can only be changed while it is PENDING (this one is SENT)' });
  });
});

describe('PUT /tickets/:id/files/:slot', () => {
  it('replaces a file', async () => {
    const { api } = createTestApi();
    await postTicket(api);

    const response = await api
      .put(`${V1}/tickets/ticket-1/files/FRONT`)
      .set(MARIA)
      .attach('file', PNG, { filename: 'new_front.png', contentType: 'image/png' });

    expect(response.status).toBe(200);
    expect(response.body.files.find((file) => file.slot === 'FRONT').photoId).toBe('new_front');
  });

  it('gives 422 without a file or with an unknown slot, 415 for the wrong type and 409 when not PENDING', async () => {
    const { api, container } = createTestApi();
    await postTicket(api);

    const noFile = await api.put(`${V1}/tickets/ticket-1/files/FRONT`).set(MARIA);
    expect(noFile.status).toBe(422);
    expect(noFile.body).toEqual({ errors: { file: 'A file is required' } });

    const badSlot = await api
      .put(`${V1}/tickets/ticket-1/files/SIDE`)
      .set(MARIA)
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(badSlot.status).toBe(422);

    const badType = await api
      .put(`${V1}/tickets/ticket-1/files/FRONT`)
      .set(MARIA)
      .attach('file', PNG, { filename: 'a.gif', contentType: 'image/gif' });
    expect(badType.status).toBe(415);

    const ticket = await container.repositories.tickets.get('ticket-1');
    await container.repositories.tickets.update({ ...ticket, status: 'SENT' });
    const sent = await api
      .put(`${V1}/tickets/ticket-1/files/FRONT`)
      .set(MARIA)
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(sent.status).toBe(409);
  });
});

describe('DELETE /tickets/:id', () => {
  it('deletes a PENDING ticket (204) and then it is gone (404)', async () => {
    const { api } = createTestApi();
    await postTicket(api);

    const deleted = await api.delete(`${V1}/tickets/ticket-1`).set(MARIA);
    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe('');

    expect((await api.get(`${V1}/tickets/ticket-1`).set(MARIA)).status).toBe(404);
    expect((await api.get(`${V1}/files/ticket-1-front`).set(MARIA)).status).toBe(404);
    expect((await api.delete(`${V1}/tickets/ticket-1`).set(MARIA)).status).toBe(404);
  });

  it('gives 409 for a ticket that is no longer PENDING', async () => {
    const { api, container } = createTestApi();
    await postTicket(api);
    const ticket = await container.repositories.tickets.get('ticket-1');
    await container.repositories.tickets.update({ ...ticket, status: 'APPROVED' });

    expect((await api.delete(`${V1}/tickets/ticket-1`).set(MARIA)).status).toBe(409);
  });
});

describe('GET /tickets/:id/audit', () => {
  it('lists what happened to the ticket, with who and when', async () => {
    const { api, container } = createTestApi();
    await postTicket(api);
    container.clock.set('2026-10-10T08:00:00.000Z');
    await api.patch(`${V1}/tickets/ticket-1`).set('X-User-Id', 'user-thomas').send({ priority: 'LOW' });
    await api
      .put(`${V1}/tickets/ticket-1/files/BACK`)
      .set(MARIA)
      .attach('file', PNG, { filename: 'new_back.png', contentType: 'image/png' });

    const response = await api.get(`${V1}/tickets/ticket-1/audit`).set(MARIA);

    expect(response.status).toBe(200);
    expect(response.body.map((event) => [event.action, event.actorId, event.at])).toEqual([
      ['CREATED', 'user-maria', '2026-10-09T12:00:00.000Z'],
      ['UPDATED', 'user-thomas', '2026-10-10T08:00:00.000Z'],
      ['FILE_REPLACED', 'user-maria', '2026-10-10T08:00:00.000Z'],
    ]);
    expect(response.body[1].changes).toEqual([{ field: 'priority', from: 'HIGH', to: 'LOW' }]);
  });

  it('gives 404 for an unknown ticket', async () => {
    const { api } = createTestApi();
    expect((await api.get(`${V1}/tickets/ticket-9/audit`).set(MARIA)).status).toBe(404);
  });
});

describe('GET /files/:id', () => {
  it('returns the uploaded file with its content type', async () => {
    const { api } = createTestApi();
    await postTicket(api);

    const response = await api.get(`${V1}/files/ticket-1-front`).set(MARIA).buffer(true).parse((res, done) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => done(null, Buffer.concat(chunks)));
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/image\/png/);
    expect(response.headers['content-disposition']).toBe('inline; filename="15377522_5081887_001"');
    expect(response.body.equals(PNG)).toBe(true);
  });

  it('gives 404 for an unknown file and 401 without a user', async () => {
    const { api } = createTestApi();
    expect((await api.get(`${V1}/files/nope`).set(MARIA)).status).toBe(404);
    expect((await api.get(`${V1}/files/ticket-1-front`)).status).toBe(401);
  });
});
