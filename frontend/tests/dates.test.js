import { describe, expect, it } from 'vitest';
import { endOfDay, startOfDay } from '../src/dates.js';

describe('dates', () => {
  const date = new Date(2026, 9, 13, 15, 30); // 13 October 2026, local time

  it('starts a day at midnight, local time', () => {
    expect(new Date(startOfDay(date))).toEqual(new Date(2026, 9, 13, 0, 0, 0, 0));
  });

  it('ends a day at the last millisecond, local time', () => {
    expect(new Date(endOfDay(date))).toEqual(new Date(2026, 9, 13, 23, 59, 59, 999));
  });

  it('gives nothing when there is no date', () => {
    expect(startOfDay(null)).toBeUndefined();
    expect(endOfDay(null)).toBeUndefined();
  });
});
