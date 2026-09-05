import { formatMinor } from '../format.js';

export function ProductCard({ product, currency, onAdd, busy }) {
  const outOfStock = product.availableInventory === 0;
  return (
    <article className="card">
      <h3>{product.name}</h3>
      <p className="price">{formatMinor(product.unitPriceMinor, currency)}</p>
      <p className={outOfStock ? 'stock stock-out' : 'stock'}>
        {outOfStock ? 'Out of stock' : `${product.availableInventory} in stock`}
      </p>
      <button
        className="btn btn-primary"
        disabled={outOfStock || busy}
        onClick={() => onAdd(product.id)}
      >
        {busy ? 'Adding...' : 'Add to cart'}
      </button>
    </article>
  );
}
