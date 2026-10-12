import { z } from 'zod';

// Small zod pieces shared by the query strings of the list endpoints.

// A date like 2026-10-09 or a full ISO timestamp. A date-only "to" runs to the end of that day.
export const dateBoundary = (isEnd) =>
  z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Use a date like 2026-10-09 or an ISO timestamp')
    .transform((value) => {
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
      const suffix = isEnd ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
      return new Date(dateOnly ? value + suffix : value).toISOString();
    })
    .optional();

export const positiveInteger = (name) =>
  z
    .coerce.number({ error: `${name} must be a whole number` })
    .int(`${name} must be a whole number`)
    .min(1, `${name} must be at least 1`);

// Search text: trimmed, and an empty text counts as no search.
export const searchText = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const page = positiveInteger('page').default(1);
export const pageSize = positiveInteger('pageSize').max(100, 'pageSize can be at most 100').default(20);
