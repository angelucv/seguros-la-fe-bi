/** Meses en español para ejes y leyendas (datos tipo `2026-01` o `2026-02-28`). */

const CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;
const LARGO = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

function parseYm(s: string): { y: number; m: number } | null {
  const m = String(s).match(/(\d{4})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  return { y, m: mo };
}

/** Eje compacto: `Ene 2026` */
export function etiquetaMesEje(iso: string): string {
  const p = parseYm(iso);
  if (!p) return String(iso).slice(0, 7);
  return `${CORTO[p.m - 1]} ${p.y}`;
}

/** Leyenda bajo barras: `Enero`, `Febrero` (solo mes; si hay varios años, añade año). */
export function etiquetaMesLargoBarras(iso: string, todasLasFechas: string[]): string {
  const p = parseYm(iso);
  if (!p) return iso;
  const años = new Set(todasLasFechas.map((f) => parseYm(f)?.y).filter((x): x is number => x != null));
  const soloUnAño = años.size <= 1;
  if (soloUnAño) return LARGO[p.m - 1]!;
  return `${LARGO[p.m - 1]} ${p.y}`;
}

/** Tooltip / título de periodo */
export function etiquetaPeriodoLegible(iso: string): string {
  const p = parseYm(iso);
  if (!p) return String(iso).slice(0, 10);
  return `${LARGO[p.m - 1]} ${p.y}`;
}
