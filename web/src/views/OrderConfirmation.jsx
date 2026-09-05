import { formatMinor, formatTimestamp } from '../format.js';
import { MoneyRow } from '../components/MoneyRow.jsx';

export function OrderConfirmation({ order, onContinue }) {
  if (!order) {
    return (
      <section>
        <h2>Order confirmation</h2>
        <p className="empty">No order to show yet.</p>
      </section>
    );
  }
  const currency = order.currency;

  return (
    <section>
      <h2>Order confirmed</h2>
      <p className="muted">
        Order {order.id}
        {order.createdAt ? ` placed ${formatTimestamp(order.createdAt)}` : ''}
      </p>

      <table className="table">
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Unit</th>
            <th className="num">Qty</th>
            <th className="num">Line total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.productId}>
              <td>{item.name}</td>
              <td className="num">{formatMinor(item.unitPriceMinor, currency)}</td>
              <td className="num">{item.quantity}</td>
              <td className="num">{formatMinor(item.lineTotalMinor, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="summary">
        <MoneyRow label="Gross" amountMinor={order.grossMinor} currency={currency} />
        {order.discountMinor > 0 && (
          <MoneyRow
            label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`}
            amountMinor={order.discountMinor}
            currency={currency}
            variant="discount"
            sign="-"
          />
        )}
        <MoneyRow label="Total" amountMinor={order.totalMinor} currency={currency} variant="total" />
      </dl>

      <p className="note">
        This is a frozen snapshot. The item names, prices, and totals are fixed at the moment of
        checkout and do not change if products or prices change later.
      </p>

      <button className="btn btn-primary" onClick={onContinue}>
        Continue shopping
      </button>
    </section>
  );
}
