import type { BcvRow, PrimaRow } from './types';
import type { MensualRow } from './primaEngine';
import { acumuladoAPrimasMensuales, seriePeers } from './primaEngine';
import { num } from './csv';

export function loadBcvFromRecords(records: Record<string, string>[]): BcvRow[] {
  return records
    .map((r) => ({
      year: Number(r.year),
      month: Number(r.month),
      ves_por_usd: num(r.ves_por_usd) ?? NaN,
    }))
    .filter((r) => Number.isFinite(r.ves_por_usd));
}

/** Tipo de cambio oficial BCV del cierre de diciembre (VES por USD). */
export function vesPorUsdDiciembre(bcv: BcvRow[], year: number): number | null {
  const r = bcv.find((x) => x.year === year && x.month === 12);
  return r != null && Number.isFinite(r.ves_por_usd) ? r.ves_por_usd : null;
}

export function mergeTipoCambio<T extends { year: number; month: number }>(
  df: T[],
  tc: BcvRow[]
): (T & { ves_por_usd: number | null; fuente?: string })[] {
  const map = new Map<string, BcvRow>();
  for (const t of tc) map.set(`${t.year}-${t.month}`, t);
  return df.map((row) => {
    const k = `${row.year}-${row.month}`;
    const hit = map.get(k);
    return { ...row, ves_por_usd: hit ? hit.ves_por_usd : null };
  });
}

/** Miles de Bs. nominales → millones USD (tasa Bs. por USD). */
export function primasMilesBsToUsdMillones(primasMiles: number, ves: number | null): number {
  if (ves == null || !Number.isFinite(ves) || ves === 0) return NaN;
  const bs = primasMiles * 1000;
  return bs / ves / 1_000_000;
}

/** Variante con null si la tasa no es válida (p. ej. vistas BI Funerario). */
export function milesBsNominalToUsdMillonesNullable(primasMiles: number, ves: number | null): number | null {
  const v = primasMilesBsToUsdMillones(primasMiles, ves);
  return Number.isFinite(v) ? v : null;
}

export function agregarUsdMensual(m: (MensualRow & { ves_por_usd: number | null })[]) {
  return m.map((row) => ({
    ...row,
    primas_mes_millones_usd: primasMilesBsToUsdMillones(row.primas_mes_miles, row.ves_por_usd),
  }));
}

export function ytdUsdSumaMensual(
  rows: { year: number; fecha_periodo: string; peer_id: string; primas_mes_millones_usd?: number }[],
  peerId: string,
  ultFecha: string
): number {
  const y = Number(ultFecha.slice(0, 4));
  const sub = rows.filter(
    (r) => r.peer_id === peerId && r.year === y && r.fecha_periodo <= ultFecha && r.primas_mes_millones_usd != null
  );
  if (sub.length === 0) return NaN;
  return sub.reduce((s, r) => s + (r.primas_mes_millones_usd as number), 0);
}

export function ytdMillonesUsdDesdeSerieMensual(
  dfLargo: PrimaRow[],
  tc: BcvRow[],
  peerId: string,
  ultFecha: string
): number {
  const s = seriePeers(dfLargo, [peerId]);
  if (s.length === 0) return NaN;
  let sm = acumuladoAPrimasMensuales(s);
  sm = mergeTipoCambio(sm, tc) as typeof sm & { ves_por_usd: number | null }[];
  sm = agregarUsdMensual(sm as Parameters<typeof agregarUsdMensual>[0]);
  return ytdUsdSumaMensual(sm, peerId, ultFecha);
}

export function mercadoYtdMillonesUsdTotal(dfLargo: PrimaRow[], tc: BcvRow[], ultFecha: string): number {
  const row = dfLargo.filter((r) => r.fecha_periodo === ultFecha);
  if (row.length === 0) return NaN;
  const pids = [...new Set(row.map((r) => r.peer_id))];
  let total = 0;
  for (const pid of pids) {
    const v = ytdMillonesUsdDesdeSerieMensual(dfLargo, tc, pid, ultFecha);
    if (Number.isFinite(v)) total += v;
  }
  return total;
}

export function serieMensualMillonesUsd(dfLargo: PrimaRow[], tc: BcvRow[], peerId: string, year: number) {
  const s = seriePeers(dfLargo, [peerId]);
  if (s.length === 0) return [] as { month: number; label: string; y: number }[];
  let sm = acumuladoAPrimasMensuales(s);
  sm = mergeTipoCambio(sm, tc) as typeof sm & { ves_por_usd: number | null }[];
  sm = agregarUsdMensual(sm as Parameters<typeof agregarUsdMensual>[0]);
  const sub = sm
    .filter((r) => r.year === year && r.peer_id === peerId)
    .sort((a, b) => a.month - b.month);
  return sub.map((r) => ({
    month: r.month,
    label: `${year}-${String(r.month).padStart(2, '0')}`,
    y: r.primas_mes_millones_usd as number,
  }));
}

/** PNC al inicio del mes = acumulado al cierre del mes anterior (miles Bs.). */
export function primasAcumuladasAlInicioMes(df: PrimaRow[], peerId: string, fecha: string): number | null {
  const y = Number(fecha.slice(0, 4));
  const m = Number(fecha.slice(5, 7));
  const g = df.filter((r) => r.peer_id === peerId);
  if (g.length === 0) return null;
  if (m > 1) {
    const prev = g.find((r) => r.year === y && r.month === m - 1);
    if (prev) return prev.primas_miles_bs;
    return null;
  }
  const prevDec = g.find((r) => r.year === y - 1 && r.month === 12);
  if (prevDec) return prevDec.primas_miles_bs;
  return 0;
}

/**
 * Variación interanual entre acumulados de diciembre consecutivos, en términos reales:
 * cada cierre se convierte a millones USD con el tipo BCV oficial de **diciembre de ese año** (VES por USD),
 * y el % es (USD_b − USD_a) / USD_a. Así la comparación no queda distorsionada por la inflación en Bs. nominales.
 */
export function variacionInteranualDiciembre(df: PrimaRow[], peerIds: string[], bcv: BcvRow[]) {
  const d = df.filter((r) => r.month === 12);
  const byPeerYear = new Map<string, Map<number, number>>();
  for (const r of d) {
    if (!byPeerYear.has(r.peer_id)) byPeerYear.set(r.peer_id, new Map());
    byPeerYear.get(r.peer_id)!.set(r.year, r.primas_miles_bs);
  }
  const yearsSet = new Set<number>();
  for (const m of byPeerYear.values()) for (const y of m.keys()) yearsSet.add(y);
  const years = [...yearsSet].sort((a, b) => a - b);
  const rows: { peer_id: string; periodo: string; variacion_pct: number }[] = [];
  for (let i = 1; i < years.length; i++) {
    const a = years[i - 1]!;
    const b = years[i]!;
    const label = `${a}->${b}`;
    const vesA = vesPorUsdDiciembre(bcv, a);
    const vesB = vesPorUsdDiciembre(bcv, b);
    for (const pid of peerIds) {
      const map = byPeerYear.get(pid);
      if (!map) continue;
      const va = map.get(a);
      const vb = map.get(b);
      if (va === undefined || vb === undefined) continue;
      const usdA = primasMilesBsToUsdMillones(va, vesA);
      const usdB = primasMilesBsToUsdMillones(vb, vesB);
      if (!Number.isFinite(usdA) || !Number.isFinite(usdB) || usdA === 0) continue;
      rows.push({ peer_id: pid, periodo: label, variacion_pct: (100 * (usdB - usdA)) / usdA });
    }
  }
  return rows;
}
