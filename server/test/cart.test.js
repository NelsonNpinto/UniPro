import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp, getProducts, newCartWith, checkout } from './helpers.js';

describe('cart', () => {
  it('merges quantity when the same product is added twice', async () => {
    const { app } = buildApp();
    const products = await getProducts(app);
    const prod = products[0];
    const cart = (await request(app).post('/carts')).body;

    await request(app).post(`/carts/${cart.id}/items`).send({ productId: prod.id, quantity: 2 });
    const view = (await request(app).post(`/carts/${cart.id}/items`).send({ productId: prod.id, quantity: 3 })).body;

    expect(view.items).toHaveLength(1);
    expect(view.items[0].quantity).toBe(5);
    expect(view.subtotalMinor).toBe(prod.unitPriceMinor * 5);
  });

  it('reflects live product prices rather than a copied price', async () => {
    const { app, store } = buildApp();
    const products = await getProducts(app);
    const prod = products[0];
    const cartId = await newCartWith(app, prod.id, 1);

    store.products.get(prod.id).unitPriceMinor = 12345;
    const view = (await request(app).get(`/carts/${cartId}`)).body;

    expect(view.items[0].unitPriceMinor).toBe(12345);
    expect(view.subtotalMinor).toBe(12345);
  });

  it('rejects mutations to a checked-out cart', async () => {
    const { app } = buildApp();
    const products = await getProducts(app);
    const prod = products.find((p) => p.availableInventory >= 1);
    const cartId = await newCartWith(app, prod.id, 1);
    await checkout(app, cartId);

    const res = await request(app).post(`/carts/${cartId}/items`).send({ productId: prod.id, quantity: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CART_ALREADY_CHECKED_OUT');
  });

  it('validates the add-item body', async () => {
    const { app } = buildApp();
    const cart = (await request(app).post('/carts')).body;
    const res = await request(app).post(`/carts/${cart.id}/items`).send({ productId: 'x', quantity: 0 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns a stable error envelope for unknown carts and orders', async () => {
    const { app } = buildApp();
    const cart = await request(app).get('/carts/missing');
    expect(cart.status).toBe(404);
    expect(cart.body.error.code).toBe('CART_NOT_FOUND');

    const order = await request(app).get('/orders/missing');
    expect(order.status).toBe(404);
    expect(order.body.error.code).toBe('ORDER_NOT_FOUND');
  });
});
