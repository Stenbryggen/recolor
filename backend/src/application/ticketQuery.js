import { z } from 'zod';
import { PRIORITY, SORT_FIELD, STATUS } from '../domain/constants.js';
import { parseWith } from '../domain/validation.js';
import { dateBoundary, page, pageSize, searchText } from './queryParts.js';

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

export const ticketQuerySchema = z.object({
  status: statusList,
  priority: z.enum(Object.values(PRIORITY), { error: 'Unknown priority' }).optional(),
  partnerId: z.string().optional(),
  q: searchText,
  createdFrom: dateBoundary(false),
  createdTo: dateBoundary(true),
  sort: z.enum(Object.values(SORT_FIELD), { error: 'Unknown sort field' }).default(SORT_FIELD.CREATED_AT),
  order: z.enum(['asc', 'desc'], { error: 'The order must be asc or desc' }).default('desc'),
  page,
  pageSize,
});

// Turns the query string of GET /tickets into a filter for the TicketRepository.
export function parseTicketQuery(rawQuery) {
  const query = parseWith(ticketQuerySchema, rawQuery ?? {});
  const { status, ...rest } = query;
  return { ...rest, statuses: status ?? [] };
}
