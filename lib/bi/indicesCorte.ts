import type { IndiceBoletinRow } from './types';

/**
 * Misma lógica que pandas: año máximo, luego mes máximo en ese año.
 * Evita `Math.max()` sobre [] (−∞) o años `NaN` por datos sucios en CSV.
 */
export function latestIndicesYearMonth(idx: IndiceBoletinRow[]): { iy: number; im: number } | null {
  const years = [...new Set(idx.map((r) => r.year).filter((y) => Number.isFinite(y) && y > 1900 && y < 3000))];
  if (years.length === 0) return null;
  const iy = Math.max(...years);
  const months = idx
    .filter((r) => r.year === iy)
    .map((r) => r.month)
    .filter((m) => Number.isFinite(m) && m >= 1 && m <= 12);
  if (months.length === 0) return null;
  const im = Math.max(...months);
  return { iy, im };
}
