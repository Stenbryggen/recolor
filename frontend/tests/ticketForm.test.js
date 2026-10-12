import { describe, expect, it } from 'vitest';
import { buildTicketRequest, emptyForm, emptyVariant, needsReferenceImage, otherErrors, variantToRequest } from '../src/ticketForm.js';

const file = (name) => new File(['x'], name, { type: 'image/png' });

describe('variantToRequest', () => {
  it('is a colour without AOP', () => {
    expect(variantToRequest({ colourId: 'granita', aop: false, patternId: 'block-libre', notes: '' })).toEqual({
      operations: [{ type: 'RECOLOUR', colourId: 'granita' }],
    });
  });

  it('adds the pattern as a second operation with AOP, and keeps the notes', () => {
    expect(variantToRequest({ colourId: 'night-sky', aop: true, patternId: 'block-libre', notes: ' Not black ' })).toEqual({
      operations: [
        { type: 'RECOLOUR', colourId: 'night-sky' },
        { type: 'AOP', patternId: 'block-libre' },
      ],
      notes: 'Not black',
    });
  });
});

describe('buildTicketRequest', () => {
  function filledForm() {
    const form = emptyForm();
    Object.assign(form, { articleNo: '1', reference: '2', partnerId: 'partner-pixelworks', guidelineText: 'g' });
    form.variants = [{ ...emptyVariant(), colourId: 'granita' }];
    form.files = { FRONT: file('a_001.png'), BACK: file('a_002.png'), STYLE: file('a_007.png'), REFERENCE: file('ref.png') };
    return form;
  }

  it('sends the ticket as json in `data` and the files by lower case slot name', () => {
    const request = buildTicketRequest(filledForm());

    const data = JSON.parse(request.get('data'));
    expect(data).toMatchObject({ articleNo: '1', partnerId: 'partner-pixelworks', priority: 'NORMAL', singleClippingPath: true });
    expect(data.variants).toEqual([{ operations: [{ type: 'RECOLOUR', colourId: 'granita' }] }]);
    expect(request.get('front').name).toBe('a_001.png');
    expect(request.get('back').name).toBe('a_002.png');
    expect(request.get('style').name).toBe('a_007.png');
  });

  it('leaves out the reference image unless a variant has AOP', () => {
    const form = filledForm();
    expect(needsReferenceImage(form)).toBe(false);
    expect(buildTicketRequest(form).has('reference')).toBe(false);

    form.variants[0].aop = true;
    expect(needsReferenceImage(form)).toBe(true);
    expect(buildTicketRequest(form).get('reference').name).toBe('ref.png');
  });
});

describe('otherErrors', () => {
  it('returns the errors the form has no field for', () => {
    const form = emptyForm();
    const errors = {
      articleNo: 'An article number is required',
      'variants.0.operations.0.colourId': 'A colour is required for RECOLOUR',
      'files.FRONT': 'A FRONT file is required',
      'variants.0.operations.2.width': 'Strange',
    };

    expect(otherErrors(errors, form)).toEqual([['variants.0.operations.2.width', 'Strange']]);
  });
});
