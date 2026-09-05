import { ProductCard } from '../components/ProductCard.jsx';

export function Products({ products, currency, onAdd, busyId }) {
  return (
    <section>
      <h2>Products</h2>
      {products.length === 0 ? (
        <p className="empty">No products available.</p>
      ) : (
        <div className="grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              currency={currency}
              onAdd={onAdd}
              busy={busyId === product.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
