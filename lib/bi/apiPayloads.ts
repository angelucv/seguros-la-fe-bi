import path from 'node:path';
import {
  BRAND_PEER_ID,
  COLOR_PEER_MARCA,
  INDICES_METRICAS,
  INDICES_SUBPLOT_TITLES,
  RANK_COMPARATIVA_MAX,
  RANK_COMPARATIVA_MIN,
  SECTOR_COMPARATIVA_MAX_EMPRESAS,
  colorLineaPeer,
} from './config';
import type { LoadedDataset } from './dataset';
import {
  mercadoYtdMillonesUsdTotal,
  mergeTipoCambio,
  primasAcumuladasAlInicioMes,
  serieMensualMillonesUsd,
  ytdMillonesUsdDesdeSerieMensual,
  agregarUsdMensual,
} from './fxEngine';
import {
  acumuladoAPrimasMensuales,
  conjuntoAnalisis,
  peersOrdenadosUltimoCorte,
  seriePeers,
  tablaRankingEnFecha,
  ultimoPeriodoEnAno,
  variacionInteranualDiciembre,
} from './primaEngine';
import { etiquetaBarraCorta, etiquetaDisplay } from './empresa';
import {
  buildResultadoSeccion,
  defaultTsElegido,
  fechasUnicasResultado,
  labelOpcionCorte,
  type ResultadoRankingScope,
} from './resultadoEngine';
import { BI_API_MARK } from './apiMark';
import { latestIndicesYearMonth } from './indicesCorte';
import type { IndiceBoletinRow } from './types';
import type { ChartCatalogRow } from '../../src/lib/biHistoricoHelpers';
import { takePeersByRanking } from '../../src/lib/biHistoricoHelpers';

const BOLETIN_FILA_BG = [
  '#1e3a5f',
  '#2563eb',
  '#0d9488',
  '#059669',
  '#65a30d',
  '#7f1d1d',
  '#dc2626',
  '#ca8a04',
  '#9ca3af',
  '#6b7280',
];

function tacometroAxisMax(valorEmpresa: number, promedioSector: number | null, piso: number): number {
  const ve = Number.isFinite(valorEmpresa) ? valorEmpresa : 0;
  let cand = Math.max(piso, ve * 1.22);
  if (promedioSector != null && Number.isFinite(promedioSector)) {
    cand = Math.max(cand, promedioSector * 1.22);
  }
  if (!Number.isFinite(cand)) cand = Math.max(piso, 8);
  const step = cand <= 45 ? 5 : cand <= 120 ? 10 : 15;
  return Math.ceil(Math.max(cand, 8) / step) * step;
}

