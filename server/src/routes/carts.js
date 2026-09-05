import { Router } from 'express';
import {
  createCart,
  viewCart,
  addItem,
  updateItem,
  removeItem,
} from '../services/cartService.js';
import { parse, addItemSchema, updateItemSchema, checkoutSchema } from '../lib/validate.js';
import { checkout } from '../services/checkoutService.js';
import { AppError } from '../lib/errors.js';
import { requireIdempotencyKey, fingerprintRequest } from '../middleware/idempotency.js';

export function cartRoutes({ store, config, paymentGateway }) {
  const router = Router();

  router.post('/', (req, res) => {
    const cart = createCart(store);
    res.status(201).json(viewCart(store, cart.id, config));
  });

  router.get('/:cartId', (req, res) => {
    res.json(viewCart(store, req.params.cartId, config));
  });

  router.post('/:cartId/items', (req, res) => {
    const { productId, quantity } = parse(addItemSchema, req.body);
    addItem(store, req.params.cartId, productId, quantity);
    res.json(viewCart(store, req.params.cartId, config));
  });

  router.patch('/:cartId/items/:productId', (req, res) => {
    const { quantity } = parse(updateItemSchema, req.body);
    updateItem(store, req.params.cartId, req.params.productId, quantity);
    res.json(viewCart(store, req.params.cartId, config));
  });

  router.delete('/:cartId/items/:productId', (req, res) => {
    removeItem(store, req.params.cartId, req.params.productId);
    res.json(viewCart(store, req.params.cartId, config));
  });

  // Synchronous handler on purpose: the idempotency lookup, the checkout critical
  // section, and recording the key all run without yielding, so a retry can never
  // interleave and produce a second order.
  router.post('/:cartId/checkout', requireIdempotencyKey, (req, res) => {
    const { cartId } = req.params;
    const { couponCode } = parse(checkoutSchema, req.body);
    const fingerprint = fingerprintRequest(cartId, { couponCode });

    const seen = store.idempotencyKeys.get(req.idempotencyKey);
    if (seen) {
      if (seen.requestFingerprint !== fingerprint) {
        throw new AppError('IDEMPOTENCY_CONFLICT', 'idempotency key reused with a different request');
      }
      return res.status(200).json(seen.order);
    }

    const order = checkout({ store, paymentGateway, config }, { cartId, couponCode });
    store.idempotencyKeys.set(req.idempotencyKey, {
      status: 'completed',
      requestFingerprint: fingerprint,
      order,
    });
    res.status(201).json(order);
  });

  return router;
}
