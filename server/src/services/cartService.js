import { randomUUID } from 'node:crypto';
import { AppError } from '../lib/errors.js';
import { lineTotalMinor, sumMinor } from '../lib/money.js';

export function createCart(store) {
  const cart = { id: randomUUID(), status: 'open', items: [] };
  store.carts.set(cart.id, cart);
  return cart;
}

function requireCart(store, cartId) {
  const cart = store.carts.get(cartId);
  if (!cart) throw new AppError('CART_NOT_FOUND', `cart ${cartId} not found`);
  return cart;
}

// The cart stores only product references and quantities. Prices and names are
// read live from products at view time, so a cart never carries a stale price.
export function viewCart(store, cartId, config) {
  const cart = requireCart(store, cartId);
  const items = cart.items.map((item) => {
    const product = store.products.get(item.productId);
    return {
      productId: item.productId,
      name: product.name,
      unitPriceMinor: product.unitPriceMinor,
      quantity: item.quantity,
      lineTotalMinor: lineTotalMinor(product.unitPriceMinor, item.quantity),
    };
  });

  return {
    id: cart.id,
    status: cart.status,
    items,
    subtotalMinor: sumMinor(items.map((item) => item.lineTotalMinor)),
    currency: config.currency,
  };
}
