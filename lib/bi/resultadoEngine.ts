import type { PrimaRow, ResultadoRow } from './types';
import { tablaRankingEnFecha } from './primaEngine';
import { BRAND_PEER_ID, colorLineaPeer, RANK_COMPARATIVA_MAX, RANK_COMPARATIVA_MIN } from './config';
import { etiquetaDisplay } from './empresa';

/**
 * Saldo de operaciones (miles Bs.): valor del CSV si existe; si viene vacío, se obtiene como
 * RT neto + gestión general (definición del cuadro 1 del boletín SUDEASEG).
 */
function saldoOperacionesMilesCuadro(cu: ResultadoRow | undefined): number | null {
  if (!cu) return null;
  const direct = cu.saldo_operaciones_miles_bs;
  if (direct != null && Number.isFinite(direct)) return direct;
  const net = cu.rt_neto_miles_bs;
  const gg = cu.gestion_general_miles_bs;
  if (net != null && gg != null && Number.isFinite(net) && Number.isFinite(gg)) return net + gg;
  return null;
}

const MESES_ABR = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function labelOpcionCorte(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return `${MESES_ABR[m]!} ${y} · ${isoDate}`;
}

function pickCorteResultado(dfIn: ResultadoRow[], fechObjetivo: string): { rows: ResultadoRow[]; etiqueta: string } {
  const y = Number(fechObjetivo.slice(0, 4));
  const m = Number(fechObjetivo.slice(5, 7));
  const sub = dfIn.filter((r) => r.year === y && r.month === m);
  if (sub.length > 0) {
    return { rows: sub.sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999)), etiqueta: `${y}-${String(m).padStart(2, '0')}` };
  }
  const fo = fechObjetivo;
  const cand = dfIn.filter((r) => r.fecha_periodo <= fo);
  if (cand.length > 0) {
    const last = cand.reduce((mx, r) => (r.fecha_periodo > mx ? r.fecha_periodo : mx), cand[0]!.fecha_periodo);
    const sub2 = dfIn.filter((r) => r.fecha_periodo === last).sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999));
    return { rows: sub2, etiqueta: last.slice(0, 7) };
  }
  const last = dfIn.reduce((mx, r) => (r.fecha_periodo > mx ? r.fecha_periodo : mx), dfIn[0]!.fecha_periodo);
  const sub3 = dfIn.filter((r) => r.fecha_periodo === last).sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999));
  return { rows: sub3, etiqueta: last.slice(0, 7) };
}

function rankingPncBoletinEnFecha(dfPrimas: PrimaRow[], fecha: string): PrimaRow[] {
  let rank = tablaRankingEnFecha(dfPrimas, fecha);
  if (rank.length > 0) return rank;
  const le = dfPrimas.filter((r) => r.fecha_periodo <= fecha);
  if (le.length === 0) return [];
  const ft2 = le.reduce((m, r) => (r.fecha_periodo > m ? r.fecha_periodo : m), le[0]!.fecha_periodo);
  return tablaRankingEnFecha(dfPrimas, ft2);
}

export interface ResultadoDispRow {
  ranking_boletin: number;
  peer_id: string;
  empresa_raw: string;
  rt_bruto_miles_bs: number | null;
  reaseguro_cedido_miles_bs: number | null;
  rt_neto_miles_bs: number | null;
  gestion_general_miles_bs: number | null;
  saldo_operaciones_miles_bs: number | null;
  pnc_miles_bs: number | null;
  pct_saldo_sobre_pnc: number | null;
}

