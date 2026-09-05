import { useRef, useState } from 'react';
import { api } from '../api.js';
import { formatMinor } from '../format.js';

export function Checkout({ cart, currency, onPlaced, onError }) {
  const [coupon, setCoupon] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const keyRef = useRef(null);
  const fingerprintRef = useRef(null);

  async function placeOrder() {
    const couponCode = coupon.trim();
    // One idempotency key per attempt: reused when the user retries the same
    // attempt after a failure, and regenerated when the coupon changes since a
    // different coupon is a genuinely different request.
    if (!keyRef.current || fingerprintRef.current !== couponCode) {
      keyRef.current = crypto.randomUUID();
      fingerprintRef.current = couponCode;
    }

    setSubmitting(true);
    try {
      const order = await api.checkout(cart.id, couponCode || undefined, keyRef.current);
      keyRef.current = null;
      fingerprintRef.current = null;
      onPlaced(order);
    } catch (error) {
      // Keep the key so retrying the same attempt replays rather than duplicates.
      onError(error);
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart || cart.items.length === 0) {
    return (
      <section>
        <h2>Checkout</h2>
        <p className="muted">Your cart is empty.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Checkout</h2>
      <table className="table">
        <tbody>
          {cart.items.map((item) => (
            <tr key={item.productId}>
              <td>
                {item.name} x {item.quantity}
              </td>
              <td className="num">{formatMinor(item.lineTotalMinor, currency)}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td>Subtotal</td>
            <td className="num">
              <strong>{formatMinor(cart.subtotalMinor, currency)}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <label className="field">
        <span>Coupon code (optional)</span>
        <input
          type="text"
          value={coupon}
          onChange={(event) => setCoupon(event.target.value)}
          placeholder="e.g. M1-ABCD1234"
        />
      </label>

      <button className="btn btn-primary" onClick={placeOrder} disabled={submitting}>
        {submitting ? 'Placing order...' : 'Place order'}
      </button>
      <p className="hint">Any discount is applied at checkout from current prices.</p>
    </section>
  );
}
