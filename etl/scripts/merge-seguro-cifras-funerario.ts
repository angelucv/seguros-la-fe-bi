/**
 * Une seguro_cifras_funerario_cuadro5a_YYYY.csv presentes en output/data/public.
 */
import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT_PUBLIC } from '../src/config.js';
import { writeSemicolonCsv } from '../src/writer/semicolonCsv.js';

const outDir = path.join(process.cwd(), OUTPUT_PUBLIC);
const years = [2022, 2023, 2024];
const headers = [
  'ranking_funerario',
  'empresa_raw',
  'peer_id',
  'primas_funerario_miles_bs',
  'primas_total_personas_miles_bs',
  'pagina_pdf',
  'year',
  'archivo_fuente',
];

const all: Record<string, unknown>[] = [];
for (const y of years) {
  const f = path.join(outDir, `seguro_cifras_funerario_cuadro5a_${y}.csv`);
  if (!fs.existsSync(f)) {
    console.warn('[merge] Falta', f);
    continue;
  }
  const raw = fs.readFileSync(f, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const hdr = lines[0]!.split(';');
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(';');
    const row: Record<string, unknown> = {};
    hdr.forEach((h, j) => {
      let v: string | number = cells[j] ?? '';
      if (['ranking_funerario', 'year', 'pagina_pdf'].includes(h) && v !== '') {
        const n = Number(v);
        if (Number.isFinite(n)) v = n;
      }
      if (['primas_funerario_miles_bs', 'primas_total_personas_miles_bs'].includes(h) && v !== '') {
        const n = Number(String(v).replace(',', '.'));
        if (Number.isFinite(n)) v = n;
      }
      row[h] = v;
    });
    all.push(row);
  }
}

const out = path.join(outDir, 'seguro_cifras_funerario_cuadro5a_2022_2024.csv');
writeSemicolonCsv(out, headers, all);
console.log('[merge] Filas:', all.length, '→', out);
