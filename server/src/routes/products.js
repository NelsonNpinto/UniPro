import { Router } from 'express';

export function productRoutes({ store }) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json([...store.products.values()]);
  });

  return router;
}
