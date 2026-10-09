import { ValidationError } from './errors.js';

// Turns zod's list of issues into one message per field, keyed by the field path.
// If a field has several issues, the first one wins.
export function errorsFromZod(zodError) {
  const errors = {};
  for (const issue of zodError.issues) {
    const field = issue.path.length > 0 ? issue.path.join('.') : '_';
    if (!(field in errors)) errors[field] = issue.message;
  }
  return errors;
}

// Parses data with a zod schema and throws a ValidationError if it does not fit.
export function parseWith(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(errorsFromZod(result.error));
  return result.data;
}
