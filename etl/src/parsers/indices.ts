import XLSX from 'xlsx';
import path from 'node:path';
import { empresaPeerId } from '../empresaPeerId.js';
import { lastDayOfMonth, monthFromSheetName, monthFromFileName, parseYearMonthFromAcumuladaCell } from './months.js';

export interface IndiceOut {
  NOMBRE_EMPRESA: string;
  peer_id: string;
  year: number;
  month: number;
  SINI_PAG_VS_PRIM_PCT: number | null;
  RESERVAS_VS_PRIM_PCT: number | null;
  SINI_INC_VS_PRIM_DEV_PCT: number | null;
  COMISION_VS_PRIM_PCT: number | null;
  GAST_ADQ_VS_PRIM_PCT: number | null;
  GAST_ADM_VS_PRIM_PCT: number | null;
  COSTO_REAS_VS_PRIM_DEV_PCT: number | null;
  TASA_COMBINADA_PCT: number | null;
  INDICE_COB_RESERVAS: number | null;
  archivo_fuente: string;
  hoja: string;
}

function num(v: unknown): number | null {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function inferYearFromFilename(name: string): number | null {
  const m = name.match(/(20\d{2})/);
  return m ? Number(m[1]) : null;
}

export function parseIndicesXlsx(filePath: string, buf: Buffer): IndiceOut[] {
  const archivo_fuente = path.basename(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const out: IndiceOut[] = [];
  const fileYear = inferYearFromFilename(archivo_fuente);
  const fileMonth = monthFromFileName(archivo_fuente);

  for (const sheetName of wb.SheetNames) {
    const sh = wb.Sheets[sheetName];
    if (!sh) continue;
    const matrix = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' }) as (string | number)[][];

    let year: number | null = fileYear;
    let month: number | null = monthFromSheetName(sheetName);

    for (let r = 0; r < Math.min(matrix.length, 40); r++) {
      const row = matrix[r];
      if (!row) continue;
      const joined = row.map((c) => String(c)).join(' ');
      const ac = parseYearMonthFromAcumuladaCell(joined);
      if (ac) {
        year = ac.year;
        month = ac.month;
        break;
      }
    }
    if (year == null) year = fileYear;
    if (month == null) month = monthFromSheetName(sheetName);
    if (month == null) month = fileMonth;
    if (year == null || month == null) continue;

    let headerRow = -1;
    let nineCol = false;
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row) continue;
      const h = row.map((c) => String(c).toLowerCase()).join(' ');
      if (h.includes('siniestros pagados') && h.includes('primas netas cobradas')) {
        headerRow = r;
        nineCol = h.includes('costo del reaseguro') || h.includes('tasa combinada');
        break;
      }
    }
    if (headerRow < 0) continue;

    for (let r = headerRow + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length < 4) continue;
      const rankRaw = row[1];
      const nombre = String(row[2] ?? '').replace(/\s+/g, ' ').trim();
      if (!nombre || nombre.length > 85) continue;
      if (/^\(\d+\)\s*Indica/i.test(nombre) || /A la fecha han consignado/i.test(nombre)) continue;
      const rk = typeof rankRaw === 'number' ? rankRaw : Number(String(rankRaw).replace(',', '.'));
      if (!Number.isFinite(rk) || rk < 1 || rk > 120) continue;

      const v3 = num(row[3]);
      const v4 = num(row[4]);
      const v5 = num(row[5]);
      const v6 = num(row[6]);
      const v7 = num(row[7]);
      const v8 = num(row[8]);
      const v9 = num(row[9]);
      const v10 = num(row[10]);
      const v11 = num(row[11]);

      let o: IndiceOut;
      if (nineCol) {
        o = {
          NOMBRE_EMPRESA: nombre,
          peer_id: empresaPeerId(nombre),
          year,
          month,
          SINI_PAG_VS_PRIM_PCT: v3,
          RESERVAS_VS_PRIM_PCT: v4,
          SINI_INC_VS_PRIM_DEV_PCT: v5,
          COMISION_VS_PRIM_PCT: v6,
          GAST_ADQ_VS_PRIM_PCT: v7,
          GAST_ADM_VS_PRIM_PCT: v8,
          COSTO_REAS_VS_PRIM_DEV_PCT: v9,
          TASA_COMBINADA_PCT: v10,
          INDICE_COB_RESERVAS: v11,
          archivo_fuente,
          hoja: sheetName,
        };
      } else {
        o = {
          NOMBRE_EMPRESA: nombre,
          peer_id: empresaPeerId(nombre),
          year,
          month,
          SINI_PAG_VS_PRIM_PCT: v3,
          RESERVAS_VS_PRIM_PCT: v4,
          SINI_INC_VS_PRIM_DEV_PCT: v5,
          COMISION_VS_PRIM_PCT: v6,
          GAST_ADQ_VS_PRIM_PCT: v7,
          GAST_ADM_VS_PRIM_PCT: v8,
          COSTO_REAS_VS_PRIM_DEV_PCT: null,
          TASA_COMBINADA_PCT: null,
          INDICE_COB_RESERVAS: v9,
          archivo_fuente,
          hoja: sheetName,
        };
      }
      out.push(o);
    }
  }

  return out;
}
