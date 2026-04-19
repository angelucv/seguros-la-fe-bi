/**
 * Comprueba que el entorno permita arrancar el BI (carpeta correcta, dependencias, datos).
 * Uso: npm run doctor
 */
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ok = (m) => console.log(`  [ok] ${m}`);
const bad = (m) => console.error(`  [falta] ${m}`);

let exit = 0;
console.log('[doctor] Carpeta del proyecto:', root);
console.log('');

if (!existsSync(join(root, 'package.json'))) {
  bad('No hay package.json aquí. Abra la carpeta seguros-la-fe-bi (donde está este archivo) en la terminal.');
  exit = 1;
} else ok('package.json');

if (!existsSync(join(root, 'node_modules', 'tsx'))) {
  bad('No hay node_modules (o falta tsx). Ejecute: npm install');
  exit = 1;
} else ok('node_modules / tsx');

if (!existsSync(join(root, 'data', 'public', 'primas_netas_mensual_largo.csv'))) {
  bad('Falta data/public/primas_netas_mensual_largo.csv. Ejecute: npm run data:sync (o npm run data:all)');
  exit = 1;
} else ok('data/public/primas_netas_mensual_largo.csv');

if (!existsSync(join(root, 'data', 'public', 'bcv_ves_por_usd_mensual.csv'))) {
  bad('Falta data/public/bcv_ves_por_usd_mensual.csv');
  exit = 1;
} else ok('data/public/bcv_ves_por_usd_mensual.csv');

console.log('');
if (exit === 0) {
  console.log('[doctor] Listo. Arranque con: npm run dev');
  console.log('         Luego abra: http://localhost:3000');
  console.log('         Si el puerto 3000 está ocupado: $env:PORT=3010; npm run dev   (PowerShell)');
} else {
  console.error('[doctor] Corrija lo indicado arriba y vuelva a ejecutar npm run doctor');
}
process.exit(exit);
