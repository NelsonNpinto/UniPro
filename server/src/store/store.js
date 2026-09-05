import { randomUUID } from 'node:crypto';
import { seedProducts } from './seed.js';

// The entire application state lives in these Maps for the life of the process.
// A fresh store is created per app instance, which keeps tests isolated.
export function createStore() {
  const store = {
    products: new Map(),
    carts: new Map(),
    orders: new Map(),
    coupons: new Map(),
    idempotencyKeys: new Map(),
    counters: {
      ordersPlaced: 0,
      rewardedMilestones: new Set(),
    },
  };

  for (const product of seedProducts) {
    const id = randomUUID();
    store.products.set(id, {
      id,
      name: product.name,
      unitPriceMinor: product.unitPriceMinor,
      availableInventory: product.availableInventory,
    });
  }

  return store;
}
