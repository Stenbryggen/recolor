import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/domain/errors.js';
import { parseTicketQuery } from '../../src/application/ticketQuery.js';
import { catchError } from '../helpers.js';

describe('parseTicketQuery', () => {
  it('has defaults for sorting and paging', () => {
    expect(parseTicketQuery({})).toEqual({
      statuses: [],
      sort: 'createdAt',
      order: 'desc',
      page: 1,
      pageSize: 20,
    });
  });

  it('reads status as a comma separated list, or given more than once', () => {
    expect(parseTicketQuery({ status: 'SENT,COMPLETED' }).statuses).toEqual(['SENT', 'COMPLETED']);
    expect(parseTicketQuery({ status: ['SENT', 'COMPLETED'] }).statuses).toEqual(['SENT', 'COMPLETED']);
  });

  it('reads the other filters and turns numbers from text into numbers', () => {
    const filter = parseTicketQuery({
      priority: 'HIGH',
      partnerId: 'partner-clipmaster',
      q: ' 5081 ',
      sort: 'priority',
      order: 'asc',
      page: '2',
      pageSize: '5',
    });

    expect(filter).toMatchObject({
      priority: 'HIGH',
      partnerId: 'partner-clipmaster',
      q: '5081',
      sort: 'priority',
      order: 'asc',
      page: 2,
      pageSize: 5,
    });
  });

  it('ignores an empty q', () => {
    expect(parseTicketQuery({ q: '  ' }).q).toBeUndefined();
  });

  it('turns dates into timestamps, and lets a date-only createdTo run to the end of the day', () => {
    const filter = parseTicketQuery({ createdFrom: '2026-10-09', createdTo: '2026-10-09' });

    expect(filter.createdFrom).toBe('2026-10-09T00:00:00.000Z');
    expect(filter.createdTo).toBe('2026-10-09T23:59:59.999Z');
  });

  it('gives an error per field for bad values', async () => {
    const error = await catchError(() =>
      parseTicketQuery({
        status: 'SENT,NOPE',
        priority: 'URGENT',
        createdFrom: 'yesterday',
        sort: 'colour',
        order: 'up',
        page: '0',
        pageSize: '500',
      }),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toEqual({
      'status.1': 'Unknown status',
      priority: 'Unknown priority',
      createdFrom: 'Use a date like 2026-10-09 or an ISO timestamp',
      sort: 'Unknown sort field',
      order: 'The order must be asc or desc',
      page: 'page must be at least 1',
      pageSize: 'pageSize can be at most 100',
    });
  });

  it('refuses a page that is not a number', async () => {
    const error = await catchError(() => parseTicketQuery({ page: 'abc' }));
    expect(error.errors).toEqual({ page: 'page must be a whole number' });
  });
});