function cuadroTopNporRankingPnc(
  subCuadro: ResultadoRow[],
  dfPrimas: PrimaRow[],
  fechaCorte: string,
  n: number
): { disp: ResultadoDispRow[]; nota: string } {
  const rank = rankingPncBoletinEnFecha(dfPrimas, fechaCorte);
  if (rank.length === 0) {
    const s = [...subCuadro]
      .filter((r) => r.pnc_miles_bs != null)
      .sort((a, b) => (b.pnc_miles_bs ?? 0) - (a.pnc_miles_bs ?? 0))
      .slice(0, n);
    const disp: ResultadoDispRow[] = s.map((r, i) => ({
      ranking_boletin: i + 1,
      peer_id: r.peer_id,
      empresa_raw: r.empresa_raw,
      rt_bruto_miles_bs: r.rt_bruto_miles_bs,
      reaseguro_cedido_miles_bs: r.reaseguro_cedido_miles_bs,
      rt_neto_miles_bs: r.rt_neto_miles_bs,
      gestion_general_miles_bs: r.gestion_general_miles_bs,
      saldo_operaciones_miles_bs: saldoOperacionesMilesCuadro(r),
      pnc_miles_bs: r.pnc_miles_bs,
      pct_saldo_sobre_pnc: r.pct_saldo_sobre_pnc,
    }));
    return {
      disp,
      nota: 'Comparativa con las mayores primas netas cobradas disponibles para esta fecha.',
    };
  }
  const rtop = rank.slice(0, n);
  const nota = `Las ${n} empresas con mayor prima neta cobrada en el periodo seleccionado.`;
  const byPeer = new Map<string, ResultadoRow>();
  for (const r of subCuadro) byPeer.set(r.peer_id, r);
  const disp: ResultadoDispRow[] = [];
  for (const r of rtop) {
    const cu = byPeer.get(r.peer_id);
    const pncRank = r.primas_miles_bs;
    const pnc = cu?.pnc_miles_bs ?? pncRank;
    const saldo = saldoOperacionesMilesCuadro(cu);
    let pct: number | null = null;
    if (pnc != null && Math.abs(pnc) > 1e-12 && saldo != null) pct = (100 * saldo) / pnc;
    disp.push({
      ranking_boletin: r.ranking ?? disp.length + 1,
      peer_id: r.peer_id,
      empresa_raw: cu?.empresa_raw ?? r.empresa_raw,
      rt_bruto_miles_bs: cu?.rt_bruto_miles_bs ?? null,
      reaseguro_cedido_miles_bs: cu?.reaseguro_cedido_miles_bs ?? null,
      rt_neto_miles_bs: cu?.rt_neto_miles_bs ?? null,
      gestion_general_miles_bs: cu?.gestion_general_miles_bs ?? null,
      saldo_operaciones_miles_bs: saldo,
      pnc_miles_bs: pnc,
      pct_saldo_sobre_pnc: pct,
    });
  }
  return { disp, nota };
}

/**
 * Misma lógica que el Top N, pero restringido al rango de ranking PNC [rankMin, rankMax]
 * (banda de mercado). Si la marca no cae en la banda, se añade su fila para contexto.
 */
function findMarcaPrimaRow(rank: PrimaRow[], brandPeerId: string): PrimaRow | undefined {
  const exact = rank.find((r) => r.peer_id === brandPeerId);
  if (exact) return exact;
  return rank.find(
    (r) => /la fe|fe c\.?\s*a\.?/i.test(r.empresa_raw) && /seguros/i.test(r.empresa_raw)
  );
}

function cuadroBandaRankingPnc(
  subCuadro: ResultadoRow[],
  dfPrimas: PrimaRow[],
  fechaCorte: string,
  rankMin: number,
  rankMax: number,
  brandPeerId: string
): { disp: ResultadoDispRow[]; nota: string } {
  const rank = rankingPncBoletinEnFecha(dfPrimas, fechaCorte);
  if (rank.length === 0) {
    return cuadroTopNporRankingPnc(subCuadro, dfPrimas, fechaCorte, Math.min(16, rankMax - rankMin + 1));
  }
  /** Por número de ranking en CSV */
  let enBanda = rank.filter((r) => {
    if (r.ranking == null || !Number.isFinite(Number(r.ranking))) return false;
    const rk = Number(r.ranking);
    return rk >= rankMin && rk <= rankMax;
  });
  /**
   * Si el campo `ranking` no coincide con 15–30 (datos raros) pero el cuadro está ordenado por PNC,
   * tomamos las filas 15ª a 30ª del ranking ya ordenado (misma lógica que el boletín).
   */
  if (enBanda.length === 0 && rank.length >= rankMin) {
    enBanda = rank.slice(rankMin - 1, Math.min(rankMax, rank.length));
  }
  const byPeerOrder = new Map<string, PrimaRow>();
  for (const r of enBanda) byPeerOrder.set(r.peer_id, r);
  if (!byPeerOrder.has(brandPeerId)) {
    const marca = findMarcaPrimaRow(rank, brandPeerId);
    if (marca) byPeerOrder.set(marca.peer_id, marca);
  }
  let rlist = [...byPeerOrder.values()].sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999));
  /** Si la marca no estaba en el mapa por peer_id distinto, volver a unir por índice. */
  if (rlist.length === 0 && rank.length >= rankMin) {
    rlist = rank.slice(rankMin - 1, Math.min(rankMax, rank.length));
  }
  if (rlist.length === 0) {
    return {
      disp: [],
      nota: 'No hay datos suficientes para mostrar este segmento en el periodo elegido.',
    };
  }
  const nota = `Comparativa con empresas de volumen de prima similar (${rankMin}.º–${rankMax}.º posición por PNC). Incluye a Seguros La Fe aunque su posición quede fuera de ese segmento.`;
  const byPeer = new Map<string, ResultadoRow>();
  for (const r of subCuadro) byPeer.set(r.peer_id, r);
  const disp: ResultadoDispRow[] = [];
  for (const r of rlist) {
    const cu = byPeer.get(r.peer_id);
    const pncRank = r.primas_miles_bs;
    const pnc = cu?.pnc_miles_bs ?? pncRank;
    const saldo = saldoOperacionesMilesCuadro(cu);
    let pct: number | null = null;
    if (pnc != null && Math.abs(pnc) > 1e-12 && saldo != null) pct = (100 * saldo) / pnc;
    disp.push({
      ranking_boletin: r.ranking ?? disp.length + 1,
      peer_id: r.peer_id,
      empresa_raw: cu?.empresa_raw ?? r.empresa_raw,
      rt_bruto_miles_bs: cu?.rt_bruto_miles_bs ?? null,
      reaseguro_cedido_miles_bs: cu?.reaseguro_cedido_miles_bs ?? null,
      rt_neto_miles_bs: cu?.rt_neto_miles_bs ?? null,
      gestion_general_miles_bs: cu?.gestion_general_miles_bs ?? null,
      saldo_operaciones_miles_bs: saldo,
      pnc_miles_bs: pnc,
      pct_saldo_sobre_pnc: pct,
    });
  }
  return { disp, nota };
}

