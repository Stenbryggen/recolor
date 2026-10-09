import { fixedClock } from '../src/adapters/clock.js';
import { createContainer } from '../src/compositionRoot.js';

export const NOW = '2026-10-09T12:00:00.000Z';

const file = (photoId) => ({ photoId, file: `uploads/${photoId}.jpg` });

// A valid input for a new ticket: one solid variant, no AOP. Override fields per test.
export function validInput(overrides = {}) {
  return {
    articleNo: '15377522',
    reference: '5081887',
    priority: 'HIGH',
    partnerId: 'partner-clipmaster',
    guidelineText: 'Please make Granita',
    variants: [{ operations: [{ type: 'RECOLOUR', colourId: 'granita' }] }],
    files: {
      FRONT: file('15377522_5081887_001'),
      BACK: file('15377522_5081887_002'),
      STYLE: file('15377522_5081887_007'),
    },
    ...overrides,
  };
}

// A valid input with a variant that combines RECOLOUR and AOP (needs a REFERENCE file).
export function validAopInput(overrides = {}) {
  const base = validInput();
  return validInput({
    variants: [
      {
        operations: [
          { type: 'RECOLOUR', colourId: 'fuchsia-fedora' },
          { type: 'AOP', patternId: 'block-libre' },
        ],
      },
    ],
    files: { ...base.files, REFERENCE: file('Block Libre') },
    ...overrides,
  });
}

// A container with the in-memory adapters and a clock that stands still.
export function testContainer() {
  return createContainer({ clock: fixedClock(NOW) });
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
