import { describe, it, expect } from 'vitest';
import {
  lineTotalMinor,
  sumMinor,
  percentageDiscountMinor,
  applyDiscount,
} from '../src/lib/money.js';

describe('money helpers', () => {
  it('computes line totals and sums as integers', () => {
    expect(lineTotalMinor(49900, 3)).toBe(149700);
    expect(sumMinor([100, 250, 30])).toBe(380);
    expect(sumMinor([])).toBe(0);
  });

  it('rounds a percentage discount half up', () => {
    expect(percentageDiscountMinor(1000, 10)).toBe(100); // exact
    expect(percentageDiscountMinor(1005, 10)).toBe(101); // 100.5 rounds up
    expect(percentageDiscountMinor(1004, 10)).toBe(100); // 100.4 rounds down
    expect(percentageDiscountMinor(5, 10)).toBe(1); // 0.5 rounds up
  });

  it('applies a discount and clamps the total at zero', () => {
    expect(applyDiscount(1000, 10)).toEqual({ discountMinor: 100, totalMinor: 900 });
    expect(applyDiscount(0, 10)).toEqual({ discountMinor: 0, totalMinor: 0 });
    expect(applyDiscount(100, 100)).toEqual({ discountMinor: 100, totalMinor: 0 });
    // Defensive: even an over-100 percentage can never produce a negative total.
    expect(applyDiscount(100, 150)).toEqual({ discountMinor: 150, totalMinor: 0 });
  });
});
