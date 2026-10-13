// A date picker gives a Date. The API wants a time, so a range "from–to" runs from the start
// of the first day to the end of the last day.

export const startOfDay = (date) =>
  date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString() : undefined;

export const endOfDay = (date) =>
  date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString() : undefined;
