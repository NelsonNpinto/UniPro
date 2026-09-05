// Single API client. The base URL and admin token come from the environment so
// the same build can point at a different backend. In dev the default base is
// empty and Vite proxies the paths to the backend, so no CORS setup is needed.
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
export const defaultAdminToken = import.meta.env.VITE_ADMIN_TOKEN ?? 'dev-admin-token';

export class ApiError extends Error {
  constructor(code, message, status, details) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function requestJson(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
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
  listCoupons: (adminToken) =>
    requestJson('/admin/coupons', { headers: { 'x-admin-token': adminToken } }),
  getReport: (adminToken) =>
    requestJson('/admin/report', { headers: { 'x-admin-token': adminToken } }),
};
