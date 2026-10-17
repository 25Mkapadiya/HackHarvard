import { normalizePrice, normalizeUnit, toComparable } from './units';

describe('unit normalization', () => {
  it.each([
    ['lb', 'lb', 1],
    ['lbs', 'lb', 1],
    ['per pound', 'lb', 1],
    ['1/2 lb', 'lb', 2],
    ['Each', 'each', 1],
    ['bunch', 'bunch', 1],
    ['dozen', 'dozen', 1],
    ['half dozen', 'dozen', 2],
    ['pt', 'pint', 1],
    ['qt', 'quart', 1],
  ])('%s → %s ×%d', (raw, unit, factor) => {
    expect(normalizeUnit(raw)).toEqual({ unit, factor });
  });
  it('returns null for unknown units', () => expect(normalizeUnit('basket')).toBeNull());
  it('scales the price to the canonical unit', () => {
    expect(normalizePrice(3, '1/2 lb')).toEqual({ amount: 6, unit: 'lb' });
    expect(normalizePrice(4, 'half dozen')).toEqual({ amount: 8, unit: 'dozen' });
  });
  it('compares quarts as pints and ounces as pounds', () => {
    expect(toComparable(8, 'quart')).toEqual({ amount: 4, unit: 'pint' });
    expect(toComparable(1.25, 'oz')).toEqual({ amount: 20, unit: 'lb' });
  });
});
