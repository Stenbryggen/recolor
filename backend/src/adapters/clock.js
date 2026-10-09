// Implementations of the Clock port.

export const systemClock = {
  now: () => new Date(),
};

// A clock that always returns the same time. Used in tests.
export function fixedClock(isoTime) {
  return { now: () => new Date(isoTime) };
}
