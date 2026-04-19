const MESES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

/** Abreviaturas en nombres de archivo (Abr, Agos, Sep, …). */
const ABR: Record<string, number> = {
  ene: 1,
  feb: 2,
  mar: 3,
  marz: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  agos: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

export function monthFromSheetName(name: string): number | null {
  const n = name.trim().toLowerCase();
  if (MESES[n] != null) return MESES[n]!;
  return null;
}

/** Intenta extraer mes desde nombre de archivo (p. ej. `3_Indice_por_Empresa_Abr.xlsx`). */
export function monthFromFileName(fileName: string): number | null {
  const base = fileName.replace(/\.xlsx$/i, '');
  const lower = base.toLowerCase();
  for (const [k, v] of Object.entries(ABR)) {
    if (new RegExp(`[_\\s]${k}\\b`, 'i').test(lower) || new RegExp(`^${k}\\b`, 'i').test(lower)) return v;
  }
  for (const [k, v] of Object.entries(MESES)) {
    if (lower.includes(k)) return v;
  }
  return null;
}

export function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse "ACUMULADA AL 31 DE DICIEMBRE DE 2023" en una celda. */
export function parseYearMonthFromAcumuladaCell(text: string): { year: number; month: number } | null {
  const t = String(text).toUpperCase();
  const yearM = t.match(/(20\d{2})/);
  if (!yearM) return null;
  const year = Number(yearM[1]);
  for (const [mes, num] of Object.entries(MESES)) {
    if (t.includes(mes.toUpperCase())) return { year, month: num };
  }
  return null;
}
