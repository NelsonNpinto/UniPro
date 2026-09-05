// All amounts are integer minor units (paise/cents). No floating point is used
// anywhere, so there is no representation error to round away.

export function lineTotalMinor(unitPriceMinor, quantity) {
  return unitPriceMinor * quantity;
}

export function sumMinor(values) {
  return values.reduce((total, value) => total + value, 0);
}

// Half-up rounding of gross * percentOff / 100, done in integers. gross and
// percentOff are non-negative, so adding 50 before the /100 floor rounds a
// trailing .5 upward (round half up).
export function percentageDiscountMinor(grossMinor, percentOff) {
  return Math.floor((grossMinor * percentOff + 50) / 100);
}

// A discount must never push an order below zero, so clamp the total at zero.
export function applyDiscount(grossMinor, percentOff) {
  const discountMinor = percentageDiscountMinor(grossMinor, percentOff);
  const totalMinor = Math.max(grossMinor - discountMinor, 0);
  return { discountMinor, totalMinor };
}
