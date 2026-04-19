/**
 * Cuadro 5-A desde «cuadros descargables_Seguro en cifras 2024.xlsx» (misma fuente que el PDF).
 */
import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import { empresaPeerId } from '../src/empresaPeerId.js';
import { writeSemicolonCsv } from '../src/writer/semicolonCsv.js';
import { OUTPUT_PUBLIC } from '../src/config.js';

const xlsxPath =
  process.argv[2] ??
  path.join(process.cwd(), 'cache', 'seguro-cifras-2024-descargables.xlsx');
if (!fs.existsSync(xlsxPath)) {
  console.error('Falta Excel:', xlsxPath);
  process.exit(1);
}

const wb = XLSX.readFile(xlsxPath);
const sh = wb.Sheets['Cuadro 5A'];
if (!sh) {
  console.error('No hay hoja Cuadro 5A');
  process.exit(1);
}
const matrix = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' }) as (string | number)[][];

let headerRow = -1;
let empresaCol = -1;
let funCol = -1;
let totalCol = -1;
for (let r = 0; r < matrix.length; r++) {
  const row = matrix[r];
  if (!row) continue;
  const joined = row.map((c) => String(c).toLowerCase()).join('|');
  if (!joined.includes('nombre empresa')) continue;
  const idxEmp = row.findIndex(
    (c) =>
      String(c).toLowerCase().includes('nombre') &&
      String(c).toLowerCase().includes('empresa')
  );
  const idxFun = row.findIndex((c) => String(c).toLowerCase().includes('funerario'));
  const idxTot = row.findIndex((c) => String(c).toLowerCase() === 'total');
  if (idxEmp >= 0 && idxFun >= 0 && idxTot >= 0) {
    headerRow = r;
    empresaCol = idxEmp;
    funCol = idxFun;
    totalCol = idxTot;
    break;
  }
}
if (headerRow < 0) {
  console.error('No se encontró cabecera Cuadro 5A');
  process.exit(1);
}

type Row = {
  ranking_funerario: number;
  empresa_raw: string;
  peer_id: string;
  primas_funerario_miles_bs: number;
  primas_total_personas_miles_bs: number;
  pagina_pdf: string;
  year: number;
  archivo_fuente: string;
};

const raw: { empresa: string; fun: number; tot: number }[] = [];
for (let r = headerRow + 1; r < matrix.length; r++) {
  const row = matrix[r];
  if (!row || row.length < Math.max(funCol, totalCol, empresaCol) + 1) continue;
  const empresa = String(row[empresaCol] ?? '').replace(/\s+/g, ' ').trim();
  if (!empresa || /^total$/i.test(empresa)) continue;
  const fv = row[funCol];
  const tv = row[totalCol];
  const fun = typeof fv === 'number' ? fv : Number(String(fv).replace(/\./g, '').replace(',', '.'));
  const tot = typeof tv === 'number' ? tv : Number(String(tv).replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(fun) || !Number.isFinite(tot)) continue;
  raw.push({ empresa, fun, tot });
}

raw.sort((a, b) => b.fun - a.fun);
const year = 2024;
const archivo = path.basename(xlsxPath);
const rows: Row[] = raw.map((x, i) => ({
  ranking_funerario: i + 1,
  empresa_raw: x.empresa,
  peer_id: empresaPeerId(x.empresa),
  primas_funerario_miles_bs: x.fun,
  primas_total_personas_miles_bs: x.tot,
  pagina_pdf: '',
  year,
  archivo_fuente: archivo,
}));

const outDir = path.join(process.cwd(), OUTPUT_PUBLIC);
const outFile = path.join(outDir, 'seguro_cifras_funerario_cuadro5a_2024.csv');
writeSemicolonCsv(
  outFile,
  [
    'ranking_funerario',
    'empresa_raw',
    'peer_id',
    'primas_funerario_miles_bs',
    'primas_total_personas_miles_bs',
    'pagina_pdf',
    'year',
    'archivo_fuente',
  ],
  rows as unknown as Record<string, unknown>[]
);
const fe = rows.find((r) => r.peer_id === 'fe c a seguros');
console.log('[extract 2024 xlsx] filas:', rows.length, '→', outFile);
if (fe) console.log(`[extract 2024 xlsx] La Fe — #${fe.ranking_funerario} | funerario (miles Bs.): ${fe.primas_funerario_miles_bs}`);
