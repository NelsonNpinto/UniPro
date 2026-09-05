import { Router } from 'express';
import { AppError } from '../lib/errors.js';

export function orderRoutes({ store }) {
  const router = Router();

  router.get('/:orderId', (req, res) => {
    const order = store.orders.get(req.params.orderId);
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', `order ${req.params.orderId} not found`);
    }
    res.json(order);
  });

  return router;
}
