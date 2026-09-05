import express from 'express';
import { pathToFileURL } from 'node:url';
import { config } from './config.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (req, res) => res.json({ ok: true }));
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApp().listen(config.port, () => {
    console.log(`server listening on port ${config.port}`);
  });
}
