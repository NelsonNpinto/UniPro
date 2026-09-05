import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { messageFor } from './errorMessages.js';
import { Banner } from './components/Banner.jsx';
import { Products } from './components/Products.jsx';
import { Cart } from './components/Cart.jsx';
import { Checkout } from './components/Checkout.jsx';
import { OrderConfirmation } from './components/OrderConfirmation.jsx';
import { Admin } from './components/Admin.jsx';

const CART_KEY = 'cartId';

export default function App() {
  const [view, setView] = useState('products');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(null);
  const [order, setOrder] = useState(null);
  const [currency, setCurrency] = useState('INR');
  const [banner, setBanner] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadProducts();
    refreshCart();
  }, []);

  async function loadProducts() {
    try {
      setProducts(await api.listProducts());
    } catch (error) {
      setBanner({ type: 'error', text: messageFor(error) });
    }
  }

  async function refreshCart() {
    const id = localStorage.getItem(CART_KEY);
    if (!id) {
      setCart(null);
      return;
    }
    try {
      const loaded = await api.getCart(id);
      if (loaded.status !== 'open') {
        localStorage.removeItem(CART_KEY);
        setCart(null);
        return;
      }
      setCart(loaded);
      setCurrency(loaded.currency);
    } catch {
      localStorage.removeItem(CART_KEY);
      setCart(null);
    }
  }

  async function ensureCart() {
    const id = localStorage.getItem(CART_KEY);
    if (id) {
      try {
        const existing = await api.getCart(id);
        if (existing.status === 'open') return existing;
      } catch {
        // fall through and create a fresh cart
      }
    }
    const created = await api.createCart();
    localStorage.setItem(CART_KEY, created.id);
    return created;
  }

  function handleError(error) {
    setBanner({ type: 'error', text: messageFor(error) });
    if (error.code === 'CART_NOT_FOUND' || error.code === 'CART_ALREADY_CHECKED_OUT') {
      localStorage.removeItem(CART_KEY);
      setCart(null);
    }
  }

  async function addToCart(productId) {
    setBusyId(productId);
    setBanner(null);
    try {
      const active = await ensureCart();
      const updated = await api.addItem(active.id, productId, 1);
      setCart(updated);
      setCurrency(updated.currency);
      await loadProducts();
      setBanner({ type: 'success', text: 'Added to cart.' });
    } catch (error) {
      handleError(error);
    } finally {
      setBusyId(null);
    }
  }

  async function changeQuantity(productId, quantity) {
    if (!cart || quantity < 1) return;
    try {
      setCart(await api.updateItem(cart.id, productId, quantity));
    } catch (error) {
      handleError(error);
    }
  }

  async function removeItem(productId) {
    if (!cart) return;
    try {
      setCart(await api.removeItem(cart.id, productId));
    } catch (error) {
      handleError(error);
    }
  }

  function handlePlaced(placed) {
    setOrder(placed);
    localStorage.removeItem(CART_KEY);
    setCart(null);
    setView('order');
    setBanner(null);
    loadProducts();
  }

  const cartCount = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;

  const tabs = [
    { id: 'products', label: 'Products' },
    { id: 'cart', label: `Cart${cartCount ? ` (${cartCount})` : ''}` },
    { id: 'checkout', label: 'Checkout' },
    { id: 'admin', label: 'Admin' },
  ];

  return (
    <div className="app">
      <header className="header">
        <h1>Checkout and Rewards</h1>
        <nav className="nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={view === tab.id ? 'tab tab-active' : 'tab'}
              onClick={() => setView(tab.id)}
              aria-current={view === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="content">
        <Banner banner={banner} onDismiss={() => setBanner(null)} />

        {view === 'products' && (
          <Products products={products} currency={currency} onAdd={addToCart} busyId={busyId} />
        )}
        {view === 'cart' && (
          <Cart
            cart={cart}
            currency={currency}
            onQuantity={changeQuantity}
            onRemove={removeItem}
            onCheckout={() => setView('checkout')}
          />
        )}
        {view === 'checkout' && (
          <Checkout cart={cart} currency={currency} onPlaced={handlePlaced} onError={handleError} />
        )}
        {view === 'order' && (
          <OrderConfirmation order={order} onContinue={() => setView('products')} />
        )}
        {view === 'admin' && <Admin />}
      </main>
    </div>
  );
}
