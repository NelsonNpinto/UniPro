import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API runs on a separate port in dev. Proxy the backend paths so the
// browser sees a single origin and no CORS handling is needed.
const api = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/products': api,
      '/carts': api,
      '/orders': api,
      '/admin': api,
    },
  },
});
