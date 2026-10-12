import { describe, expect, it } from 'vitest';
import { currentResult, describeMissingResults, describeOperation } from '../src/describe.js';

const lists = {
  colours: [{ id: 'night-sky', pantoneName: 'Night Sky' }],
  patterns: [{ id: 'block-libre', name: 'Block Libre' }],
};

describe('describeOperation', () => {
  it('uses the names from the lists', () => {
    expect(describeOperation({ type: 'RECOLOUR', colourId: 'night-sky' }, lists)).toBe('Night Sky');
    expect(describeOperation({ type: 'AOP', patternId: 'block-libre' }, lists)).toBe('AOP Block Libre');
  });

  it('describes a resize and falls back to the id for an unknown colour', () => {
    expect(describeOperation({ type: 'RESIZE', width: 800, height: 600 }, lists)).toBe('Resize 800×600');
    expect(describeOperation({ type: 'RECOLOUR', colourId: 'unknown' }, lists)).toBe('unknown');
  });
});

describe('currentResult', () => {
  const ticket = {
    round: 2,
    results: [
      { variantId: 'v1', slot: 'FRONT', round: 1, id: 'old' },
      { variantId: 'v1', slot: 'FRONT', round: 2, id: 'new' },
    ],
  };

  it('finds the result of the latest round', () => {
    expect(currentResult(ticket, 'v1', 'FRONT').id).toBe('new');
    expect(currentResult(ticket, 'v1', 'BACK')).toBeNull();
  });
});

describe('describeMissingResults', () => {
  it('names the variants and views that are missing', () => {
    const ticket = { variants: [{ id: 't-v1' }, { id: 't-v2' }] };
    const errors = {
      'results.t-v1.FRONT': 'A result image is required',
      'results.t-v2.BACK': 'A result image is required',
      'results.t-v2.STYLE': 'A result image is required',
    };

    expect(describeMissingResults(errors, ticket)).toBe(
      'Result images are missing for variant 1 (Front) and variant 2 (Back, Style).',
    );
  });
});
