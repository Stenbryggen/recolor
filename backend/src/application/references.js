import { getOperation } from '../domain/operations/index.js';

// Checks that the partner and every colour/pattern the operations point to exist.
// The operations say which of their fields are references, so this code stays generic.
// Both parts are optional: an update may change only one of them.
export async function findUnknownReferences({ partnerId, variants = [] }, { partners, catalog }) {
  const errors = {};

  if (partnerId !== undefined && !(await partners.get(partnerId))) {
    errors.partnerId = 'Unknown partner';
  }

  for (const [v, variant] of variants.entries()) {
    for (const [o, operation] of variant.operations.entries()) {
      const { references } = getOperation(operation.type);
      for (const [field, kind] of Object.entries(references)) {
        if (!(await catalog.exists(kind, operation[field]))) {
          errors[`variants.${v}.operations.${o}.${field}`] = `Unknown ${kind}`;
        }
      }
    }
  }

  return errors;
}
