import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  buildApp,
  getProducts,
  newCartWith,
  checkout,
  nextKey,
  reachMilestoneCoupon,
} from './helpers.js';

describe('coupon generation', () => {
  it('rejects generation before a milestone is reached', async () => {
    const { app, config } = buildApp({ N: 5 });
    const res = await request(app).post('/admin/coupons').set('x-admin-token', config.adminToken).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MILESTONE_NOT_REACHED');
  });

  it('issues at most one coupon per milestone', async () => {
    const { app, config } = buildApp({ N: 1 });
    const products = await getProducts(app);
    await reachMilestoneCoupon(app, config, products[0].id);

    const again = await request(app).post('/admin/coupons').set('x-admin-token', config.adminToken).send({});
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('MILESTONE_ALREADY_REWARDED');
  });

  it('forbids admin access without the token', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/admin/coupons').send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('coupon redemption', () => {
  it('lets only one of two concurrent checkouts redeem the same coupon', async () => {
    const { app, store, config } = buildApp({ N: 1 });
    const products = await getProducts(app);
    const prod = products.find((p) => p.availableInventory >= 10);
    const coupon = await reachMilestoneCoupon(app, config, prod.id);

    const cartA = await newCartWith(app, prod.id, 1);
    const cartB = await newCartWith(app, prod.id, 1);
    const [a, b] = await Promise.all([
      checkout(app, cartA, { couponCode: coupon.code }),
      checkout(app, cartB, { couponCode: coupon.code }),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const rejected = [a, b].find((r) => r.status === 409);
    expect(rejected.body.error.code).toBe('COUPON_ALREADY_REDEEMED');
    expect(store.coupons.get(coupon.code).status).toBe('redeemed');
  });

  it('does not consume the coupon or inventory when payment fails', async () => {
    const { app, store, paymentGateway, config } = buildApp({ N: 1 });
    const products = await getProducts(app);
    const prod = products.find((p) => p.availableInventory >= 5);
    const coupon = await reachMilestoneCoupon(app, config, prod.id);

    const invBefore = (await getProducts(app)).find((p) => p.id === prod.id).availableInventory;
    paymentGateway.setMode('decline');
    const cartId = await newCartWith(app, prod.id, 1);
    const res = await checkout(app, cartId, { couponCode: coupon.code });

    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('PAYMENT_FAILED');
    expect(store.coupons.get(coupon.code).status).toBe('available');
    const invAfter = (await getProducts(app)).find((p) => p.id === prod.id).availableInventory;
    expect(invAfter).toBe(invBefore);
  });

  it('applies the discount to gross and clamps at zero', async () => {
    const { app, config } = buildApp({ N: 1, X: 10 });
    const products = await getProducts(app);
    const prod = products.find((p) => p.availableInventory >= 4);
    const coupon = await reachMilestoneCoupon(app, config, prod.id);

    const cartId = await newCartWith(app, prod.id, 2);
    const order = (await checkout(app, cartId, { couponCode: coupon.code })).body;

    const gross = prod.unitPriceMinor * 2;
    const discount = Math.floor((gross * 10 + 50) / 100);
    expect(order.grossMinor).toBe(gross);
    expect(order.discountMinor).toBe(discount);
    expect(order.totalMinor).toBe(gross - discount);
    expect(order.couponCode).toBe(coupon.code);
  });
});
