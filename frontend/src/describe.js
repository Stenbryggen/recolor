import { OPERATION_LABEL, SLOT_LABEL } from './vocabulary.js';

// A short text for an operation, e.g. "Night Sky" or "AOP Dots (Cloud Dancer)".
export function describeOperation(operation, { colours = [], patterns = [] } = {}) {
  if (operation.type === 'RECOLOUR') {
    return colours.find((colour) => colour.id === operation.colourId)?.pantoneName ?? operation.colourId;
  }
  if (operation.type === 'AOP') {
    const name = patterns.find((pattern) => pattern.id === operation.patternId)?.name ?? operation.patternId;
    return `${OPERATION_LABEL.AOP} ${name}`;
  }
  if (operation.type === 'RESIZE') return `${OPERATION_LABEL.RESIZE} ${operation.width}×${operation.height}`;
  return operation.type;
}

// A variant's operations as one text, e.g. "Night Sky + AOP Block Libre".
export const describeOperations = (operations, lists) =>
  operations.map((operation) => describeOperation(operation, lists)).join(' + ');

// The result images of a ticket's latest round, for one variant and one view.
export function currentResult(ticket, variantId, slot) {
  return ticket.results.find((r) => r.variantId === variantId && r.slot === slot && r.round === ticket.round) ?? null;
}

// "A result image is missing for variant 2 (Back, Style) and variant 3 (Front)." from the 422 of deliver,
// whose errors are keyed `results.<variantId>.<slot>`.
export function describeMissingResults(errors, ticket) {
  const slotsByVariant = new Map();
  for (const path of Object.keys(errors)) {
    const [, variantId, slot] = path.split('.');
    if (!slotsByVariant.has(variantId)) slotsByVariant.set(variantId, []);
    slotsByVariant.get(variantId).push(SLOT_LABEL[slot] ?? slot);
  }
  const parts = [...slotsByVariant].map(([variantId, slots]) => {
    const number = ticket.variants.findIndex((variant) => variant.id === variantId) + 1;
    return `variant ${number} (${slots.join(', ')})`;
  });
  return `Result images are missing for ${parts.join(' and ')}.`;
}
