import fs from 'node:fs';
import path from 'node:path';
import type { BcvRow } from './types';
import { vesPorUsdDiciembre } from './fxEngine';

export type FunerarioCuadro5aRow = {
  ranking_funerario: number;
  empresa_raw: string;
  peer_id: string;
  primas_funerario_miles_bs: number;
  primas_total_personas_miles_bs: number;
  pagina_pdf: string;
  year: number;
  archivo_fuente: string;
};

export type TipoCambioDiciembreRow = {
  year: number;
  /** VES por USD (último día hábil de diciembre). */
  ves_por_usd: number | null;
};

export type FunerarioPayload = {
  years: number[];
  byYear: Record<number, FunerarioCuadro5aRow[]>;
  /** Para convertir miles Bs. a USD (millones): TC BCV diciembre por año. */
  tipoCambioDiciembre: TipoCambioDiciembreRow[];
  sourceFile: string;
  dataDir: string;
  generatedAt: string;
  error?: string;
};

const MERGED = 'seguro_cifras_funerario_cuadro5a_2022_2024.csv';

function parseNum(s: string): number {
  const t = s.trim().replace(/\s/g, '');
  if (!t) return NaN;
  const direct = Number(t);
  if (Number.isFinite(direct)) return direct;
  const eu = t.replace(/\./g, '').replace(',', '.');
  return Number(eu);
}

function parseLine(line: string, hdr: string[]): FunerarioCuadro5aRow | null {
  const cells = line.split(';');
  if (cells.length < hdr.length) return null;
  const get = (name: string) => cells[hdr.indexOf(name)] ?? '';
  const ranking = parseNum(get('ranking_funerario'));
  const fun = parseNum(get('primas_funerario_miles_bs'));
  const tot = parseNum(get('primas_total_personas_miles_bs'));
  const year = parseNum(get('year'));
  if (!Number.isFinite(ranking) || !Number.isFinite(fun) || !Number.isFinite(tot) || !Number.isFinite(year)) {
    return null;
  }
  return {
    ranking_funerario: ranking,
    empresa_raw: get('empresa_raw').trim(),
    peer_id: get('peer_id').trim().toLowerCase(),
    primas_funerario_miles_bs: fun,
    primas_total_personas_miles_bs: tot,
    pagina_pdf: String(get('pagina_pdf') ?? '').trim(),
    year: Math.trunc(year),
    archivo_fuente: get('archivo_fuente').trim(),
  };
}

/**
 * Cuadro 5-A «Seguro en cifras»: primas ramo Funerarios (miles Bs.), personas seguro directo.
 */
export function buildFunerarioPayload(dataDir: string, bcv: BcvRow[]): FunerarioPayload {
  const generatedAt = new Date().toISOString();
  const full = path.join(dataDir, MERGED);
  if (!fs.existsSync(full)) {
    return {
      years: [],
      byYear: {},
      tipoCambioDiciembre: [],
      sourceFile: MERGED,
      dataDir,
      generatedAt,
      error: `No se encontró ${MERGED} en ${dataDir}`,
    };
  }
  const raw = fs.readFileSync(full, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      years: [],
      byYear: {},
      tipoCambioDiciembre: [],
      sourceFile: MERGED,
      dataDir,
      generatedAt,
      error: 'CSV vacío',
    };
  }
  const hdr = lines[0]!.split(';').map((h) => h.trim());
  const byYear: Record<number, FunerarioCuadro5aRow[]> = {};
  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]!, hdr);
    if (!row) continue;
    if (!byYear[row.year]) byYear[row.year] = [];
    byYear[row.year]!.push(row);
  }
  const years = Object.keys(byYear)
    .map(Number)
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);
  for (const y of years) {
    byYear[y]!.sort((a, b) => a.ranking_funerario - b.ranking_funerario);
  }
  const tipoCambioDiciembre: TipoCambioDiciembreRow[] = years.map((y) => ({
    year: y,
    ves_por_usd: vesPorUsdDiciembre(bcv, y),
  }));
  return { years, byYear, tipoCambioDiciembre, sourceFile: MERGED, dataDir, generatedAt };
}
