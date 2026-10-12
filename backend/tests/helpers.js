import { createContainer } from '../src/compositionRoot.js';
import { users } from '../src/seed/referenceData.js';

export const NOW = '2026-10-09T12:00:00.000Z';

// The seeded users, by first name.
export const actors = Object.fromEntries(users.map((user) => [user.id.replace('user-', ''), user]));

// A 1x1 pixel PNG.
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export const pngUpload = (name) => ({ originalName: `${name}.png`, mimeType: 'image/png', buffer: PNG });

const SOURCE_NAMES = {
  FRONT: '15377522_5081887_001',
  BACK: '15377522_5081887_002',
  STYLE: '15377522_5081887_007',
};

// Ticket data without files: one solid variant. Override fields per test.
export function validData(overrides = {}) {
  return {
    articleNo: '15377522',
    reference: '5081887',
    priority: 'HIGH',
    partnerId: 'partner-clipmaster',
    guidelineText: 'Please make Granita',
    variants: [{ operations: [{ type: 'RECOLOUR', colourId: 'granita' }] }],
    ...overrides,
  };
}

// Ticket data with a variant that combines RECOLOUR and AOP (which needs a REFERENCE file).
export function validAopData(overrides = {}) {
  return validData({
    variants: [
      {
        operations: [
          { type: 'RECOLOUR', colourId: 'fuchsia-fedora' },
          { type: 'AOP', patternId: 'block-libre' },
        ],
      },
    ],
    ...overrides,
  });
}

// The three source photos, and the reference image too if asked for.
export function validUploads({ reference = false } = {}) {
  const uploads = Object.fromEntries(Object.entries(SOURCE_NAMES).map(([slot, name]) => [slot, pngUpload(name)]));
  if (reference) uploads.REFERENCE = pngUpload('Block Libre');
  return uploads;
}

// Input for the domain functions: the data with stored files (a photo ID and a file key per slot).
export function validInput(overrides = {}) {
  const file = (slot, photoId) => [slot, { photoId, file: `ticket-1/${slot.toLowerCase()}.png` }];
  return {
    ...validData(),
    files: Object.fromEntries(Object.entries(SOURCE_NAMES).map(([slot, name]) => file(slot, name))),
    ...overrides,
  };
}

export function validAopInput(overrides = {}) {
  return validInput({
    ...validAopData(),
    files: { ...validInput().files, REFERENCE: { photoId: 'Block Libre', file: 'ticket-1/reference.png' } },
    ...overrides,
  });
}

// A clock that stands still until a test moves it with `clock.set(isoTime)`.
export function testClock(initial = NOW) {
  let current = initial;
  return {
    now: () => new Date(current),
    set(isoTime) {
      current = isoTime;
    },
  };
}

// A container with the in-memory adapters and a clock that stands still. The clock is returned too.
export function testContainer() {
  const clock = testClock();
  return { ...createContainer({ clock }), clock };
}

// Creates a PENDING ticket with the three source photos through the use case.
export async function createPendingTicket(container, { aop = false, data = {} } = {}) {
  const build = aop ? validAopData : validData;
  return container.useCases.createTicket(build(data), validUploads({ reference: aop }), actors.maria);
}

// Runs a function that is expected to throw and returns the error (for async functions too).
export async function catchError(fn) {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected an error, but nothing was thrown');
}
