import XLSX from 'xlsx';
import path from 'node:path';
import { empresaPeerId } from '../empresaPeerId.js';
import { lastDayOfMonth, monthFromSheetName, monthFromFileName, parseYearMonthFromAcumuladaCell } from './months.js';

export interface PrimaOut {
  ranking: number | null;
  empresa_raw: string;
  peer_id: string;
  primas_miles_bs: number;
  pct_participacion: number | null;
  year: number;
  month: number;
  fecha_periodo: string;
  archivo_fuente: string;
  hoja_mes: string;
  empresa_norm: string;
}

function normEmpresa(s: string): string {
  return String(s).replace(/\s+/g, ' ').trim();
}

function inferYearFromFilename(name: string): number | null {
  const m = name.match(/(20\d{2})/);
  return m ? Number(m[1]) : null;
}

function isTotalRow(empresa: string): boolean {
  const u = empresa.toUpperCase();
  return u.includes('TOTAL') || u.includes('SUMA') || u.includes('PRIMERAS 10');
}

export function parsePrimasXlsx(filePath: string, buf: Buffer): PrimaOut[] {
  const archivo_fuente = path.basename(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const out: PrimaOut[] = [];
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
      if (!row) continue;
      const a = String(row[1] ?? '').toLowerCase();
      const b = String(row[2] ?? '').toLowerCase();
      if (a.includes('ranking') && (b.includes('empresa') || b.includes('empresas'))) {
        headerRow = r;
        break;
      }
    }
    if (headerRow < 0) continue;

    for (let r = headerRow + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length < 4) continue;
      const rankRaw = row[1];
      const empresa = normEmpresa(String(row[2] ?? ''));
      if (!empresa || empresa === '0' || empresa.length > 85) continue;
      if (isTotalRow(empresa)) continue;
      const rk = typeof rankRaw === 'number' ? rankRaw : Number(String(rankRaw).replace(',', '.'));
      if (!Number.isFinite(rk)) continue;
      const primas = Number(String(row[3] ?? '').replace(',', '.'));
      if (!Number.isFinite(primas)) continue;
      const pctRaw = row[4];
      const pct =
        pctRaw === '' || pctRaw === undefined
          ? null
          : Number(String(pctRaw).replace(',', '.'));
      const fecha_periodo = lastDayOfMonth(year, month);
      const empresa_raw = empresa;
      out.push({
        ranking: Math.round(rk),
        empresa_raw,
        peer_id: empresaPeerId(empresa_raw),
        primas_miles_bs: primas,
        pct_participacion: pct != null && Number.isFinite(pct) ? pct : null,
        year,
        month,
        fecha_periodo,
        archivo_fuente,
        hoja_mes: sheetName,
        empresa_norm: normEmpresa(empresa_raw),
      });
    }
  }

  return out;
}
