import multer from 'multer';
import { MAX_FILE_BYTES } from '../application/uploads.js';
import { BadRequestError, ValidationError } from '../domain/errors.js';

// Reads multipart/form-data into memory. The files are checked later, by the use case.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES, files: 4 } });

// POST /tickets: a `data` field and the files front, back, style and reference.
export const ticketFiles = upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 },
  { name: 'style', maxCount: 1 },
  { name: 'reference', maxCount: 1 },
]);

// PUT .../files/:slot: one file in the field `file`.
export const singleFile = upload.single('file');

function toUpload(file) {
  return { originalName: file.originalname, mimeType: file.mimetype, buffer: file.buffer };
}

// { front: [file], ... } -> { FRONT: upload, ... }
export function uploadsFromFields(files = {}) {
  const uploads = {};
  for (const [field, list] of Object.entries(files)) {
    uploads[field.toUpperCase()] = toUpload(list[0]);
  }
  return uploads;
}

// req.file -> upload. A missing file is a validation error.
export function uploadFromFile(file) {
  if (!file) throw new ValidationError({ file: 'A file is required' });
  return toUpload(file);
}

// The `data` field of POST /tickets holds the ticket as JSON.
export function parseDataField(data) {
  if (data === undefined) throw new BadRequestError('The data field is required');
  try {
    return JSON.parse(data);
  } catch {
    throw new BadRequestError('The data field must be valid JSON');
  }
}
