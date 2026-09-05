import { Router } from 'express';
import { adminGuard } from '../middleware/adminGuard.js';
import { generateCoupon } from '../services/couponService.js';

export function adminRoutes({ store, config }) {
  const router = Router();
  router.use(adminGuard(config));

  router.post('/coupons', (req, res) => {
    const coupon = generateCoupon({ store, config });
    res.status(201).json(coupon);
  });

  return router;
}