function sectorPromedio(
  idx: IndiceBoletinRow[],
  iy: number,
  im: number,
  col: keyof IndiceBoletinRow
): number | null {
  const sub = idx.filter((r) => r.year === iy && r.month === im);
  const vals: number[] = [];
  for (const r of sub) {
    const v = r[col];
    if (typeof v === 'number' && Number.isFinite(v)) vals.push(v);
  }
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function buildHomePayload(ds: LoadedDataset, corte?: string) {
  const { primas, resultado } = ds;
  const { ult, peerIds } = conjuntoAnalisis(primas, 5);
  const fechRef = corte ?? ult;
  const ts = resultado?.length ? defaultTsElegido(resultado, primas, fechRef) : fechRef;
  const res =
    resultado && resultado.length
      ? buildResultadoSeccion(resultado, primas, fechRef, ts, 'bandaPnc')
      : null;
  const cortes = resultado?.length ? fechasUnicasResultado(resultado, primas).map((d) => ({ value: d, label: labelOpcionCorte(d) })) : [];
  return {
    serverMark: BI_API_MARK,
    vistaResultado: 'banda_15_30' as const,
    _meta: {
      mark: BI_API_MARK,
      resultadoTabla: 'banda_15_30' as const,
    },
    ultimoCierre: ult,
    peerIdsAnalisis: peerIds,
    resultado: res,
    cortesResultado: cortes,
    defaultCorte: ts,
    periodoPrimas: ds.periodoPrimas,
    anuarioReferenceYear: ds.anuarioReferenceYear,
  };
}

export function buildSectorPayload(ds: LoadedDataset) {
  const { primas, bcv, indicesMes, indicesHist, indicadores29 } = ds;
  const yearsOk = primas.map((r) => r.year).filter((y) => Number.isFinite(y));
  const anioCurso = yearsOk.length ? Math.max(...yearsOk) : new Date().getFullYear();
  const fech26 = ultimoPeriodoEnAno(primas, anioCurso);
  if (!fech26) {
    return { error: `No hay datos para el último año (${anioCurso}).` };
  }
  const rankFull = tablaRankingEnFecha(primas, fech26);
  const totalMercadoUsd = mercadoYtdMillonesUsdTotal(primas, bcv, fech26);
  const ranked = rankFull.map((r, i) => ({ ...r, Ranking: r.ranking ?? i + 1 }));
  const focus = ranked.find((r) => r.peer_id === BRAND_PEER_ID);
  const rango = focus ? Number(focus.ranking) : null;
  const filasBanda = ranked.filter(
    (r) => r.ranking != null && r.ranking >= RANK_COMPARATIVA_MIN && r.ranking <= RANK_COMPARATIVA_MAX
  );
  const pool = filasBanda.length >= 3 ? filasBanda : ranked.slice(0, Math.min(8, ranked.length));
  const candidatePeerIds = [...new Set(pool.map((r) => r.peer_id))];
  if (!candidatePeerIds.includes(BRAND_PEER_ID)) {
    const tieneMarca = ranked.some((r) => r.peer_id === BRAND_PEER_ID);
    if (tieneMarca) candidatePeerIds.push(BRAND_PEER_ID);
  }
  const chartCatalogSector: ChartCatalogRow[] = ranked.map((r) => ({
    peer_id: r.peer_id,
    name: String(r.empresa_raw ?? r.peer_id),
    ranking: r.ranking,
  }));
  const limitedPeerIds = takePeersByRanking(
    candidatePeerIds,
    chartCatalogSector,
    SECTOR_COMPARATIVA_MAX_EMPRESAS,
    BRAND_PEER_ID
  );
  const byPeerRanked = new Map(ranked.map((r) => [r.peer_id, r]));
  type RankedRow = (typeof ranked)[number];
  const filasParaGraficos = limitedPeerIds
    .map((pid) => byPeerRanked.get(pid))
    .filter((row): row is RankedRow => row != null);

  const tacSpecs = [
    { col: 'SINI_PAG_VS_PRIM_PCT' as const, title: 'Siniestralidad (pag./primas)', piso: 85, needle: '#E63946' },
    { col: 'GAST_ADM_VS_PRIM_PCT' as const, title: 'Gastos administración', piso: 35, needle: '#1D3557' },
    { col: 'COMISION_VS_PRIM_PCT' as const, title: 'Comisiones', piso: 18, needle: '#7209B7' },
    { col: 'GAST_ADQ_VS_PRIM_PCT' as const, title: 'Gastos de adquisición', piso: 14, needle: '#F77F00' },
  ];

  let tacometers: {
    title: string;
    valueEmpresa: number;
    sectorAvg: number | null;
    max: number;
    needleColor: string;
  }[] = [];
  let indicesCorte: { iy: number; im: number; mesNombre: string; archivo?: string } | null = null;

  if (indicesMes && indicesMes.length) {
    const ym = latestIndicesYearMonth(indicesMes);
    if (!ym) {
      indicesCorte = null;
    } else {
      const { iy, im } = ym;
    const subLi = indicesMes.filter((r) => r.peer_id === BRAND_PEER_ID && r.year === iy && r.month === im);
    const rr = subLi[0];
    indicesCorte = {
      iy,
      im,
      mesNombre: ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][im] ?? String(im),
      archivo: rr?.archivo_fuente,
    };
    if (rr) {
      tacometers = tacSpecs.map((s) => {
        const vEmp = (rr[s.col] as number | null) ?? 0;
        const vSec = sectorPromedio(indicesMes, iy, im, s.col);
        const mx = tacometroAxisMax(vEmp, vSec, s.piso);
        return {
          title: s.title,
          valueEmpresa: vEmp,
          sectorAvg: vSec,
          max: mx,
          needleColor: s.needle,
        };
      });
    }
    }
  }

  /** Donut: Top 5 por ranking PNC + Seguros La Fe como rebanada propia si no está entre los líderes + resto agregado. */
  const pieLabels: string[] = [];
  const pieVals: number[] = [];
  const pieColors: string[] = [];
  const piePull: number[] = [];
  const piePeerIds: (string | null)[] = [];
  let pieColorIdx = 0;
  const top5Filas = ranked.slice(0, Math.min(5, ranked.length));
  const top5PeerIds = new Set(top5Filas.map((r) => r.peer_id));
  for (const r of top5Filas) {
    const pid = r.peer_id;
    const usd = ytdMillonesUsdDesdeSerieMensual(primas, bcv, pid, fech26);
    const v = Number.isFinite(usd) ? usd : 0;
    pieLabels.push(etiquetaDisplay(primas, pid));
    pieVals.push(v);
    pieColors.push(pid === BRAND_PEER_ID ? COLOR_PEER_MARCA : colorLineaPeer(pid, pieColorIdx));
    piePull.push(pid === BRAND_PEER_ID ? 0.36 : 0);
    piePeerIds.push(pid);
    pieColorIdx++;
  }
  let marcaEnSlicePropia = false;
  if (!top5PeerIds.has(BRAND_PEER_ID)) {
    const tieneMarca = ranked.some((r) => r.peer_id === BRAND_PEER_ID);
    if (tieneMarca) {
      const usd = ytdMillonesUsdDesdeSerieMensual(primas, bcv, BRAND_PEER_ID, fech26);
      const v = Number.isFinite(usd) ? usd : 0;
      pieLabels.push(etiquetaDisplay(primas, BRAND_PEER_ID));
      pieVals.push(v);
      pieColors.push(COLOR_PEER_MARCA);
      piePull.push(0.52);
      piePeerIds.push(BRAND_PEER_ID);
      marcaEnSlicePropia = true;
    }
  }
  const sumNamed = pieVals.reduce((a, b) => a + b, 0);
  const totUsd = Number.isFinite(totalMercadoUsd) ? totalMercadoUsd : 0;
  const resto = Math.max(0, totUsd - sumNamed);
  pieLabels.push('Resto del mercado');
  pieVals.push(resto);
  pieColors.push('#B8BCC8');
  piePull.push(0);
  piePeerIds.push(null);
  const marcaHighlightIndex = piePeerIds.findIndex((p) => p === BRAND_PEER_ID);
  const participacionDescripcion =
    marcaEnSlicePropia && rango != null
      ? `Composición: <strong>Top 5</strong> por PNC del cuadro, <strong>Seguros La Fe</strong> como porción visible (ranking #${rango}), y <strong>resto del mercado</strong> agregado.`
      : marcaEnSlicePropia
        ? 'Composición: <strong>Top 5</strong> por PNC del cuadro, <strong>Seguros La Fe</strong> como porción aparte, y <strong>resto del mercado</strong> agregado.'
        : 'Composición: <strong>Top 5</strong> por PNC del cuadro (incluye a Seguros La Fe si figura entre los líderes) y <strong>resto del mercado</strong> agregado.';

  const mesesLabels = (() => {
    for (const r of filasParaGraficos) {
      const ser = serieMensualMillonesUsd(primas, bcv, r.peer_id, anioCurso);
      if (ser.length) return ser.map((x) => x.label);
    }
    const months = [...new Set(primas.filter((p) => p.year === anioCurso).map((p) => p.month))].sort((a, b) => a - b);
    return months.map((m) => `${anioCurso}-${String(m).padStart(2, '0')}`);
  })();

  const primasMensualesComparativa = filasParaGraficos.map((r, j) => {
    const pid = r.peer_id;
    const ser = serieMensualMillonesUsd(primas, bcv, pid, anioCurso);
    const byM = new Map(ser.map((s) => [s.month, s.y]));
    const ys = mesesLabels.map((lab) => {
      const mo = Number(lab.split('-')[1]);
      return byM.get(mo) ?? 0;
    });
    return {
      peer_id: pid,
      name: etiquetaBarraCorta(primas, pid),
      color: colorLineaPeer(pid, j),
      y: ys,
    };
  });

  const tabVol = filasParaGraficos.map((r) => ({
    ranking: r.ranking,
    empresa: r.empresa_raw,
    usd: ytdMillonesUsdDesdeSerieMensual(primas, bcv, r.peer_id, fech26),
    pct: r.pct_participacion,
    milesBs: r.primas_miles_bs,
  }));

  let tabIndTable: { empresa: string; peer_id: string; metrics: Record<string, number | null> }[] = [];
  let tabIndBars: { title: string; traces: { name: string; x: string[]; y: number[]; color: string }[] }[] = [];

  if (indicesMes && indicesMes.length) {
    const ymInd = latestIndicesYearMonth(indicesMes);
    if (!ymInd) {
      /* sin corte válido: deja tablas vacías */
    } else {
      const { iy, im } = ymInd;
    for (const r of filasParaGraficos) {
      const pid = r.peer_id;
      const sub = indicesMes.filter((x) => x.peer_id === pid && x.year === iy && x.month === im);
      if (!sub.length) {
        continue;
      }
      const row = sub[0]!;
      const metrics: Record<string, number | null> = {};
      for (const { code, label } of INDICES_METRICAS) {
        metrics[label] = (row[code] as number | null) ?? null;
      }
      tabIndTable.push({ empresa: r.empresa_raw, peer_id: pid, metrics });
    }
    for (const metric of INDICES_METRICAS) {
      const traces = filasParaGraficos.map((r, j) => {
        const pid = r.peer_id;
        const hit = indicesMes.filter((x) => x.peer_id === pid && x.year === iy && x.month === im);
        const v = hit.length ? ((hit[0]![metric.code] as number | null) ?? 0) : 0;
        const name = etiquetaBarraCorta(primas, pid);
        return { name, x: [name], y: [v], color: colorLineaPeer(pid, j) };
      });
      tabIndBars.push({ title: metric.label, traces });
    }
    }
  }

  let tabEvoIndices: {
    subplotTitles: string[];
    xLabels: string[];
    tracesByMetric: { metricIndex: number; traces: { name: string; x: string[]; y: number[]; color: string }[] }[];
  } | null = null;

  if (indicesHist && indicesHist.length) {
    const peerIdsComparativa = filasParaGraficos.map((r) => r.peer_id);
    const subH = indicesHist.filter((r) => peerIdsComparativa.includes(r.peer_id));
    const periodos = [...new Set(subH.map((r) => `${r.year}-${String(r.month).padStart(2, '0')}`))].sort();
    const xLabels = periodos;
    const tracesByMetric: {
      metricIndex: number;
      traces: { name: string; x: string[]; y: number[]; color: string }[];
    }[] = [];
    INDICES_METRICAS.forEach((metric, mi) => {
      const traces = peerIdsComparativa.map((pid, j) => {
        const ys = periodos.map((plab) => {
          const [yy, mm] = plab.split('-').map(Number);
          const row = subH.find((s) => s.peer_id === pid && s.year === yy && s.month === mm);
          const v = row ? (row[metric.code] as number | null) : null;
          return v != null && Number.isFinite(v) ? v : 0;
        });
        return {
          name: etiquetaBarraCorta(primas, pid),
          x: xLabels,
          y: ys,
          color: colorLineaPeer(pid, j),
        };
      });
      tracesByMetric.push({ metricIndex: mi, traces });
    });
    tabEvoIndices = { subplotTitles: INDICES_SUBPLOT_TITLES, xLabels, tracesByMetric };
  }

  const peerNeed = [...new Set([...filasParaGraficos.map((r) => r.peer_id), BRAND_PEER_ID])];
  const ind29rows = indicadores29.filter((r) => peerNeed.includes(r.peer_id));
  const orden = new Map(peerNeed.map((p, i) => [p, i]));
  ind29rows.sort((a, b) => (orden.get(a.peer_id) ?? 99) - (orden.get(b.peer_id) ?? 99));

  const fechRef = fech26;
  const ts = ds.resultado?.length ? defaultTsElegido(ds.resultado, primas, fechRef) : fechRef;
  const resultadoSec =
    ds.resultado && ds.resultado.length
      ? buildResultadoSeccion(ds.resultado, primas, fechRef, ts)
      : null;
  const cortes = ds.resultado?.length ? fechasUnicasResultado(ds.resultado, primas).map((d) => ({ value: d, label: labelOpcionCorte(d) })) : [];

  return {
    anioCurso,
    fech26,
    rango,
    nEmpresas: ranked.length,
    totalMercadoUsd,
    tacometers,
    indicesCorte,
    pie: {
      labels: pieLabels,
      values: pieVals,
      colors: pieColors,
      pull: piePull,
      anioCurso,
      fech26,
      participacionDescripcion,
      marcaHighlightIndex: marcaHighlightIndex >= 0 ? marcaHighlightIndex : null,
    },
    primasMensuales: { mesesLabels, series: primasMensualesComparativa },
    tabVol,
    tabIndTable,
    tabIndBars,
    tabEvoIndices,
    indicadores29: ind29rows.map((r) => ({
      empresa: r.NOMBRE_EMPRESA,
      sini: r.PCT_SINIESTRALIDAD_PAGADA,
      comAdq: r.PCT_COMISION_GASTOS_ADQUISICION,
      gastAdm: r.PCT_GASTOS_ADMINISTRACION,
      gastRes: r.GASTOS_COBERTURA_RESERVAS,
      utilPat: r.INDICE_UTILIDAD_PATRIMONIO,
    })),
    dataYear: ds.anuarioReferenceYear,
    periodoPrimas: ds.periodoPrimas,
    resultado: resultadoSec,
    cortesResultado: cortes,
    defaultCorte: ts,
  };
}

