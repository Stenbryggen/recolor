import multer from 'multer';
import {
  BadRequestError,
  ConflictError,
  FileTooLargeError,
  NotFoundError,
  UnauthorizedError,
  UnsupportedFileTypeError,
  ValidationError,
} from '../domain/errors.js';

// Turns errors into the responses described in the README (*Conventions*).
// Validation errors give { errors: { field: message } }, everything else { error: message }.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ValidationError) return res.status(422).json({ errors: err.errors });

  const statusFor = [
    [BadRequestError, 400],
    [UnauthorizedError, 401],
    [NotFoundError, 404],
    [ConflictError, 409],
    [FileTooLargeError, 413],
    [UnsupportedFileTypeError, 415],
  ];
  for (const [ErrorClass, status] of statusFor) {
    if (err instanceof ErrorClass) return res.status(status).json({ error: err.message });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'The file is too large' });
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: `Unexpected file field "${err.field}"` });
    }
    return res.status(400).json({ error: err.message });
  }

  // Errors from express.json()
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request body is not valid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'The request body is too large' });

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}
