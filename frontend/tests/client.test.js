import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, setActingUser } from '../src/api/client.js';

function answer(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

afterEach(() => {
  setActingUser(null);
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('sends the acting user in the X-User-Id header', async () => {
    const fetch = answer(200, { ok: true });
    vi.stubGlobal('fetch', fetch);
    setActingUser('user-maria');

    await request('/tickets');

    expect(fetch.mock.calls[0][0]).toBe('/api/v1/tickets');
    expect(fetch.mock.calls[0][1].headers['X-User-Id']).toBe('user-maria');
  });

  it('leaves out empty query values', async () => {
    const fetch = answer(200, {});
    vi.stubGlobal('fetch', fetch);

    await request('/tickets', { query: { status: 'SENT', q: '', priority: null, page: 2 } });

    expect(fetch.mock.calls[0][0]).toBe('/api/v1/tickets?status=SENT&page=2');
  });

  it('sends json with a content type', async () => {
    const fetch = answer(200, {});
    vi.stubGlobal('fetch', fetch);

    await request('/tickets/ticket-1/reject', { method: 'POST', json: { reason: 'Two clipping paths' } });

    const options = fetch.mock.calls[0][1];
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.body).toBe('{"reason":"Two clipping paths"}');
  });

  it('returns null for 204', async () => {
    vi.stubGlobal('fetch', answer(204));
    expect(await request('/tickets/ticket-1', { method: 'DELETE' })).toBeNull();
  });

  it('turns an error answer into an ApiError with the message per field', async () => {
    vi.stubGlobal('fetch', answer(422, { errors: { articleNo: 'An article number is required' } }));

    const error = await request('/tickets', { method: 'POST' }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.errors).toEqual({ articleNo: 'An article number is required' });
  });

  it('uses the message of the API for other errors', async () => {
    vi.stubGlobal('fetch', answer(409, { error: 'A ticket can only be sent while it is PENDING' }));

    const error = await request('/tickets/ticket-1/send', { method: 'POST' }).catch((e) => e);

    expect(error.status).toBe(409);
    expect(error.message).toBe('A ticket can only be sent while it is PENDING');
  });
});