export function buildHistoricoPayload(ds: LoadedDataset, corte?: string) {
  const { primas, bcv, resultado } = ds;
  const { ult, peerIds: peerIdsFull } = peersOrdenadosUltimoCorte(primas);
  const { peerIds: defaultChartPeerIds } = conjuntoAnalisis(primas, 5);
  const peerIds = peerIdsFull;
  const fechRef = corte ?? ult;
  const sub = seriePeers(primas, peerIds);
  let subM = acumuladoAPrimasMensuales(sub);
  subM = mergeTipoCambio(subM, bcv) as typeof subM & { ves_por_usd: number | null }[];
  subM = agregarUsdMensual(subM as Parameters<typeof agregarUsdMensual>[0]);

  const ultRow = primas.filter((r) => r.fecha_periodo === ult);
  const marca = ultRow.find((r) => r.peer_id === BRAND_PEER_ID);
  const rankI = marca?.ranking ?? null;
  const partI = marca?.pct_participacion ?? null;
  const top1 = ultRow.find((r) => r.ranking === 1);
  const ytdUsdIntl = ytdMillonesUsdDesdeSerieMensual(primas, bcv, BRAND_PEER_ID, ult);
  const ytdUsdLider = top1 ? ytdMillonesUsdDesdeSerieMensual(primas, bcv, top1.peer_id, ult) : NaN;

  const rankUlt = tablaRankingEnFecha(primas, ult);
  const seenCatalog = new Set<string>();
  const chartCatalog = rankUlt
    .filter((r) => {
      if (seenCatalog.has(r.peer_id)) return false;
      seenCatalog.add(r.peer_id);
      return true;
    })
    .map((r) => ({
      peer_id: r.peer_id,
      name: etiquetaDisplay(primas, r.peer_id),
      ranking: r.ranking,
    }));
  const boletinRows = rankUlt.slice(0, 10).map((r, i) => ({
    pncInicio: primasAcumuladasAlInicioMes(primas, r.peer_id, ult),
    empresa: r.empresa_raw,
    ytd: r.primas_miles_bs,
    pct: r.pct_participacion,
    peer_id: r.peer_id,
    bg: BOLETIN_FILA_BG[i % BOLETIN_FILA_BG.length]!,
  }));
  const sumP0 = boletinRows.reduce((s, r) => s + (r.pncInicio ?? 0), 0);
  const sumYtd = boletinRows.reduce((s, r) => s + r.ytd, 0);
  const sumPct = boletinRows.reduce((s, r) => s + (r.pct ?? 0), 0);
  const nPct = boletinRows.filter((r) => r.pct != null).length;

  const varRows = variacionInteranualDiciembre(primas, peerIds);
  const periodsVar = [...new Set(varRows.map((v) => v.periodo))].sort();
  const varPivot: { peer_id: string; label: string; values: Record<string, number> }[] = [];
  for (const pid of peerIds) {
    const label = etiquetaDisplay(primas, pid);
    const values: Record<string, number> = {};
    for (const p of periodsVar) {
      const hit = varRows.find((v) => v.peer_id === pid && v.periodo === p);
      if (hit) values[p] = Math.round(hit.variacion_pct * 10) / 10;
    }
    if (Object.keys(values).length) varPivot.push({ peer_id: pid, label, values });
  }

  const seriesFlujoUsd = peerIds.map((pid, i) => {
    const rows = subM.filter((r) => r.peer_id === pid).sort((a, b) => a.fecha_periodo.localeCompare(b.fecha_periodo));
    return {
      peer_id: pid,
      name: etiquetaDisplay(primas, pid),
      color: colorLineaPeer(pid, i),
      x: rows.map((r) => r.fecha_periodo),
      y: rows.map((r) => r.primas_mes_millones_usd as number),
    };
  });
  const seriesFlujoBs = peerIds.map((pid, i) => {
    const rows = subM.filter((r) => r.peer_id === pid).sort((a, b) => a.fecha_periodo.localeCompare(b.fecha_periodo));
    return {
      peer_id: pid,
      name: etiquetaDisplay(primas, pid),
      color: colorLineaPeer(pid, i),
      x: rows.map((r) => r.fecha_periodo),
      y: rows.map((r) => r.primas_mes_miles),
    };
  });

  const seriesPart = peerIds.map((pid, i) => {
    const rows = sub.filter((r) => r.peer_id === pid).sort((a, b) => a.fecha_periodo.localeCompare(b.fecha_periodo));
    return {
      peer_id: pid,
      name: etiquetaDisplay(primas, pid),
      color: colorLineaPeer(pid, i),
      x: rows.map((r) => r.fecha_periodo),
      y: rows.map((r) => (r.pct_participacion != null ? r.pct_participacion : null)),
    };
  });

  const ts = resultado?.length ? defaultTsElegido(resultado, primas, fechRef) : fechRef;
  const resultadoSec =
    resultado && resultado.length ? buildResultadoSeccion(resultado, primas, fechRef, ts) : null;
  const cortes = resultado?.length ? fechasUnicasResultado(resultado, primas).map((d) => ({ value: d, label: labelOpcionCorte(d) })) : [];

  let vsLiderPct: number | null = null;
  let leaderLabel = 'el líder';
  if (top1 && Number.isFinite(ytdUsdLider) && ytdUsdLider > 0 && Number.isFinite(ytdUsdIntl)) {
    vsLiderPct = (100 * ytdUsdIntl) / ytdUsdLider;
    leaderLabel = etiquetaDisplay(primas, top1.peer_id);
  }

  return {
    ult,
    generatedAt: new Date().toISOString(),
    datasetMeta: {
      dataDirBase: path.basename(ds.dataDir),
      primasRowCount: primas.length,
      periodoPrimas: ds.periodoPrimas,
      anuarioReferenceYear: ds.anuarioReferenceYear,
    },
    chartCatalog,
    defaultChartPeerIds,
    rankI,
    partI,
    ytdUsdIntl,
    ytdUsdLider,
    vsLiderPct,
    leaderLabel,
    boletinRows,
    boletinTotales: { sumP0, sumYtd, sumPct: nPct ? sumPct : null },
    varPivot,
    periods: periodsVar,
    seriesFlujoUsd,
    seriesFlujoBs,
    seriesPart,
    resultado: resultadoSec,
    cortesResultado: cortes,
    defaultCorte: ts,
  };
}

export function buildResultadoForCorte(
  ds: LoadedDataset,
  fechRef: string,
  tsElegido: string,
  rankingScope: ResultadoRankingScope = 'top5'
) {
  if (!ds.resultado?.length) return null;
  return buildResultadoSeccion(ds.resultado, ds.primas, fechRef, tsElegido, rankingScope);
}
