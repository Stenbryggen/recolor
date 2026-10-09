import { z } from 'zod';

const size = (name) =>
  z
    .number({ error: `A ${name} is required for RESIZE` })
    .int(`The ${name} must be a whole number`)
    .positive(`The ${name} must be greater than 0`);

// RESIZE: change the image size.
export const resize = {
  type: 'RESIZE',

  schema: z.object({
    type: z.literal('RESIZE'),
    width: size('width'),
    height: size('height'),
  }),

  requiredFiles: [],

  references: {},
};
