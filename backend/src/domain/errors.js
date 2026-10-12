// Errors the domain and the use cases throw. The HTTP layer turns them into responses
// (see src/middleware/errorHandler.js).

// Invalid input. `errors` has one message per field, keyed by the field path,
// e.g. { 'variants.1.operations.1.patternId': 'A pattern is required for AOP' }.
export class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// The request itself is malformed (for example JSON that cannot be read).
export class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequestError';
  }
}

// Unknown or missing user.
export class UnauthorizedError extends Error {
  constructor(message = 'Unknown user') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends Error {
  constructor(what, id) {
    super(`${what} ${id} was not found`);
    this.name = 'NotFoundError';
  }
}

// The request is fine, but not allowed in the ticket's current status.
export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class FileTooLargeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FileTooLargeError';
  }
}

export class UnsupportedFileTypeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedFileTypeError';
  }
}
