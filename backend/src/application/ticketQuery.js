import { z } from 'zod';
import { PRIORITY, SORT_FIELD, STATUS } from '../domain/constants.js';
import { parseWith } from '../domain/validation.js';

// "status=SENT,COMPLETED" (or status given twice) -> ['SENT', 'COMPLETED']
const statusList = z.preprocess(
  (value) =>
    value === undefined
      ? undefined
      : String(Array.isArray(value) ? value.join(',') : value)
          .split(',')
          .map((status) => status.trim())
          .filter(Boolean),
  z.array(z.enum(Object.values(STATUS), { error: 'Unknown status' })).optional(),
);

// A date like 2026-10-09 or a full ISO timestamp. A date-only "to" runs to the end of that day.
const dateBoundary = (isEnd) =>
  z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Use a date like 2026-10-09 or an ISO timestamp')
    .transform((value) => {
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
      const suffix = isEnd ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
      return new Date(dateOnly ? value + suffix : value).toISOString();
    })
    .optional();

const positiveInteger = (name) =>
  z.coerce.number({ error: `${name} must be a whole number` }).int(`${name} must be a whole number`).min(1, `${name} must be at least 1`);

export const ticketQuerySchema = z.object({
  status: statusList,
  priority: z.enum(Object.values(PRIORITY), { error: 'Unknown priority' }).optional(),
  partnerId: z.string().optional(),
  q: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional(),
  createdFrom: dateBoundary(false),
  createdTo: dateBoundary(true),
  sort: z.enum(Object.values(SORT_FIELD), { error: 'Unknown sort field' }).default(SORT_FIELD.CREATED_AT),
  order: z.enum(['asc', 'desc'], { error: 'The order must be asc or desc' }).default('desc'),
  page: positiveInteger('page').default(1),
  pageSize: positiveInteger('pageSize').max(100, 'pageSize can be at most 100').default(20),
});

// Turns the query string of GET /tickets into a filter for the TicketRepository.
export function parseTicketQuery(rawQuery) {
  const query = parseWith(ticketQuerySchema, rawQuery ?? {});
  const { status, ...rest } = query;
  return { ...rest, statuses: status ?? [] };
}
