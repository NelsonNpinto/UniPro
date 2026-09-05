// Turn a backend error code into a message a shopper can act on. Falling back to
// the server message keeps unexpected codes readable.
const MESSAGES = {
  VALIDATION_ERROR: 'Please check the values entered and try again.',
  PRODUCT_NOT_FOUND: 'That product is no longer available.',
  CART_NOT_FOUND: 'Your cart could not be found. Starting a new one.',
  ITEM_NOT_IN_CART: 'That item is not in your cart.',
  ORDER_NOT_FOUND: 'That order could not be found.',
  COUPON_NOT_FOUND: 'That coupon code was not found.',
  CART_EMPTY: 'Your cart is empty.',
  CART_ALREADY_CHECKED_OUT: 'This cart has already been checked out.',
  INSUFFICIENT_INVENTORY: 'There is not enough stock to complete this order.',
  COUPON_ALREADY_REDEEMED: 'That coupon has already been used.',
  IDEMPOTENCY_KEY_REQUIRED: 'The checkout request was missing its idempotency key.',
  IDEMPOTENCY_CONFLICT: 'This key was already used for a different order. Start a new checkout.',
  MILESTONE_NOT_REACHED: 'Not enough orders have been placed to earn a coupon yet.',
  MILESTONE_ALREADY_REWARDED: 'The current milestone has already been rewarded.',
  PAYMENT_FAILED: 'Payment was declined. Please try again.',
  FORBIDDEN: 'Admin token is missing or invalid.',
};

export function messageFor(error) {
  return MESSAGES[error?.code] ?? error?.message ?? 'Something went wrong.';
}
