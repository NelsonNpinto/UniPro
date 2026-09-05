import { Router } from 'express';
import { createCart, viewCart } from '../services/cartService.js';

export function cartRoutes({ store, config }) {
  const router = Router();

  router.post('/', (req, res) => {
    const cart = createCart(store);
    res.status(201).json(viewCart(store, cart.id, config));
  });

  router.get('/:cartId', (req, res) => {
    res.json(viewCart(store, req.params.cartId, config));
  });

  return router;
}
