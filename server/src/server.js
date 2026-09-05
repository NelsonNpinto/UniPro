import express from 'express';
import { pathToFileURL } from 'node:url';
import { config as defaultConfig } from './config.js';
import { createStore } from './store/store.js';
import { errorHandler } from './middleware/errorHandler.js';
import { productRoutes } from './routes/products.js';
import { cartRoutes } from './routes/carts.js';

export function createApp(store, options = {}) {
  const config = options.config ?? defaultConfig;
  const deps = { store, config };

  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/products', productRoutes(deps));
  app.use('/carts', cartRoutes(deps));

  app.use(errorHandler);
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = createApp(createStore());
  app.listen(defaultConfig.port, () => {
    console.log(`server listening on port ${defaultConfig.port}`);
  });
}
