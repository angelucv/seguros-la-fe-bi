import { BRAND_PEER_ID, CHART_HISTORICO_MIN_MES_PREFIJO } from '@/lib/bi/config';

/** Alineado a `CredixHistoricoLines` (evita import circular). */
export type CredixLineSeries = {
  peer_id: string;
  name: string;
  color: string;
  x: string[];
  y: (number | null)[];
};

export type ChartCatalogRow = { peer_id: string; name: string; ranking: number | null };

export const MIN_CHART_EMPRESAS = 1;
export const MAX_CHART_EMPRESAS = 5;

export type HistApi = {
  ult: string;
  generatedAt: string;
  datasetMeta?: {
    dataDirBase: string;
    primasRowCount: number;
    periodoPrimas?: { minFecha: string; maxFecha: string };
    anuarioReferenceYear?: number;
  };
  chartCatalog: ChartCatalogRow[];
  defaultChartPeerIds: string[];
  rankI: number | null;
  partI: number | null;
  ytdUsdIntl: number;
  ytdUsdLider: number;
  vsLiderPct: number | null;
  leaderLabel: string;
  varPivot: { peer_id: string; label: string; values: Record<string, number> }[];
  periods: string[];
  seriesFlujoUsd: CredixLineSeries[];
  seriesFlujoBs: CredixLineSeries[];
  seriesPart: CredixLineSeries[];
};

export function normalizeHistoricoPayload(raw: unknown): HistApi {
  const j = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const chartCatalog = Array.isArray(j.chartCatalog) ? (j.chartCatalog as ChartCatalogRow[]) : [];
  const defRaw = j.defaultChartPeerIds;
  const defaultChartPeerIds = Array.isArray(defRaw)
    ? defRaw.filter((x): x is string => typeof x === 'string')
    : [];

  const seriesFlujoUsd = Array.isArray(j.seriesFlujoUsd) ? (j.seriesFlujoUsd as CredixLineSeries[]) : [];
  const seriesFlujoBs = Array.isArray(j.seriesFlujoBs) ? (j.seriesFlujoBs as CredixLineSeries[]) : [];
  const seriesPart = Array.isArray(j.seriesPart) ? (j.seriesPart as CredixLineSeries[]) : [];
  const varPivot = Array.isArray(j.varPivot) ? (j.varPivot as HistApi['varPivot']) : [];
  const periods = Array.isArray(j.periods) ? (j.periods as string[]) : [];

  let effectiveCatalog = chartCatalog;
  if (effectiveCatalog.length === 0) {
    const byPeer = new Map<string, ChartCatalogRow>();
    for (const s of seriesFlujoUsd) {
      if (!byPeer.has(s.peer_id)) byPeer.set(s.peer_id, { peer_id: s.peer_id, name: s.name, ranking: null });
    }
    for (const s of seriesPart) {
      if (!byPeer.has(s.peer_id)) byPeer.set(s.peer_id, { peer_id: s.peer_id, name: s.name, ranking: null });
    }
    effectiveCatalog = [...byPeer.values()];
  }

  let datasetMeta: HistApi['datasetMeta'];
  const dm = j.datasetMeta;
  if (dm && typeof dm === 'object') {
    const o = dm as Record<string, unknown>;
    const pp = o.periodoPrimas;
    let periodoPrimas: { minFecha: string; maxFecha: string } | undefined;
    if (pp && typeof pp === 'object') {
      const q = pp as Record<string, unknown>;
      const minFecha = typeof q.minFecha === 'string' ? q.minFecha : '';
      const maxFecha = typeof q.maxFecha === 'string' ? q.maxFecha : '';
      if (minFecha && maxFecha) periodoPrimas = { minFecha, maxFecha };
    }
    datasetMeta = {
      dataDirBase: typeof o.dataDirBase === 'string' ? o.dataDirBase : '',
      primasRowCount: typeof o.primasRowCount === 'number' ? o.primasRowCount : 0,
      periodoPrimas,
      anuarioReferenceYear: typeof o.anuarioReferenceYear === 'number' ? o.anuarioReferenceYear : undefined,
    };
  }

  return {
    ult: typeof j.ult === 'string' ? j.ult : '',
    generatedAt: typeof j.generatedAt === 'string' ? j.generatedAt : new Date().toISOString(),
    datasetMeta,
    chartCatalog: effectiveCatalog,
    defaultChartPeerIds,
    rankI: typeof j.rankI === 'number' ? j.rankI : null,
    partI: typeof j.partI === 'number' ? j.partI : null,
    ytdUsdIntl: typeof j.ytdUsdIntl === 'number' ? j.ytdUsdIntl : NaN,
    ytdUsdLider: typeof j.ytdUsdLider === 'number' ? j.ytdUsdLider : NaN,
    vsLiderPct: typeof j.vsLiderPct === 'number' ? j.vsLiderPct : null,
    leaderLabel: typeof j.leaderLabel === 'string' ? j.leaderLabel : 'el líder',
    varPivot,
    periods,
    seriesFlujoUsd,
    seriesFlujoBs,
    seriesPart,
  };
}

