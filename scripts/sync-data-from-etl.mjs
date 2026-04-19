/**
 * Copia la salida del ETL (`etl/output/data/public`) a `data/public` del BI.
 * Multiplataforma (Node 20+), sin dependencias extra.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'etl', 'output', 'data', 'public');
const dest = join(root, 'data', 'public');

function main() {
  if (!existsSync(src) || !statSync(src).isDirectory()) {
    console.error(
      '[data:sync] No se encontró la carpeta de salida del ETL:\n  %s\nEjecute antes: npm run data:transform o npm run data:all',
      src
    );
    process.exit(1);
  }

  const entries = readdirSync(src);
  if (entries.length === 0) {
    console.error('[data:sync] La carpeta de salida del ETL está vacía. Revise la transformación.');
    process.exit(1);
  }

  mkdirSync(dest, { recursive: true });

  for (const name of readdirSync(dest)) {
    rmSync(join(dest, name), { recursive: true, force: true });
  }

  cpSync(src, dest, { recursive: true });

  console.log('[data:sync] Listo: salida del ETL copiada a data/public/');
  console.log(`  Origen: ${src}`);
  console.log(`  Destino: ${dest}`);
  console.log(`  Archivos: ${readdirSync(dest).length}`);
}

main();
