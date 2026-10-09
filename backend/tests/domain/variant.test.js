import { describe, expect, it } from 'vitest';
import { variantSchema } from '../../src/domain/variant.js';

const recolour = { type: 'RECOLOUR', colourId: 'granita' };
const aop = { type: 'AOP', patternId: 'block-libre' };
const resize = { type: 'RESIZE', width: 800, height: 1200 };

describe('variantSchema', () => {
  it('accepts a single operation', () => {
    expect(variantSchema.safeParse({ operations: [recolour] }).success).toBe(true);
  });

  it('accepts combined operations', () => {
    expect(variantSchema.safeParse({ operations: [recolour, aop, resize] }).success).toBe(true);
  });

  it('needs at least one operation', () => {
    const result = variantSchema.safeParse({ operations: [] });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('A variant needs at least one operation');
  });

  it('rejects two operations of the same type, pointing at the second one', () => {
    const result = variantSchema.safeParse({
      operations: [recolour, { type: 'RECOLOUR', colourId: 'night-sky' }],
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['operations', 1]);
    expect(result.error.issues[0].message).toBe('A variant can only have one RECOLOUR operation');
  });

  it('allows notes to be left out', () => {
    expect(variantSchema.safeParse({ operations: [recolour], notes: null }).success).toBe(true);
    expect(variantSchema.safeParse({ operations: [recolour], notes: 'Night Sky, not black' }).success).toBe(true);
  });
});
