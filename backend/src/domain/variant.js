import { z } from 'zod';
import { operationSchema } from './operations/index.js';

// A variant is one requested version of the garment, made of one or more operations.
// The rules here are generic: they never mention a specific operation.
export const variantSchema = z.object({
  operations: z
    .array(operationSchema, { error: 'A variant needs at least one operation' })
    .min(1, 'A variant needs at least one operation')
    .superRefine((operations, ctx) => {
      // At most one operation of each type per variant.
      const seen = new Set();
      operations.forEach((operation, index) => {
        if (seen.has(operation.type)) {
          ctx.addIssue({
            code: 'custom',
            path: [index],
            message: `A variant can only have one ${operation.type} operation`,
          });
        }
        seen.add(operation.type);
      });
    }),
  notes: z.string().trim().max(500, 'Notes can be at most 500 characters').nullish(),
});