export type ResultadoRankingScope = 'top5' | 'bandaPnc';

export function buildResultadoSeccion(
  dfRes: ResultadoRow[],
  dfPrimas: PrimaRow[],
  fechRef: string,
  tsElegido: string,
  rankingScope: ResultadoRankingScope = 'top5'
): {
  etiquetaCorte: string;
  notaRank: string;
  disp: ResultadoDispRow[];
  chart: { labels: string[]; values: number[]; colors: string[]; text: string[] };
} {
  const sub = dfRes.filter((r) => r.fecha_periodo === tsElegido).sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999));
  const etiquetaCorte = labelOpcionCorte(tsElegido);

  /**
   * El ranking PNC (posiciones #1…#n y banda 15–30) debe alinearse al **cierre de primas** (`fechRef`),
   * no a la fecha del cuadro de resultado (`tsElegido`). Si ambas difieren, usar solo `tsElegido` deja
   * vacío el mapa de primas → banda sin filas → fallback erróneo al Top 5.
   */
  const fechaRankingPnc = rankingScope === 'bandaPnc' ? fechRef : tsElegido;
  const { disp, nota } =
    rankingScope === 'bandaPnc'
      ? cuadroBandaRankingPnc(sub, dfPrimas, fechaRankingPnc, RANK_COMPARATIVA_MIN, RANK_COMPARATIVA_MAX, BRAND_PEER_ID)
      : cuadroTopNporRankingPnc(sub, dfPrimas, tsElegido, 5);

  for (const row of disp) {
    const pnc = row.pnc_miles_bs;
    const saldo = row.saldo_operaciones_miles_bs;
    if (pnc != null && Math.abs(pnc) > 1e-12 && saldo != null) {
      row.pct_saldo_sobre_pnc = (100 * saldo) / pnc;
    }
  }

  const chartRows =
    rankingScope === 'bandaPnc' ? [...disp].reverse() : [...disp].slice(0, 5).reverse();
  const labels: string[] = [];
  const values: number[] = [];
  const colors: string[] = [];
  const text: string[] = [];
  for (let i = 0; i < chartRows.length; i++) {
    const r = chartRows[i]!;
    const rk = r.ranking_boletin;
    const pid = r.peer_id;
    const short = etiquetaDisplay(dfPrimas, pid);
    labels.push(`${rk} · ${short.length > 28 ? short.slice(0, 28) + '…' : short}`);
    const v = r.pct_saldo_sobre_pnc != null && Number.isFinite(r.pct_saldo_sobre_pnc) ? r.pct_saldo_sobre_pnc : 0;
    values.push(v);
    colors.push(colorLineaPeer(pid, (rk - 1) % 8));
    text.push(`${v.toFixed(2).replace('.', ',')} %`);
  }

  return {
    etiquetaCorte,
    notaRank: nota,
    disp,
    chart: { labels, values, colors, text },
  };
}

export function fechasUnicasResultado(dfRes: ResultadoRow[], dfPrimas: PrimaRow[]): string[] {
  const s = new Set<string>();
  for (const r of dfRes) s.add(r.fecha_periodo);
  for (const r of dfPrimas) s.add(r.fecha_periodo);
  return [...s].sort((a, b) => b.localeCompare(a));
}

export function defaultTsElegido(dfRes: ResultadoRow[], dfPrimas: PrimaRow[], fechRef: string): string {
  const { rows } = pickCorteResultado(dfRes, fechRef);
  if (rows.length) return rows[0]!.fecha_periodo;
  const all = fechasUnicasResultado(dfRes, dfPrimas);
  return all[0] ?? fechRef;
}
