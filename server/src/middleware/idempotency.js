import { AppError } from '../lib/errors.js';

export function requireIdempotencyKey(req, res, next) {
  const key = req.header('Idempotency-Key');
  if (!key || key.trim() === '') {
    return next(new AppError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required'));
  }
  req.idempotencyKey = key;
  next();
}

// Two requests share an order only if they describe the same checkout. The
// fingerprint captures everything that affects the result: the cart and coupon.
export function fingerprintRequest(cartId, body) {
  return JSON.stringify({ cartId, couponCode: body?.couponCode ?? null });
}
