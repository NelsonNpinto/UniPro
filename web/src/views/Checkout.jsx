import { useRef, useState } from 'react';
import { api } from '../api.js';
import { formatMinor } from '../format.js';
import { MoneyRow } from '../components/MoneyRow.jsx';

export function Checkout({ cart, currency, onPlaced, onViewConfirmation, onError }) {
  const [coupon, setCoupon] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  // The attempt holds the single idempotency key for this checkout. A new coupon
  // is a genuinely different request, so it earns a new key.
  const attemptRef = useRef(null);

  async function placeOrder() {
    const couponCode = coupon.trim() || undefined;
    if (!attemptRef.current || attemptRef.current.couponCode !== couponCode) {
      attemptRef.current = { key: crypto.randomUUID(), couponCode, cartId: cart.id };
    }
    setSubmitting(true);
    try {
      const order = await api.checkout(cart.id, couponCode, attemptRef.current.key);
      setResult(order);
      onPlaced(order);
    } catch (error) {
      onError(error);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <section>
        <h2>Order placed</h2>
        <p className="muted">Order {result.id}</p>

        <dl className="summary">
          <MoneyRow label="Gross" amountMinor={result.grossMinor} currency={currency} />
          {result.discountMinor > 0 && (
            <MoneyRow
              label={`Discount${result.couponCode ? ` (${result.couponCode})` : ''}`}
              amountMinor={result.discountMinor}
              currency={currency}
              variant="discount"
              sign="-"
            />
          )}
          <MoneyRow label="Total" amountMinor={result.totalMinor} currency={currency} variant="total" />
        </dl>

        <button className="btn btn-primary" onClick={onViewConfirmation}>
          View order confirmation
        </button>
      </section>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <section>
        <h2>Checkout</h2>
        <p className="empty">Your cart is empty.</p>
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
      <p className="hint">
        Leave the coupon empty for the no-coupon path. Any discount is applied at checkout from
        current prices.
      </p>
    </section>
  );
}
