// Every failure the API can return maps to one stable code and one HTTP status.
// The error handler is the only place that turns these into a response body.
const STATUS_BY_CODE = {
  VALIDATION_ERROR: 422,
  PRODUCT_NOT_FOUND: 404,
  CART_NOT_FOUND: 404,
  ITEM_NOT_IN_CART: 404,
  ORDER_NOT_FOUND: 404,
  COUPON_NOT_FOUND: 404,
  CART_EMPTY: 422,
  CART_ALREADY_CHECKED_OUT: 409,
  INSUFFICIENT_INVENTORY: 409,
  COUPON_ALREADY_REDEEMED: 409,
  IDEMPOTENCY_KEY_REQUIRED: 400,
  IDEMPOTENCY_CONFLICT: 409,
  MILESTONE_NOT_REACHED: 409,
  MILESTONE_ALREADY_REWARDED: 409,
  PAYMENT_FAILED: 402,
  FORBIDDEN: 403,
};

export class AppError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code] ?? 500;
    this.details = details;
  }
}

export { STATUS_BY_CODE };
