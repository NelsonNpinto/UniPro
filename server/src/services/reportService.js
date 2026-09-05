// Pure read over orders and coupons. It mutates nothing, so repeated calls
// return identical results. netRevenueMinor is summed from order totals, and
// because each order total equals its gross minus its discount, the report
// reconciles: netRevenueMinor === grossRevenueMinor - totalDiscountsMinor.
export function buildReport({ store, config }) {
  let grossRevenueMinor = 0;
  let totalDiscountsMinor = 0;
  let netRevenueMinor = 0;
  const unitsByProduct = new Map();

  for (const order of store.orders.values()) {
    grossRevenueMinor += order.grossMinor;
    totalDiscountsMinor += order.discountMinor;
    netRevenueMinor += order.totalMinor;
    for (const item of order.items) {
      const entry = unitsByProduct.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        quantity: 0,
      };
      entry.quantity += item.quantity;
      unitsByProduct.set(item.productId, entry);
    }
  }

  let available = 0;
  let redeemed = 0;
  for (const coupon of store.coupons.values()) {
    if (coupon.status === 'available') available += 1;
    else if (coupon.status === 'redeemed') redeemed += 1;
  }

  return {
    ordersPlaced: store.counters.ordersPlaced,
    unitsByProduct: [...unitsByProduct.values()],
    grossRevenueMinor,
    totalDiscountsMinor,
    netRevenueMinor,
    coupons: {
      generated: store.coupons.size,
      available,
      redeemed,
    },
    currency: config.currency,
  };
}
