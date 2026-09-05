import { formatMinor } from '../format.js';

export function OrderConfirmation({ order, onContinue }) {
  if (!order) return null;
  const currency = order.currency;

  return (
    <section>
      <h2>Order confirmed</h2>
      <p className="muted">Order {order.id}</p>

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
        <div>
          <dt>Gross</dt>
          <dd>{formatMinor(order.grossMinor, currency)}</dd>
        </div>
        {order.discountMinor > 0 && (
          <div>
            <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
            <dd>-{formatMinor(order.discountMinor, currency)}</dd>
          </div>
        )}
        <div className="summary-total">
          <dt>Total</dt>
          <dd>{formatMinor(order.totalMinor, currency)}</dd>
        </div>
      </dl>

      <button className="btn btn-primary" onClick={onContinue}>
        Continue shopping
      </button>
    </section>
  );
}
