import { describe, expect, it } from 'vitest';
import { getOperation, operationSchema, operationTypes } from '../../src/domain/operations/index.js';

describe('operations registry', () => {
  it('contains RECOLOUR, RESIZE and AOP', () => {
    expect([...operationTypes].sort()).toEqual(['AOP', 'RECOLOUR', 'RESIZE']);
  });

  it('lets every operation define its own required files', () => {
    expect(getOperation('AOP').requiredFiles).toEqual(['REFERENCE']);
    expect(getOperation('RECOLOUR').requiredFiles).toEqual([]);
    expect(getOperation('RESIZE').requiredFiles).toEqual([]);
  });

  it('says which fields refer to the colour and pattern lists', () => {
    expect(getOperation('RECOLOUR').references).toEqual({ colourId: 'colour' });
    expect(getOperation('AOP').references).toEqual({ patternId: 'pattern' });
    expect(getOperation('RESIZE').references).toEqual({});
  });

  it('returns nothing for an unknown operation', () => {
    expect(getOperation('SHARPEN')).toBeUndefined();
  });
});

describe('operation schemas', () => {
  const messageFor = (operation) => {
    const result = operationSchema.safeParse(operation);
    expect(result.success).toBe(false);
    return result.error.issues[0].message;
  };

  it('accepts a valid RECOLOUR, AOP and RESIZE', () => {
    expect(operationSchema.safeParse({ type: 'RECOLOUR', colourId: 'granita' }).success).toBe(true);
    expect(operationSchema.safeParse({ type: 'AOP', patternId: 'block-libre' }).success).toBe(true);
    expect(operationSchema.safeParse({ type: 'RESIZE', width: 800, height: 1200 }).success).toBe(true);
  });

  it('requires a colour for RECOLOUR', () => {
    expect(messageFor({ type: 'RECOLOUR' })).toBe('A colour is required for RECOLOUR');
    expect(messageFor({ type: 'RECOLOUR', colourId: '' })).toBe('A colour is required for RECOLOUR');
  });

  it('requires a pattern for AOP', () => {
    expect(messageFor({ type: 'AOP' })).toBe('A pattern is required for AOP');
  });

  it('requires a positive whole width and height for RESIZE', () => {
    expect(messageFor({ type: 'RESIZE', height: 100 })).toBe('A width is required for RESIZE');
    expect(messageFor({ type: 'RESIZE', width: 100 })).toBe('A height is required for RESIZE');
    expect(messageFor({ type: 'RESIZE', width: 0, height: 100 })).toBe('The width must be greater than 0');
    expect(messageFor({ type: 'RESIZE', width: 10.5, height: 100 })).toBe('The width must be a whole number');
  });

  it('rejects an unknown operation type', () => {
    expect(messageFor({ type: 'SHARPEN' })).toBe('The operation type must be one of RECOLOUR, AOP, RESIZE');
  });

  it('ignores fields that belong to another operation', () => {
    const result = operationSchema.parse({ type: 'RECOLOUR', colourId: 'granita', width: 10 });
    expect(result).toEqual({ type: 'RECOLOUR', colourId: 'granita' });
  });
});
