import { describe, expect, it } from 'vitest';
import { platesFor } from '../../src/engine/plates';

describe('platesFor', () => {
  it('loads one 45 per side for 135 on a 45 lb bar', () => {
    expect(platesFor(135, 45)).toEqual({ perSide: [45], totalLb: 135 });
  });

  it('mixes plates down to 2.5', () => {
    expect(platesFor(225, 45).perSide).toEqual([45, 45]);
    expect(platesFor(185, 45).perSide).toEqual([45, 25]);
    expect(platesFor(100, 45).perSide).toEqual([25, 2.5]);
    expect(platesFor(100, 45).totalLb).toBe(100);
  });

  it('is just the bar at the bar weight, and empty below it', () => {
    expect(platesFor(45, 45)).toEqual({ perSide: [], totalLb: 45 });
    expect(platesFor(20, 45)).toEqual({ perSide: [], totalLb: 45 });
  });

  it('rounds down to what can be loaded', () => {
    expect(platesFor(137, 45)).toEqual({ perSide: [45], totalLb: 135 });
  });

  it('handles a lighter bar', () => {
    expect(platesFor(65, 35)).toEqual({ perSide: [10, 5], totalLb: 65 });
  });
});
