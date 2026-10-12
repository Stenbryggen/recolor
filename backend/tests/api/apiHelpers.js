import request from 'supertest';
import { createApp } from '../../src/app.js';
import { PNG, testContainer, validAopData, validData } from '../helpers.js';

export const MARIA = { 'X-User-Id': 'user-maria' };

// An Express app on top of a fresh test container. Use `api.get(...)` etc. like supertest.
export function createTestApi() {
  const container = testContainer();
  return { container, api: request(createApp(container)) };
}

const png = { contentType: 'image/png' };

// POST /tickets with a data field and the three source photos (and the reference image if asked).
export function postTicket(api, { data = validData(), reference = false, headers = MARIA } = {}) {
  let req = api.post('/api/v1/tickets').set(headers).field('data', JSON.stringify(data));
  req = req
    .attach('front', PNG, { filename: '15377522_5081887_001.png', ...png })
    .attach('back', PNG, { filename: '15377522_5081887_002.png', ...png })
    .attach('style', PNG, { filename: '15377522_5081887_007.png', ...png });
  if (reference) req = req.attach('reference', PNG, { filename: 'Block Libre.png', ...png });
  return req;
}

export const postAopTicket = (api, options = {}) =>
  postTicket(api, { data: validAopData(), reference: true, ...options });
