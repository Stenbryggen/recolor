// The new-ticket form: its starting values, the request it sends and where the errors belong.

export const emptyVariant = () => ({ colourId: null, aop: false, patternId: null, notes: '' });

export const emptyForm = () => ({
  articleNo: '',
  reference: '',
  priority: 'NORMAL',
  partnerId: null,
  guidelineText: '',
  singleClippingPath: true,
  variants: [emptyVariant()],
  files: { FRONT: null, BACK: null, STYLE: null, REFERENCE: null },
});

// A variant in the form is a colour, optionally with a pattern (AOP).
// The colour is always the first operation and the pattern the second.
export function variantToRequest(variant) {
  const operations = [{ type: 'RECOLOUR', colourId: variant.colourId }];
  if (variant.aop) operations.push({ type: 'AOP', patternId: variant.patternId });
  const notes = variant.notes.trim();
  return notes ? { operations, notes } : { operations };
}

export const needsReferenceImage = (form) => form.variants.some((variant) => variant.aop);

// POST /tickets takes the ticket as JSON in the field `data`, plus the files.
export function buildTicketRequest(form) {
  const data = {
    articleNo: form.articleNo,
    reference: form.reference,
    priority: form.priority,
    partnerId: form.partnerId,
    guidelineText: form.guidelineText,
    singleClippingPath: form.singleClippingPath,
    variants: form.variants.map(variantToRequest),
  };

  const request = new FormData();
  request.append('data', JSON.stringify(data));
  for (const [slot, file] of Object.entries(form.files)) {
    if (file && (slot !== 'REFERENCE' || needsReferenceImage(form))) request.append(slot.toLowerCase(), file);
  }
  return request;
}

// The paths the API uses for the errors of the fields in the form.
export function errorPaths(form) {
  const paths = ['articleNo', 'reference', 'priority', 'partnerId', 'guidelineText', 'singleClippingPath', 'variants'];
  form.variants.forEach((_, index) => {
    paths.push(`variants.${index}`, `variants.${index}.notes`, `variants.${index}.operations`);
    paths.push(`variants.${index}.operations.0.colourId`, `variants.${index}.operations.1.patternId`);
  });
  for (const slot of Object.keys(form.files)) paths.push(`files.${slot}`);
  return paths;
}

// Errors the form has no place for, so they can be shown in a list.
export function otherErrors(errors, form) {
  const known = new Set(errorPaths(form));
  return Object.entries(errors).filter(([path]) => !known.has(path));
}
