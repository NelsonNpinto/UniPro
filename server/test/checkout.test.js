import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp, getProducts, newCartWith, checkout, nextKey } from './helpers.js';

describe('checkout concurrency and idempotency', () => {
  it('sells the last unit exactly once under concurrent checkouts', async () => {
    const { app } = buildApp();
    const products = await getProducts(app);
    const low = products.find((p) => p.availableInventory === 1);
    expect(low).toBeTruthy();

    const cartIds = await Promise.all(
      Array.from({ length: 10 }, () => newCartWith(app, low.id, 1)),
    );
    const responses = await Promise.all(cartIds.map((id) => checkout(app, id)));

    const created = responses.filter((r) => r.status === 201);
    const rejected = responses.filter(
      (r) => r.status === 409 && r.body.error.code === 'INSUFFICIENT_INVENTORY',
    );
    expect(created).toHaveLength(1);
    expect(rejected).toHaveLength(9);

    const after = (await getProducts(app)).find((p) => p.id === low.id);
    expect(after.availableInventory).toBe(0);
  });

  it('produces one order and charges once for a retried idempotency key', async () => {
    const { app } = buildApp();
    const products = await getProducts(app);
    const prod = products.find((p) => p.availableInventory >= 5);
    const cartId = await newCartWith(app, prod.id, 2);
    const key = nextKey();

    const first = await request(app).post(`/carts/${cartId}/checkout`).set('Idempotency-Key', key).send({});
    const second = await request(app).post(`/carts/${cartId}/checkout`).set('Idempotency-Key', key).send({});

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);

    const after = (await getProducts(app)).find((p) => p.id === prod.id);
    expect(after.availableInventory).toBe(prod.availableInventory - 2);
  });

  it('rejects a reused key with a different request body', async () => {
    const { app } = buildApp();
    const products = await getProducts(app);
    const prod = products.find((p) => p.availableInventory >= 2);
    const cartA = await newCartWith(app, prod.id, 1);
    const cartB = await newCartWith(app, prod.id, 1);
    const key = nextKey();

    const first = await request(app).post(`/carts/${cartA}/checkout`).set('Idempotency-Key', key).send({});
    const second = await request(app).post(`/carts/${cartB}/checkout`).set('Idempotency-Key', key).send({});

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('requires an idempotency key', async () => {
    const { app } = buildApp();
    const products = await getProducts(app);
    const prod = products.find((p) => p.availableInventory >= 1);
    const cartId = await newCartWith(app, prod.id, 1);

    const res = await request(app).post(`/carts/${cartId}/checkout`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('freezes the order snapshot so its totals never change with prices', async () => {
    const { app, store } = buildApp();
    const products = await getProducts(app);
    const prod = products.find((p) => p.availableInventory >= 2);
    const cartId = await newCartWith(app, prod.id, 2);
    const order = (await checkout(app, cartId)).body;

    store.products.get(prod.id).unitPriceMinor = 1;
    const fetched = (await request(app).get(`/orders/${order.id}`)).body;

    expect(fetched.items[0].unitPriceMinor).toBe(prod.unitPriceMinor);
    expect(fetched.totalMinor).toBe(prod.unitPriceMinor * 2);
    expect(Object.isFrozen(store.orders.get(order.id))).toBe(true);
  });
});
