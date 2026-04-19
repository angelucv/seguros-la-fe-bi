import fs from 'node:fs';
import path from 'node:path';
import type { PrimaRow } from './types';

/** Rango de fechas presentes en el cuadro de primas mensuales (serie larga). */
export function periodoPrimasDesdeHasta(primas: PrimaRow[]): { minFecha: string; maxFecha: string } {
  if (!primas.length) {
    const z = '1970-01-01';
    return { minFecha: z, maxFecha: z };
  }
  let min = primas[0]!.fecha_periodo;
  let max = primas[0]!.fecha_periodo;
  for (const r of primas) {
    if (r.fecha_periodo < min) min = r.fecha_periodo;
    if (r.fecha_periodo > max) max = r.fecha_periodo;
  }
  return { minFecha: min, maxFecha: max };
}

/** Mayor año presente en archivos `cuadro_29_indicadores_financieros_YYYY_por_empresa.csv` (si hay varios). */
export function maxYearCuadro29EnDirectorio(dataDir: string): number | null {
  let best = -1;
  try {
    for (const f of fs.readdirSync(dataDir)) {
      const m = /^cuadro_29_indicadores_financieros_(\d{4})_por_empresa\.csv$/.exec(f);
      if (m) {
        const y = Number(m[1]);
        if (y > best) best = y;
      }
    }
  } catch {
    return null;
  }
  return best >= 0 ? best : null;
}

/**
 * Año de referencia del anuario / cuadro 29 para textos del BI.
 * Prioridad: año en el nombre del archivo elegido; si es el CSV genérico sin año, el mayor año entre archivos cuadro 29 en la carpeta; si no, máximo año en primas.
 */
export function inferAnuarioReferenceYear(
  primas: PrimaRow[],
  cuadro29Path: string | null,
  dataDir: string
): number {
  if (cuadro29Path) {
    const base = path.basename(cuadro29Path);
    const m = /^cuadro_29_indicadores_financieros_(\d{4})_por_empresa\.csv$/.exec(base);
    if (m) return Number(m[1]);
    if (/^cuadro_29_indicadores_financieros_por_empresa\.csv$/.test(base)) {
      const yDir = maxYearCuadro29EnDirectorio(dataDir);
      if (yDir != null) return yDir;
    }
  }
  const ys = primas.map((r) => r.year).filter((y) => Number.isFinite(y));
  return ys.length ? Math.max(...ys) : new Date().getFullYear();
}
