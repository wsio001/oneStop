import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createServer() {
  const app = express();

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  // API routes - simple proxy that imports the handlers
  app.all('/api/*', async (req, res) => {
    const apiPath = req.path.replace('/api/', '');
    const handlerPath = join(__dirname, 'api', `${apiPath}.ts`);

    try {
      const module = await vite.ssrLoadModule(handlerPath);
      const handler = module.default;
      await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.listen(3000, () => {
    console.log('🚀 Dev server running at http://localhost:3000');
  });
}

createServer();
