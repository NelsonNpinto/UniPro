import { Router } from 'express';
import { adminGuard } from '../middleware/adminGuard.js';
import { generateCoupon, listCoupons } from '../services/couponService.js';
import { buildReport } from '../services/reportService.js';

export function adminRoutes({ store, config }) {
  const router = Router();
  router.use(adminGuard(config));

  router.post('/coupons', (req, res) => {
    const coupon = generateCoupon({ store, config });
    res.status(201).json(coupon);
  });

  router.get('/coupons', (req, res) => {
    res.json(listCoupons({ store }));
  });

  router.get('/report', (req, res) => {
    res.json(buildReport({ store, config }));
  });

  return router;
}
