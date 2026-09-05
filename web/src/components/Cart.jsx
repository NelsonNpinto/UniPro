import { formatMinor } from '../format.js';

export function Cart({ cart, currency, onQuantity, onRemove, onCheckout }) {
  if (!cart || cart.items.length === 0) {
    return (
      <section>
        <h2>Cart</h2>
        <p className="muted">Your cart is empty.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Cart</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Line total</th>
            <th aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item) => (
            <tr key={item.productId}>
              <td>{item.name}</td>
              <td>{formatMinor(item.unitPriceMinor, currency)}</td>
              <td>
                <div className="qty">
                  <button
                    className="btn btn-small"
                    onClick={() => onQuantity(item.productId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    aria-label={`Decrease quantity of ${item.name}`}
                  >
                    -
                  </button>
                  <span className="qty-value">{item.quantity}</span>
                  <button
                    className="btn btn-small"
                    onClick={() => onQuantity(item.productId, item.quantity + 1)}
                    aria-label={`Increase quantity of ${item.name}`}
                  >
                    +
                  </button>
                </div>
              </td>
              <td>{formatMinor(item.lineTotalMinor, currency)}</td>
              <td>
                <button className="btn btn-ghost" onClick={() => onRemove(item.productId)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="cart-footer">
        <span className="subtotal">
          Subtotal <strong>{formatMinor(cart.subtotalMinor, currency)}</strong>
        </span>
        <button className="btn btn-primary" onClick={onCheckout}>
          Go to checkout
        </button>
      </div>
    </section>
  );
}