/**
 * Ordena por ranking del catálogo y toma hasta `max` ids.
 * Si `prioritizePeerId` está en el conjunto pero quedaría fuera del top `max` solo por ranking,
 * se fuerza en primer lugar y el resto rellena con los mejores rankings entre los demás.
 */
export function takePeersByRanking(
  peerIds: string[],
  catalog: ChartCatalogRow[],
  max: number,
  prioritizePeerId?: string
): string[] {
  const rank = new Map(catalog.map((c) => [c.peer_id, c.ranking ?? 999]));
  const orderIdx = new Map(catalog.map((c, i) => [c.peer_id, i]));
  const inCatalog = new Set(catalog.map((c) => c.peer_id));
  const sorted = [...new Set(peerIds)]
    .filter((id) => inCatalog.has(id))
    .sort((a, b) => {
      const ra = rank.get(a) ?? 999;
      const rb = rank.get(b) ?? 999;
      if (ra !== rb) return ra - rb;
      return (orderIdx.get(a) ?? 0) - (orderIdx.get(b) ?? 0);
    });

  if (!prioritizePeerId || max <= 0) return sorted.slice(0, max);

  const pos = sorted.indexOf(prioritizePeerId);
  if (pos === -1) return sorted.slice(0, max);
  if (pos < max) return sorted.slice(0, max);

  const without = sorted.filter((id) => id !== prioritizePeerId);
  const rest = without.slice(0, Math.max(0, max - 1));
  return [prioritizePeerId, ...rest];
}

/**
 * Los mismos peer ids que el análisis por defecto (hasta 5): universo del selector de gráficos,
 * alineado con `conjuntoAnalisis(..., 5)` en el API cuando hay `defaultChartPeerIds`.
 */
export function peerIdsForChartChipPool(h: HistApi): string[] {
  const prio = BRAND_PEER_ID;
  if (h.defaultChartPeerIds.length > 0) {
    const t = takePeersByRanking(h.defaultChartPeerIds, h.chartCatalog, MAX_CHART_EMPRESAS, prio);
    if (t.length > 0) return t;
  }
  const fromSeries = h.seriesFlujoUsd.map((s) => s.peer_id).filter(Boolean);
  if (fromSeries.length > 0)
    return takePeersByRanking(fromSeries, h.chartCatalog, MAX_CHART_EMPRESAS, prio);
  return takePeersByRanking(h.chartCatalog.map((c) => c.peer_id), h.chartCatalog, MAX_CHART_EMPRESAS, prio);
}

export function pickInitialPeerSelection(h: HistApi): string[] {
  return peerIdsForChartChipPool(h);
}

