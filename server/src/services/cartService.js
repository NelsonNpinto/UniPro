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

function requireOpenCart(store, cartId) {
  const cart = requireCart(store, cartId);
  if (cart.status !== 'open') {
    throw new AppError('CART_ALREADY_CHECKED_OUT', `cart ${cartId} is already checked out`);
  }
  return cart;
}

function requireProduct(store, productId) {
  const product = store.products.get(productId);
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', `product ${productId} not found`);
  return product;
}

// Inventory is not reserved here; availability is enforced authoritatively at
// checkout. Adding a product that is already in the cart raises its quantity.
export function addItem(store, cartId, productId, quantity) {
  const cart = requireOpenCart(store, cartId);
  requireProduct(store, productId);
  const existing = cart.items.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ productId, quantity });
  }
  return cart;
}

export function updateItem(store, cartId, productId, quantity) {
  const cart = requireOpenCart(store, cartId);
  const item = cart.items.find((entry) => entry.productId === productId);
  if (!item) {
    throw new AppError('ITEM_NOT_IN_CART', `product ${productId} is not in cart ${cartId}`);
  }
  item.quantity = quantity;
  return cart;
}

export function removeItem(store, cartId, productId) {
  const cart = requireOpenCart(store, cartId);
  const index = cart.items.findIndex((entry) => entry.productId === productId);
  if (index === -1) {
    throw new AppError('ITEM_NOT_IN_CART', `product ${productId} is not in cart ${cartId}`);
  }
  cart.items.splice(index, 1);
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
