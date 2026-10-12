import { z } from 'zod';
import { operationTypes } from '../domain/operations/index.js';
import { parseWith } from '../domain/validation.js';
import { dateBoundary, page, pageSize, searchText } from './queryParts.js';

export const approvedPhotoQuerySchema = z.object({
  q: searchText,
  partnerId: z.string().optional(),
  operation: z.enum(operationTypes, { error: `The operation must be one of ${operationTypes.join(', ')}` }).optional(),
  colourId: z.string().optional(),
  approvedFrom: dateBoundary(false),
  approvedTo: dateBoundary(true),
  page,
  pageSize,
});

// Turns the query string of GET /approved-photos into a filter for the ApprovedPhotoReader.
export function parseApprovedPhotoQuery(rawQuery) {
  return parseWith(approvedPhotoQuerySchema, rawQuery ?? {});
}
