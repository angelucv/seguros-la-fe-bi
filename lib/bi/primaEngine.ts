import type { PrimaRow } from './types';
import { BRAND_PEER_ID, RANK_COMPARATIVA_MAX, RANK_COMPARATIVA_MIN } from './config';
import { empresaPeerId } from './empresa';

export function ultimoPeriodo(df: PrimaRow[]): string {
  return df.reduce((m, r) => (r.fecha_periodo > m ? r.fecha_periodo : m), df[0]!.fecha_periodo);
}

export function topPeersEnFecha(df: PrimaRow[], fecha: string, n: number): string[] {
  const sub = df
    .filter((r) => r.fecha_periodo === fecha && r.ranking != null)
    .sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of sub) {
    if (seen.has(row.peer_id)) continue;
    seen.add(row.peer_id);
    out.push(row.peer_id);
    if (out.length >= n) break;
  }
  return out;
}

/**
 * Todos los `peer_id` con fila en el ranking del último periodo, ordenados por ranking.
 * Sirve para series históricas con selección de empresas en el cliente.
 */
export function peersOrdenadosUltimoCorte(df: PrimaRow[]): { ult: string; peerIds: string[] } {
  const ult = ultimoPeriodo(df);
  const tabla = tablaRankingEnFecha(df, ult);
  const seen = new Set<string>();
  const peerIds: string[] = [];
  for (const r of tabla) {
    if (seen.has(r.peer_id)) continue;
    seen.add(r.peer_id);
    peerIds.push(r.peer_id);
  }
  return { ult, peerIds };
}

/**
 * Último cierre y conjunto de empresas para gráficos de inicio/histórico:
 * prioriza el rango de ranking configurado (banda de mercado) e incluye siempre la marca.
 */
export function conjuntoAnalisis(df: PrimaRow[], _nLegacy: number): { ult: string; peerIds: string[] } {
  const ult = ultimoPeriodo(df);
  const tabla = tablaRankingEnFecha(df, ult);
  const enBanda = tabla.filter(
    (r) => r.ranking != null && r.ranking >= RANK_COMPARATIVA_MIN && r.ranking <= RANK_COMPARATIVA_MAX
  );
  const base = enBanda.length >= 3 ? enBanda : tabla.slice(0, Math.min(12, tabla.length));
  const set = new Set(base.map((r) => r.peer_id));
  if (!set.has(BRAND_PEER_ID)) set.add(BRAND_PEER_ID);
  const rankMap = new Map<string, number | null>();
  for (const r of df) {
    if (r.fecha_periodo === ult && !rankMap.has(r.peer_id)) rankMap.set(r.peer_id, r.ranking);
  }
  const peerIds = [...set].sort((a, b) => {
    const ra = rankMap.get(a) ?? 999;
    const rb = rankMap.get(b) ?? 999;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
  return { ult, peerIds };
}

export function tablaRankingEnFecha(df: PrimaRow[], fecha: string): PrimaRow[] {
  return df
    .filter((r) => r.fecha_periodo === fecha && r.ranking != null)
    .sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999));
}

export function ultimoPeriodoEnAno(df: PrimaRow[], year: number): string | null {
  const sub = df.filter((r) => r.year === year);
  if (sub.length === 0) return null;
  return sub.reduce((m, r) => (r.fecha_periodo > m ? r.fecha_periodo : m), sub[0]!.fecha_periodo);
}

export function seriePeers(df: PrimaRow[], peerIds: string[]): PrimaRow[] {
  const s = new Set(peerIds);
  return df.filter((r) => s.has(r.peer_id)).sort((a, b) => {
    const d = a.fecha_periodo.localeCompare(b.fecha_periodo);
    return d !== 0 ? d : a.peer_id.localeCompare(b.peer_id);
  });
}

export interface MensualRow extends PrimaRow {
  primas_mes_miles: number;
  primas_mes_millones_usd?: number;
  ves_por_usd?: number | null;
}

/** Acumulado YTD → flujo mensual (misma lógica que Python). */
export function acumuladoAPrimasMensuales(df: PrimaRow[]): MensualRow[] {
  const byPeer = new Map<string, PrimaRow[]>();
  for (const r of df) {
    if (!byPeer.has(r.peer_id)) byPeer.set(r.peer_id, []);
    byPeer.get(r.peer_id)!.push(r);
  }
  const out: MensualRow[] = [];
  for (const [, rows] of byPeer) {
    const byYear = new Map<number, PrimaRow[]>();
    for (const r of rows) {
      if (!byYear.has(r.year)) byYear.set(r.year, []);
      byYear.get(r.year)!.push(r);
    }
    const years = [...byYear.keys()].sort((a, b) => a - b);
    for (const y of years) {
      const gy = byYear.get(y)!.sort((a, b) => a.month - b.month);
      let prevAcum: number | null = null;
      for (const row of gy) {
        const ac = row.primas_miles_bs;
        if (Number.isNaN(ac)) continue;
        let mes: number;
        if (prevAcum === null) mes = ac;
        else mes = ac - prevAcum;
        prevAcum = ac;
        out.push({ ...row, primas_mes_miles: mes });
      }
    }
  }
  return out;
}

export function variacionInteranualDiciembre(df: PrimaRow[], peerIds: string[]) {
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
    for (const pid of peerIds) {
      const map = byPeerYear.get(pid);
      if (!map) continue;
      const va = map.get(a);
      const vb = map.get(b);
      if (va === undefined || vb === undefined || va === 0) continue;
      rows.push({ peer_id: pid, periodo: label, variacion_pct: (100 * (vb - va)) / va });
    }
  }
  return rows;
}

export function mapPrimasFromCsv(records: Record<string, string>[]): PrimaRow[] {
  const out: PrimaRow[] = [];
  for (const r of records) {
    const ranking = r.ranking ? Number(r.ranking) : null;
    const primas = Number(String(r.primas_miles_bs ?? '').replace(',', '.'));
    if (!Number.isFinite(primas)) continue;
    const pct = r.pct_participacion != null && r.pct_participacion !== '' ? Number(r.pct_participacion) : null;
    const empresaRaw = r.empresa_raw ?? '';
    out.push({
      ranking: ranking != null && Number.isFinite(ranking) ? ranking : null,
      empresa_raw: empresaRaw,
      peer_id: empresaPeerId(empresaRaw),
      primas_miles_bs: primas,
      pct_participacion: pct != null && Number.isFinite(pct) ? pct : null,
      year: Number(r.year),
      month: Number(r.month),
      fecha_periodo: String(r.fecha_periodo).slice(0, 10),
    });
  }
  return out;
}
