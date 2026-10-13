import { fromDateParam, toDateParam } from './dates.js';

// The filters, the page and the sorting of a list live in the URL query, so a link gives
// the receiver the same view. `fields` says how each filter is written in the URL:
//   { statuses: 'list', priority: 'text', createdFrom: 'date' }

const PAGING_KEYS = ['page', 'pageSize', 'sort', 'order'];

// A repeated parameter (?a=1&a=2) arrives as an array; the first one counts.
const first = (value) => (Array.isArray(value) ? value[0] : value);

export function filtersToQuery(fields, filters) {
  const query = {};
  for (const [name, type] of Object.entries(fields)) {
    const value = filters[name];
    if (type === 'list' && value.length > 0) query[name] = value.join(',');
    if (type === 'text' && value) query[name] = value;
    if (type === 'date' && value) query[name] = toDateParam(value);
  }
  return query;
}

export function filtersFromQuery(fields, query) {
  const filters = {};
  for (const [name, type] of Object.entries(fields)) {
    const value = first(query[name]);
    if (value === undefined || value === null || value === '') continue;
    if (type === 'list') filters[name] = String(value).split(',').filter(Boolean);
    if (type === 'text') filters[name] = String(value);
    if (type === 'date') filters[name] = fromDateParam(String(value));
  }
  return filters;
}

// Only what differs from the defaults is written, which keeps the URL short.
export function pagingToQuery(paging, defaults) {
  const query = {};
  for (const key of PAGING_KEYS) {
    if (paging[key] !== undefined && paging[key] !== defaults[key]) query[key] = String(paging[key]);
  }
  return query;
}

const positiveInteger = (value) => (/^[1-9]\d*$/.test(String(value)) ? Number(value) : undefined);

export function pagingFromQuery(query) {
  const paging = {};
  const page = positiveInteger(first(query.page));
  const pageSize = positiveInteger(first(query.pageSize));
  const sort = first(query.sort);
  const order = first(query.order);
  if (page) paging.page = page;
  if (pageSize) paging.pageSize = pageSize;
  if (sort) paging.sort = String(sort);
  if (order === 'asc' || order === 'desc') paging.order = order;
  return paging;
}
