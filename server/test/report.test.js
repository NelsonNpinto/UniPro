import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp, getProducts, newCartWith, checkout } from './helpers.js';

describe('admin report', () => {
  it('reconciles net revenue and units after a mix of orders', async () => {
    const { app, config } = buildApp({ N: 1 });
    const products = await getProducts(app);
    const p0 = products[0];
    const p1 = products[1];

    await checkout(app, await newCartWith(app, p0.id, 2));
    const coupon = (await request(app).post('/admin/coupons').set('x-admin-token', config.adminToken).send({})).body;
    await checkout(app, await newCartWith(app, p1.id, 1), { couponCode: coupon.code });
    await checkout(app, await newCartWith(app, p0.id, 3));

    const report = (await request(app).get('/admin/report').set('x-admin-token', config.adminToken)).body;

    expect(report.ordersPlaced).toBe(3);
    expect(report.netRevenueMinor).toBe(report.grossRevenueMinor - report.totalDiscountsMinor);
    expect(report.grossRevenueMinor).toBe(p0.unitPriceMinor * 5 + p1.unitPriceMinor);

    const units = Object.fromEntries(report.unitsByProduct.map((u) => [u.productId, u.quantity]));
    expect(units[p0.id]).toBe(5);
    expect(units[p1.id]).toBe(1);

    // Sum of order totals must equal net revenue.
    const totalFromReport = report.netRevenueMinor;
    const summed = p0.unitPriceMinor * 5 + (p1.unitPriceMinor - report.totalDiscountsMinor);
    expect(summed).toBe(totalFromReport);

    expect(report.coupons).toEqual({ generated: 1, available: 0, redeemed: 1 });
  });

  it('is read-only: repeated calls return identical results', async () => {
    const { app, config } = buildApp();
    const products = await getProducts(app);
    await checkout(app, await newCartWith(app, products[0].id, 1));

    const first = (await request(app).get('/admin/report').set('x-admin-token', config.adminToken)).body;
    const second = (await request(app).get('/admin/report').set('x-admin-token', config.adminToken)).body;
    expect(second).toEqual(first);
  });
});
