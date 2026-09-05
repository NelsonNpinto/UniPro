import { randomUUID } from 'node:crypto';
import { AppError } from '../lib/errors.js';
import { lineTotalMinor, sumMinor } from '../lib/money.js';

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}

// Checkout is one synchronous critical section. Every check that can fail runs
// first; the mutations that follow cannot fail and never yield. Because nothing
// awaits between the first read and the last write, no two checkouts interleave,
// a partial checkout is never observable, and two checkouts cannot both take the
// last unit of stock.
export function checkout({ store, paymentGateway, config }, { cartId }) {
  // Load cart; reject if missing, already checked out, or empty.
  const cart = store.carts.get(cartId);
  if (!cart) throw new AppError('CART_NOT_FOUND', `cart ${cartId} not found`);
  if (cart.status !== 'open') {
    throw new AppError('CART_ALREADY_CHECKED_OUT', `cart ${cartId} is already checked out`);
  }
  if (cart.items.length === 0) throw new AppError('CART_EMPTY', `cart ${cartId} is empty`);

  // Load every product and verify inventory covers the requested quantity.
  const lines = cart.items.map((item) => {
    const product = store.products.get(item.productId);
    if (!product) {
      throw new AppError('PRODUCT_NOT_FOUND', `product ${item.productId} not found`, {
        productId: item.productId,
      });
    }
    if (product.availableInventory < item.quantity) {
      throw new AppError('INSUFFICIENT_INVENTORY', `not enough inventory for ${product.name}`, {
        productId: product.id,
        requested: item.quantity,
        available: product.availableInventory,
      });
    }
    return { product, quantity: item.quantity };
  });

  // Compute totals from current product prices and snapshot each line.
  const items = lines.map(({ product, quantity }) => ({
    productId: product.id,
    name: product.name,
    unitPriceMinor: product.unitPriceMinor,
    quantity,
    lineTotalMinor: lineTotalMinor(product.unitPriceMinor, quantity),
  }));
  const grossMinor = sumMinor(items.map((item) => item.lineTotalMinor));
  const discountMinor = 0;
  const totalMinor = grossMinor;

  // Charge before mutating. A decline throws here, leaving all state untouched.
  const payment = paymentGateway.charge({ amountMinor: totalMinor, currency: config.currency });
  if (!payment.ok) {
    throw new AppError('PAYMENT_FAILED', 'payment was declined', { reason: payment.reason });
  }

  // Mutations only from here down: none can fail and none awaits.
  for (const { product, quantity } of lines) {
    product.availableInventory -= quantity;
  }
  const order = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    cartId: cart.id,
    items,
    grossMinor,
    discountMinor,
    totalMinor,
    currency: config.currency,
  };
  store.orders.set(order.id, order);
  cart.status = 'checked_out';
  store.counters.ordersPlaced += 1;

  // Invariant: an order's totals are fixed at creation. Freeze the snapshot.
  return deepFreeze(order);
}
