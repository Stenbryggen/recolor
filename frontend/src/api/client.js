// The only place that talks to the backend. Every request carries the acting user in the
// X-User-Id header (there is no login, see the README).

let actingUserId = null;

export function setActingUser(userId) {
  actingUserId = userId;
}

// An answer from the API that is not 2xx. `errors` holds the message per field for a 422.
export class ApiError extends Error {
  constructor(status, message, errors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

function withQuery(path, query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

async function send(path, { method = 'GET', query, json, form } = {}) {
  const headers = {};
  if (actingUserId) headers['X-User-Id'] = actingUserId;

  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form; // the browser sets the multipart header itself
  }

  const response = await fetch(withQuery(`/api/v1${path}`, query), { method, headers, body });
  if (response.ok) return response;

  const data = await response.json().catch(() => ({}));
  throw new ApiError(response.status, data.error ?? `Request failed (${response.status})`, data.errors);
}

export async function request(path, options) {
  const response = await send(path, options);
  return response.status === 204 ? null : response.json();
}

// Files need the X-User-Id header too, so an <img src> cannot load them directly.
export async function fetchFileBlob(url) {
  const response = await fetch(url, { headers: actingUserId ? { 'X-User-Id': actingUserId } : {} });
  if (!response.ok) throw new ApiError(response.status, `Could not load the file (${response.status})`);
  return response.blob();
}

// The file as an object URL that an <img> can show. Free it with URL.revokeObjectURL.
export async function fetchFileUrl(url) {
  return URL.createObjectURL(await fetchFileBlob(url));
}
