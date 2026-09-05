import { formatMinor } from '../format.js';

export function Products({ products, currency, onAdd, busyId }) {
  return (
    <section>
      <h2>Products</h2>
      <div className="grid">
        {products.map((product) => {
          const outOfStock = product.availableInventory === 0;
          return (
            <article key={product.id} className="card">
              <h3>{product.name}</h3>
              <p className="price">{formatMinor(product.unitPriceMinor, currency)}</p>
              <p className={outOfStock ? 'stock stock-out' : 'stock'}>
                {outOfStock ? 'Out of stock' : `${product.availableInventory} in stock`}
              </p>
              <button
                className="btn btn-primary"
                disabled={outOfStock || busyId === product.id}
                onClick={() => onAdd(product.id)}
              >
                {busyId === product.id ? 'Adding...' : 'Add to cart'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
