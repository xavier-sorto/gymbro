import { describe, expect, it } from 'vitest';
import { fractionOf, percentWidth } from '../../src/ui/progress';

describe('progress helpers', () => {
  it('gives the share of the total, clamped to 0..1', () => {
    expect(fractionOf(1, 4)).toBe(0.25);
    expect(fractionOf(9, 4)).toBe(1);
    expect(fractionOf(-1, 4)).toBe(0);
  });

  it('is 0 when there is no total to measure against', () => {
    expect(fractionOf(3, 0)).toBe(0);
    expect(fractionOf(3, Number.NaN)).toBe(0);
  });

  it('formats a CSS width', () => {
    expect(percentWidth(0.624)).toBe('62%');
    expect(percentWidth(2)).toBe('100%');
  });
});
