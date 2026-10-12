// There is no login. Every request says who is acting in the X-User-Id header,
// and the user is looked up. An unknown or missing user gives 401 (see errorHandler.js).
// This simulates identity; it is not security.
export function requireUser(identifyUser) {
  return async (req, res, next) => {
    req.actor = await identifyUser(req.get('X-User-Id'));
    next();
  };
}
