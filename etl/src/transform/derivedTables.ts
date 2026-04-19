import type { IndiceOut } from '../parsers/indices.js';
import type { PrimaOut } from '../parsers/primas.js';

function n(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v;
}

/**
 * Aproxima el cuadro 29 del boletín usando el cierre de **diciembre** de índices por empresa
 * (mismas magnitudes base que el sector, con mapeo explícito a columnas del BI).
 */
export function buildCuadro29FromIndicesDecember(indices: IndiceOut[], year: number): Record<string, unknown>[] {
  const dec = indices.filter((r) => r.year === year && r.month === 12);
  const rows: Record<string, unknown>[] = [];
  for (const r of dec) {
    const com = n(r.COMISION_VS_PRIM_PCT);
    const adq = n(r.GAST_ADQ_VS_PRIM_PCT);
    const comAdq = com != null || adq != null ? (com ?? 0) + (adq ?? 0) : null;
    rows.push({
      NOMBRE_EMPRESA: r.NOMBRE_EMPRESA,
      PCT_SINIESTRALIDAD_PAGADA: n(r.SINI_PAG_VS_PRIM_PCT),
      PCT_COMISION_GASTOS_ADQUISICION: comAdq,
      PCT_GASTOS_ADMINISTRACION: n(r.GAST_ADM_VS_PRIM_PCT),
      GASTOS_COBERTURA_RESERVAS: n(r.INDICE_COB_RESERVAS),
      INDICE_UTILIDAD_PATRIMONIO: '',
    });
  }
  return rows;
}

/** Primas netas acumuladas a diciembre por empresa (una fila por peer). */
function primasDiciembrePorPeer(primas: PrimaOut[], year: number): Map<string, { name: string; primas: number }> {
  const m = new Map<string, { name: string; primas: number }>();
  for (const r of primas) {
    if (r.year !== year || r.month !== 12) continue;
    m.set(r.peer_id, { name: r.empresa_raw, primas: r.primas_miles_bs });
  }
  return m;
}

/**
 * Variación interanual de primas netas (estilo cuadro 31A): año actual vs anterior a diciembre.
 */
export function buildCuadro31aPrimasYoY(primas: PrimaOut[], yearNew: number, yearOld: number): Record<string, unknown>[] {
  const a = primasDiciembrePorPeer(primas, yearNew);
  const b = primasDiciembrePorPeer(primas, yearOld);
  const peers = new Set([...a.keys(), ...b.keys()]);
  const rows: Record<string, unknown>[] = [];
  for (const pid of peers) {
    const na = a.get(pid);
    const ob = b.get(pid);
    const pNew = na?.primas ?? 0;
    const pOld = ob?.primas ?? 0;
    let crec: number | string = '';
    if (pOld !== 0 && Number.isFinite(pOld) && Number.isFinite(pNew)) {
      crec = Math.round((100 * (pNew - pOld)) / pOld);
    } else if (pNew > 0 && pOld === 0) {
      crec = '';
    }
    rows.push({
      NOMBRE_EMPRESA: na?.name ?? ob?.name ?? pid,
      [`PRIMAS_${yearOld}`]: pOld,
      [`PRIMAS_${yearNew}`]: pNew,
      CRECIMIENTO_PORC: crec,
    });
  }
  rows.sort((x, y) => String(x.NOMBRE_EMPRESA).localeCompare(String(y.NOMBRE_EMPRESA)));
  return rows;
}

export function maxYearWithDecemberIndices(indices: IndiceOut[]): number | null {
  let y: number | null = null;
  for (const r of indices) {
    if (r.month !== 12) continue;
    if (y == null || r.year > y) y = r.year;
  }
  return y;
}

export function maxYearWithDecemberPrimas(primas: PrimaOut[]): number | null {
  let y: number | null = null;
  for (const r of primas) {
    if (r.month !== 12) continue;
    if (y == null || r.year > y) y = r.year;
  }
  return y;
}
