import { Router } from 'express';
import {
  createCart,
  viewCart,
  addItem,
  updateItem,
  removeItem,
} from '../services/cartService.js';
import { parse, addItemSchema, updateItemSchema } from '../lib/validate.js';

export function cartRoutes({ store, config }) {
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

  return router;
}
