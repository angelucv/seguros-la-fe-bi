import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import os from 'node:os';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

/**
 * Fuera de `node_modules` para que `npm ci` no falle con EBUSY al borrar `node_modules/.vite`
 * (Railpack / Docker / Railway).
 */
const viteCacheDir = path.join(os.tmpdir(), 'vite-cache-seguros-la-fe-bi');

export default defineConfig(({ mode }) => {
  loadEnv(mode, '.', '');
  return {
    cacheDir: viteCacheDir,
    optimizeDeps: {
      include: ['plotly.js-dist-min'],
    },
    /** Si ejecutas `vite` en :5173 y `tsx server.ts` en :3000, las rutas `/api/*` se reenvían al API. */
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
