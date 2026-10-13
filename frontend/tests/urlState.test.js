import { describe, expect, it } from 'vitest';
import { fromDateParam, toDateParam } from '../src/dates.js';
import { filtersFromQuery, filtersToQuery, pagingFromQuery, pagingToQuery } from '../src/urlState.js';

const fields = { statuses: 'list', priority: 'text', q: 'text', createdFrom: 'date' };

describe('date parameters', () => {
  it('writes and reads a day', () => {
    expect(toDateParam(new Date(2026, 9, 3))).toBe('2026-10-03');
    expect(fromDateParam('2026-10-03')).toEqual(new Date(2026, 9, 3));
  });

  it('refuses text that is not a real date', () => {
    expect(fromDateParam('banana')).toBeNull();
    expect(fromDateParam('2026-02-31')).toBeNull();
    expect(fromDateParam(undefined)).toBeNull();
  });
});

describe('filters in the URL', () => {
  const filters = { statuses: ['SENT', 'IN_PROGRESS'], priority: 'HIGH', q: '', createdFrom: new Date(2026, 9, 1) };

  it('writes only the filters that are set', () => {
    expect(filtersToQuery(fields, filters)).toEqual({
      statuses: 'SENT,IN_PROGRESS',
      priority: 'HIGH',
      createdFrom: '2026-10-01',
    });
  });

  it('reads them back', () => {
    const query = filtersToQuery(fields, filters);
    expect(filtersFromQuery(fields, query)).toEqual({
      statuses: ['SENT', 'IN_PROGRESS'],
      priority: 'HIGH',
      createdFrom: new Date(2026, 9, 1),
    });
  });

  it('ignores empty values and takes the first of a repeated parameter', () => {
    expect(filtersFromQuery(fields, { priority: '', q: ['abc', 'def'], other: 'x' })).toEqual({ q: 'abc' });
  });
});

describe('paging in the URL', () => {
  const defaults = { page: 1, pageSize: 10, sort: 'createdAt', order: 'desc' };

  it('writes only what differs from the defaults', () => {
    expect(pagingToQuery(defaults, defaults)).toEqual({});
    expect(pagingToQuery({ ...defaults, page: 3, order: 'asc' }, defaults)).toEqual({ page: '3', order: 'asc' });
  });

  it('reads numbers and the order, and ignores nonsense', () => {
    expect(pagingFromQuery({ page: '3', pageSize: '25', sort: 'status', order: 'asc' })).toEqual({
      page: 3,
      pageSize: 25,
      sort: 'status',
      order: 'asc',
    });
    expect(pagingFromQuery({ page: '0', pageSize: 'many', order: 'sideways' })).toEqual({});
  });
});
