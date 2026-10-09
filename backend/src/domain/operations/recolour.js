import { z } from 'zod';

// RECOLOUR: change the garment to a Pantone colour from the colour list.
export const recolour = {
  type: 'RECOLOUR',

  schema: z.object({
    type: z.literal('RECOLOUR'),
    colourId: z
      .string({ error: 'A colour is required for RECOLOUR' })
      .min(1, 'A colour is required for RECOLOUR'),
  }),

  // Slots this operation needs on the ticket, beyond the three source photos.
  requiredFiles: [],

  // Fields that must point to an existing item in a lookup list.
  references: { colourId: 'colour' },
};
