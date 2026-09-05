export class ApiError extends Error {
  constructor(code, message, status, details) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function requestJson(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const error = body?.error ?? {};
    throw new ApiError(error.code ?? 'UNKNOWN', error.message ?? res.statusText, res.status, error.details);
  }
  return body;
}

export const api = {
  listProducts: () => requestJson('/products'),
  createCart: () => requestJson('/carts', { method: 'POST' }),
  getCart: (cartId) => requestJson(`/carts/${cartId}`),
  addItem: (cartId, productId, quantity) =>
    requestJson(`/carts/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }),
  updateItem: (cartId, productId, quantity) =>
    requestJson(`/carts/${cartId}/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  removeItem: (cartId, productId) =>
    requestJson(`/carts/${cartId}/items/${productId}`, { method: 'DELETE' }),
  checkout: (cartId, couponCode, idempotencyKey) =>
    requestJson(`/carts/${cartId}/checkout`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(couponCode ? { couponCode } : {}),
    }),
  getOrder: (orderId) => requestJson(`/orders/${orderId}`),
  generateCoupon: (adminToken) =>
    requestJson('/admin/coupons', { method: 'POST', headers: { 'x-admin-token': adminToken } }),
  getReport: (adminToken) =>
    requestJson('/admin/report', { headers: { 'x-admin-token': adminToken } }),
};
