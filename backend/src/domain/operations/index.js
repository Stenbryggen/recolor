import { z } from 'zod';
import { recolour } from './recolour.js';
import { aop } from './aop.js';
import { resize } from './resize.js';

// The operations registry. Each operation defines its own schema, the slots it
// requires and the lookup lists it refers to. The ticket and variant code only
// asks the registry, so a new kind of work is one new file plus one line here.
const definitions = [recolour, aop, resize];

export const operations = Object.freeze(
  Object.fromEntries(definitions.map((operation) => [operation.type, operation])),
);

export const operationTypes = definitions.map((operation) => operation.type);

export function getOperation(type) {
  return operations[type];
}

// Validates any operation by looking up the schema of its `type`.
export const operationSchema = z.discriminatedUnion(
  'type',
  definitions.map((operation) => operation.schema),
  { error: `The operation type must be one of ${operationTypes.join(', ')}` },
);
