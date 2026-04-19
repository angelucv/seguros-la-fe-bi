/**
 * Falla rápido con mensaje claro si se ejecuta npm run dev fuera del proyecto o sin instalar deps.
 */
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!existsSync(join(root, 'package.json'))) {
  console.error(
    '[predev] No se encontró package.json. Ejecute npm run dev dentro de la carpeta del repo seguros-la-fe-bi\n' +
      '         (la que contiene package.json), no desde otra carpeta del disco.'
  );
  process.exit(1);
}

if (!existsSync(join(root, 'node_modules', 'tsx'))) {
  console.error('[predev] Dependencias no instaladas. Ejecute primero:\n  npm install');
  process.exit(1);
}
