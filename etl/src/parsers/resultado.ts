import XLSX from 'xlsx';
import path from 'node:path';
import { empresaPeerId } from '../empresaPeerId.js';
import { lastDayOfMonth, monthFromSheetName, monthFromFileName, parseYearMonthFromAcumuladaCell } from './months.js';

export interface ResultadoOut {
  ranking: number | null;
  empresa_raw: string;
  peer_id: string;
  pnc_miles_bs: number | null;
  rt_bruto_miles_bs: number | null;
  reaseguro_cedido_miles_bs: number | null;
  rt_neto_miles_bs: number | null;
  gestion_general_miles_bs: number | null;
  saldo_operaciones_miles_bs: number | null;
  pct_saldo_sobre_pnc: number | null;
  year: number;
  month: number;
  fecha_periodo: string;
  archivo_fuente: string;
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

/**
 * Formato reciente SUDEASEG (p. ej. 2026): la primera cifra del cuadro es «Resultado técnico bruto»;
 * las «Primas netas cobradas» van en otro cuadro/archivo. El layout antiguo tenía PNC en la col. D.
 */
function esCuadroSinColumnaPnc(matrix: (string | number)[][], headerRow: number): boolean {
  const c3 = String(matrix[headerRow]?.[3] ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return c3.includes('resultado') && c3.includes('bruto') && !c3.includes('prima');
}

export function parseResultadoXlsx(filePath: string, buf: Buffer): ResultadoOut[] {
  const archivo_fuente = path.basename(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const out: ResultadoOut[] = [];
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
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length < 7) continue;
      const a = String(row[1] ?? '').trim();
      const b = String(row[2] ?? '').toLowerCase();
      if (a === '#' && b.includes('empresa')) {
        const line = row.map((c) => String(c).toLowerCase()).join(' ');
        if (line.includes('saldo') && line.includes('operaciones')) {
          headerRow = r;
          break;
        }
      }
    }
    if (headerRow < 0) continue;

    const sinPnc = esCuadroSinColumnaPnc(matrix, headerRow);

    for (let r = headerRow + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length < 6) continue;
      const empresaCell = String(row[2] ?? '').trim();
      if (!empresaCell || empresaCell.toLowerCase().includes('primas netas')) continue;
      const rankRaw = row[1];
      const rk = typeof rankRaw === 'number' ? rankRaw : Number(String(rankRaw).replace(',', '.'));
      if (!Number.isFinite(rk) || rk < 1) continue;

      const empresa_raw = empresaCell.replace(/\s+/g, ' ').trim();
      if (!empresa_raw || empresa_raw === '0') continue;
      if (/^\d+\/\s*A la fecha/i.test(empresa_raw)) continue;

      let pnc: number | null = null;
      let rtBruto: number | null;
      let reaseguro: number | null;
      let rtNeto: number | null;
      let gestion: number | null;
      let saldo: number | null;

      if (sinPnc) {
        rtBruto = num(row[3]);
        reaseguro = num(row[4]);
        rtNeto = num(row[5]);
        gestion = num(row[6]);
        saldo = num(row[7]);
      } else {
        pnc = num(row[3]);
        rtBruto = num(row[4]);
        reaseguro = num(row[5]);
        rtNeto = num(row[6]);
        gestion = num(row[7]);
        saldo = num(row[8]);
      }

      let pct: number | null = null;
      if (pnc != null && Math.abs(pnc) > 1e-12 && saldo != null) {
        pct = (100 * saldo) / pnc;
      }

      const fecha_periodo = lastDayOfMonth(year, month);
      out.push({
        ranking: Math.round(rk),
        empresa_raw,
        peer_id: empresaPeerId(empresa_raw),
        pnc_miles_bs: pnc,
        rt_bruto_miles_bs: rtBruto,
        reaseguro_cedido_miles_bs: reaseguro,
        rt_neto_miles_bs: rtNeto,
        gestion_general_miles_bs: gestion,
        saldo_operaciones_miles_bs: saldo,
        pct_saldo_sobre_pnc: pct,
        year,
        month,
        fecha_periodo,
        archivo_fuente,
      });
    }
  }

  return out;
}
