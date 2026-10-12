import { FileTooLargeError, UnsupportedFileTypeError, ValidationError } from '../domain/errors.js';

// The rules for uploaded files: JPEG or PNG images, at most 30 MB.
export const MAX_FILE_BYTES = 30 * 1024 * 1024;

// Allowed file extension -> the MIME type the upload must have.
const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

function extensionOf(name) {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

// The file name without folders and extension, e.g. "15377522_5081887_007".
export function photoIdFrom(originalName) {
  const name = originalName.split(/[\\/]/).pop();
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

// Checks an upload ({ originalName, mimeType, buffer }) and returns its file extension ('jpg' or 'png').
// Throws 415 for the wrong type, 413 for a file that is too large and 422 for an empty file.
export function checkUpload(slot, upload) {
  const extension = extensionOf(upload.originalName);

  if (!(extension in TYPES) || TYPES[extension] !== upload.mimeType) {
    throw new UnsupportedFileTypeError(`The ${slot} file must be a JPEG or PNG image`);
  }
  if (upload.buffer.length > MAX_FILE_BYTES) {
    throw new FileTooLargeError(`The ${slot} file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB`);
  }
  if (upload.buffer.length === 0) {
    throw new ValidationError({ [`files.${slot}`]: 'The file is empty' });
  }

  return extension === 'jpeg' ? 'jpg' : extension;
}

// The MIME type to serve a stored file with, based on its key.
export function contentTypeOf(key) {
  return TYPES[extensionOf(key)] ?? 'application/octet-stream';
}
