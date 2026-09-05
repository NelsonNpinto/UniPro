import { formatMinor } from '../format.js';
import { QuantityStepper } from '../components/QuantityStepper.jsx';

export function Cart({ cart, currency, onQuantity, onRemove, onCheckout }) {
  const empty = !cart || cart.items.length === 0;

  return (
    <section>
      <h2>Cart</h2>
      {empty ? (
        <p className="empty">Your cart is empty.</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Price</th>
                <th>Quantity</th>
                <th className="num">Line total</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.productId}>
                  <td>{item.name}</td>
                  <td className="num">{formatMinor(item.unitPriceMinor, currency)}</td>
                  <td>
                    <QuantityStepper
                      label={item.name}
                      quantity={item.quantity}
                      onChange={(next) => onQuantity(item.productId, next)}
                    />
                  </td>
                  <td className="num">{formatMinor(item.lineTotalMinor, currency)}</td>
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
            <button className="btn btn-primary" onClick={onCheckout} disabled={empty}>
              Go to checkout
            </button>
          </div>
        </>
      )}
    </section>
  );
}
