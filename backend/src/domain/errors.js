// Errors the domain and the use cases throw. The API layer (step 2) turns them into HTTP responses.

// Invalid input. `errors` has one message per field, keyed by the field path,
// e.g. { 'variants.1.operations.1.patternId': 'A pattern is required for AOP' }.
export class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class NotFoundError extends Error {
  constructor(what, id) {
    super(`${what} ${id} was not found`);
    this.name = 'NotFoundError';
  }
}
