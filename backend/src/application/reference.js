import { UnauthorizedError } from '../domain/errors.js';

// Small queries for the reference data and for finding out who is acting.

export function makeIdentifyUser({ users }) {
  return async function identifyUser(userId) {
    const user = userId ? await users.get(userId) : null;
    if (!user) throw new UnauthorizedError('Send the id of a known user in the X-User-Id header');
    return user;
  };
}

export function makeListUsers({ users }) {
  return () => users.list();
}

export function makeListColours({ catalog }) {
  return () => catalog.list('colour');
}

export function makeListPatterns({ catalog }) {
  return () => catalog.list('pattern');
}