/** Filas de catálogo solo para chips (máx. 5 empresas), sin listar todo el ranking. */
export function catalogRowsForChartChips(h: HistApi): ChartCatalogRow[] {
  const ids = peerIdsForChartChipPool(h);
  const byId = new Map(h.chartCatalog.map((c) => [c.peer_id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is ChartCatalogRow => c != null);
}

export function applyPeerToggle(
  prev: string[],
  peerId: string,
  min = MIN_CHART_EMPRESAS,
  max = MAX_CHART_EMPRESAS
): string[] {
  const next = new Set(prev);
  if (next.has(peerId)) {
    if (next.size <= min) return prev;
    next.delete(peerId);
  } else {
    if (next.size >= max) return prev;
    next.add(peerId);
  }
  return [...next];
}

export function filterAndOrderSeries(
  series: CredixLineSeries[],
  selected: Set<string>,
  catalog: ChartCatalogRow[]
): CredixLineSeries[] {
  const rank = new Map(catalog.map((c) => [c.peer_id, c.ranking ?? 999]));
  const orderIdx = new Map(catalog.map((c, i) => [c.peer_id, i]));
  return series
    .filter((s) => selected.has(s.peer_id))
    .sort((a, b) => {
      const ra = rank.get(a.peer_id) ?? 999;
      const rb = rank.get(b.peer_id) ?? 999;
      if (ra !== rb) return ra - rb;
      return (orderIdx.get(a.peer_id) ?? 0) - (orderIdx.get(b.peer_id) ?? 0);
    });
}

/**
 * Misma línea de tiempo para todas las series: unión de fechas ordenada y valor por `fecha_periodo`.
 * Sin esto, alinear por índice mezcla meses entre empresas (p. ej. La Fe vs otras con distinto historial).
 */
export function alignCredixLineSeriesByDate(series: CredixLineSeries[]): CredixLineSeries[] {
  if (series.length === 0) return [];
  const allX = [...new Set(series.flatMap((s) => s.x))].sort((a, b) => a.localeCompare(b));
  return series.map((s) => {
    const byDate = new Map<string, number | null>();
    for (let i = 0; i < s.x.length; i++) {
      const k = s.x[i]!;
      let v: number | null = s.y[i] as number | null;
      if (v != null && typeof v === 'number' && !Number.isFinite(v)) v = null;
      byDate.set(k, v);
    }
    return {
      ...s,
      x: allX,
      y: allX.map((fecha) => {
        const v = byDate.get(fecha);
        return v === undefined ? null : v;
      }),
    };
  });
}

/**
 * Recorta cada serie a meses con prefijo ≥ `minMesPrefijo` (p. ej. `2023-01`), alineado al eje del gráfico histórico.
 */
export function trimCredixLineSeriesDesdeMesMin(
  series: CredixLineSeries[],
  minMesPrefijo: string = CHART_HISTORICO_MIN_MES_PREFIJO
): CredixLineSeries[] {
  if (series.length === 0) return [];
  return series.map((s) => {
    const x: string[] = [];
    const y: (number | null)[] = [];
    for (let i = 0; i < s.x.length; i++) {
      if (String(s.x[i]).slice(0, 7) >= minMesPrefijo) {
        x.push(s.x[i]!);
        y.push(s.y[i] as number | null);
      }
    }
    return { ...s, x, y };
  });
}

/** Filas CSV (separador `;`, decimales con coma) para las series visibles. */
export function buildHistoricoCsv(series: CredixLineSeries[], titulo: string): string {
  if (!series.length) return '';
  const aligned = alignCredixLineSeriesByDate(series);
  const esc = (v: string | number) => {
    const s = String(v);
    if (/[;\r\n"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = ['periodo', ...aligned.map((s) => esc(s.name))];
  const n = aligned[0]!.x.length;
  const lines = [header.join(';')];
  for (let i = 0; i < n; i++) {
    const period = aligned[0]!.x[i] ?? '';
    const cells = [esc(period)];
    for (const s of aligned) {
      const v = s.y[i];
      if (v == null || !Number.isFinite(v)) cells.push('');
      else cells.push(esc(typeof v === 'number' ? String(v).replace('.', ',') : String(v)));
    }
    lines.push(cells.join(';'));
  }
  return `# ${titulo}\n${lines.join('\n')}`;
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function seriesNullGapSummary(series: CredixLineSeries[]): { name: string; nullCount: number }[] {
  return series
    .map((s) => ({
      name: s.name,
      nullCount: s.y.filter((v) => v == null || !Number.isFinite(v as number)).length,
    }))
    .filter((x) => x.nullCount > 0);
}
