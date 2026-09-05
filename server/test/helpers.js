import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/server.js';
import { createStore } from '../src/store/store.js';
import { createPaymentGateway } from '../src/services/paymentGateway.js';
import { loadConfig } from '../src/config.js';

// A fresh store, gateway, and app per call keeps every test fully isolated.
export function buildApp(overrides = {}) {
  const config = loadConfig({
    N: String(overrides.N ?? 5),
    X: String(overrides.X ?? 10),
    CURRENCY: overrides.currency ?? 'INR',
    ADMIN_TOKEN: overrides.adminToken ?? 'test-admin-token',
  });
  const store = createStore();
  const paymentGateway = createPaymentGateway();
  const app = createApp(store, { config, paymentGateway });
  return { app, store, paymentGateway, config };
}

export function nextKey() {
  return `idem-${randomUUID()}`;
}

export async function getProducts(app) {
  const res = await request(app).get('/products');
  return res.body;
}

export async function newCartWith(app, productId, quantity) {
  const cart = (await request(app).post('/carts')).body;
  await request(app).post(`/carts/${cart.id}/items`).send({ productId, quantity });
  return cart.id;
}

export function checkout(app, cartId, body = {}) {
  return request(app)
    .post(`/carts/${cartId}/checkout`)
    .set('Idempotency-Key', nextKey())
    .send(body);
}

// Place enough successful orders to reach the first milestone, then generate the
// coupon the admin endpoint issues for it.
export async function reachMilestoneCoupon(app, config, productId) {
  for (let i = 0; i < config.milestoneInterval; i += 1) {
    const cartId = await newCartWith(app, productId, 1);
    await checkout(app, cartId);
  }
  const res = await request(app)
    .post('/admin/coupons')
    .set('x-admin-token', config.adminToken)
    .send({});
  return res.body;
}
