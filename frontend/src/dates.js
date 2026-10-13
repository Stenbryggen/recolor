// A date picker gives a Date. The API wants a time, so a range "from–to" runs from the start
// of the first day to the end of the last day.

export const startOfDay = (date) =>
  date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString() : undefined;

export const endOfDay = (date) =>
  date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString() : undefined;

// A day in the URL: 2026-10-13 (local time).
const two = (n) => String(n).padStart(2, '0');

export const toDateParam = (date) => `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;

// Returns null for anything that is not a real date, so a bad link just gives no filter.
export function fromDateParam(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? '');
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
