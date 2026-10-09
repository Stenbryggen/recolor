import { z } from 'zod';
import { SLOT } from '../constants.js';

// AOP (all-over print): give the fabric a pattern over its whole surface.
export const aop = {
  type: 'AOP',

  schema: z.object({
    type: z.literal('AOP'),
    patternId: z
      .string({ error: 'A pattern is required for AOP' })
      .min(1, 'A pattern is required for AOP'),
  }),

  // The reference image shows how the print should look.
  requiredFiles: [SLOT.REFERENCE],

  references: { patternId: 'pattern' },
};
