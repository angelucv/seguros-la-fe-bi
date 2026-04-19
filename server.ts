import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import { BI_API_MARK } from './lib/bi/apiMark';
import { clearDatasetCache, getDataset } from './lib/bi/getDataset';
import { buildHistoricoPayload, buildHomePayload, buildResultadoForCorte, buildSectorPayload } from './lib/bi/apiPayloads';
import { buildFunerarioPayload } from './lib/bi/funerarioPayload';
import { sendJson } from './lib/safeJsonResponse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data', 'public');

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  /** Todas las respuestas `/api/*` llevan marca de versión (algunos proxies eliminan claves `_meta` del JSON). */
  app.use('/api', (_req, res, next) => {
    res.setHeader('X-BI-API-Mark', BI_API_MARK);
    next();
  });

  /** En desarrollo, no cachear el dataset en memoria entre peticiones (CSV actualizado sin reiniciar). */
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/bi', (_req, _res, next) => {
      clearDatasetCache();
      next();
    });
  }

  /** Sirve `public/` (p. ej. `/Images/*`) antes del middleware de Vite; evita 404 de logos en desarrollo. */
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  app.get('/api/health', (_req, res) => {
    sendJson(res, 200, { ok: true, service: 'seguros-la-fe-bi', biApiMark: BI_API_MARK });
  });

  app.get('/api/bi/home', (req, res) => {
    try {
      const ds = getDataset(DATA_DIR);
      const corte = typeof req.query.corte === 'string' ? req.query.corte : undefined;
      sendJson(res, 200, buildHomePayload(ds, corte));
    } catch (e) {
      console.error('[api/bi/home]', e);
      sendJson(res, 500, { error: String(e) });
    }
  });

  app.get('/api/bi/sector', (_req, res) => {
    try {
      const ds = getDataset(DATA_DIR);
      sendJson(res, 200, buildSectorPayload(ds));
    } catch (e) {
      console.error('[api/bi/sector]', e);
      sendJson(res, 500, { error: String(e) });
    }
  });

  app.get('/api/bi/historico', (req, res) => {
    try {
      const ds = getDataset(DATA_DIR);
      const corte = typeof req.query.corte === 'string' ? req.query.corte : undefined;
      sendJson(res, 200, buildHistoricoPayload(ds, corte));
    } catch (e) {
      console.error('[api/bi/historico]', e);
      sendJson(res, 500, { error: String(e) });
    }
  });

  app.get('/api/bi/funerario', (_req, res) => {
    try {
      const ds = getDataset(DATA_DIR);
      sendJson(res, 200, buildFunerarioPayload(DATA_DIR, ds.bcv));
    } catch (e) {
      console.error('[api/bi/funerario]', e);
      sendJson(res, 500, { error: String(e) });
    }
  });

  app.get('/api/bi/resultado', (req, res) => {
    try {
      const ds = getDataset(DATA_DIR);
      const fechRef = typeof req.query.fechRef === 'string' ? req.query.fechRef : '';
      const ts = typeof req.query.ts === 'string' ? req.query.ts : '';
      const scopeRaw = typeof req.query.scope === 'string' ? req.query.scope : '';
      const rankingScope = scopeRaw === 'bandaPnc' ? 'bandaPnc' : 'top5';
      if (!fechRef || !ts) {
        return sendJson(res, 400, { error: 'Parámetros fechRef y ts requeridos' });
      }
      const payload = buildResultadoForCorte(ds, fechRef, ts, rankingScope);
      if (!payload) {
        return sendJson(res, 404, { error: 'Sin datos de resultado' });
      }
      sendJson(res, 200, payload);
    } catch (e) {
      console.error('[api/bi/resultado]', e);
      sendJson(res, 500, { error: String(e) });
    }
  });

  /** Lista CSV disponibles en data/public (para comprobar despliegue). */
  app.get('/api/data-files', (_req, res) => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        return sendJson(res, 200, { dataDir: DATA_DIR, files: [], warning: 'DATA_DIR no existe' });
      }
      const names = fs
        .readdirSync(DATA_DIR)
        .filter((f) => f.toLowerCase().endsWith('.csv'));
      sendJson(res, 200, { dataDir: DATA_DIR, count: names.length, files: names });
    } catch (e) {
      console.error('[api/data-files]', e);
      sendJson(res, 500, { error: String(e) });
    }
  });

  /**
   * Un solo servidor HTTP: el WebSocket de Vite (HMR) comparte puerto con Express.
   * Evita pantalla negra / SPA sin hidratar en Simple Browser y fallos del cliente HMR en otro puerto.
   */
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    /** Vite puede responder con `index.html` a rutas no reconocidas; no debe manejar `/api/*`. */
    app.use((req, res, next) => {
      const p = req.path || req.url?.split('?')[0] || '';
      if (p.startsWith('/api')) {
        next();
        return;
      }
      return vite.middlewares(req, res, next);
    });
    /** Rutas /api sin handler (p. ej. typo): JSON 404, no HTML genérico de Express. */
    app.use((req, res, next) => {
      const p = req.path || req.url?.split('?')[0] || '';
      if (p.startsWith('/api')) {
        sendJson(res, 404, { error: 'API no encontrada' });
        return;
      }
      next();
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        sendJson(res, 404, { error: 'API no encontrada' });
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[express]', err);
    const msg = err instanceof Error ? err.message : String(err);
    sendJson(res, 500, { error: msg });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`DATA_DIR: ${DATA_DIR}`);
    console.log(`[BI] API mark (debe coincidir con la pantalla Inicio): ${BI_API_MARK}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log('Vite HMR usa el mismo puerto que la app (recomendado para Simple Browser / proxy).');
    }
  });
  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[servidor] El puerto ${PORT} ya está en uso. Cierre el otro proceso o use otro puerto, p. ej.:\n` +
          `  npm run dev:3010\n` +
          `  (PowerShell: $env:PORT='3010'; npm run dev)`
      );
    } else {
      console.error('[servidor]', err);
    }
    process.exit(1);
  });
}

startServer().catch((e) => {
  console.error('[startServer]', e);
  process.exit(1);
});
