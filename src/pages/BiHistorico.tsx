import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { fetchApiJson } from '@/lib/apiFetch';
import { cn } from '@/lib/utils';
import { BRAND_DISPLAY_NAME, BRAND_PEER_ID, CHART_HISTORICO_MIN_MES_PREFIJO } from '@/lib/bi/config';
import { LaFeHistoricoLines } from '../components/charts/LaFeHistoricoLines';
import {
  alignHistoricoLineSeriesByDate,
  applyPeerToggle,
  buildHistoricoCsv,
  trimHistoricoLineSeriesDesdeMesMin,
  catalogRowsForChartChips,
  downloadTextFile,
  filterAndOrderSeries,
  MAX_CHART_EMPRESAS,
  MIN_CHART_EMPRESAS,
  normalizeHistoricoPayload,
  pickInitialPeerSelection,
  seriesNullGapSummary,
  type HistApi,
} from '@/src/lib/biHistoricoHelpers';

function fmtFechaGeneracion(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

async function downloadChartPng(ref: RefObject<HTMLDivElement | null>, filename: string) {
  const el = ref.current;
  if (!el) return;
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true, backgroundColor: '#FBF9F9' });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function BiHistorico() {
  const [data, setData] = useState<HistApi | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [useUsd, setUseUsd] = useState(true);
  const [selectedPeersPrimas, setSelectedPeersPrimas] = useState<string[]>([]);
  const [selectedPeersParticipacion, setSelectedPeersParticipacion] = useState<string[]>([]);
  const [syncSelections, setSyncSelections] = useState(false);

  const refChartPrimas = useRef<HTMLDivElement>(null);
  const refChartPart = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchApiJson<unknown>('/api/bi/historico')
      .then((raw) => {
        const normalized = normalizeHistoricoPayload(raw);
        const initial = pickInitialPeerSelection(normalized);
        setData(normalized);
        setSelectedPeersPrimas(initial);
        setSelectedPeersParticipacion([...initial]);
      })
      .catch((e: unknown) => setErr(String(e)));
  }, []);

  const seriesFlujoChart = useMemo(() => {
    if (!data) return [];
    const sel = new Set(selectedPeersPrimas);
    const flowBase = useUsd ? data.seriesFlujoUsd : data.seriesFlujoBs;
    return trimHistoricoLineSeriesDesdeMesMin(
      alignHistoricoLineSeriesByDate(filterAndOrderSeries(flowBase, sel, data.chartCatalog)),
      CHART_HISTORICO_MIN_MES_PREFIJO
    );
  }, [data, selectedPeersPrimas, useUsd]);

  const seriesPartChart = useMemo(() => {
    if (!data) return [];
    const sel = new Set(selectedPeersParticipacion);
    return trimHistoricoLineSeriesDesdeMesMin(
      alignHistoricoLineSeriesByDate(filterAndOrderSeries(data.seriesPart, sel, data.chartCatalog)),
      CHART_HISTORICO_MIN_MES_PREFIJO
    );
  }, [data, selectedPeersParticipacion]);

  const gapsPrimas = useMemo(() => seriesNullGapSummary(seriesFlujoChart), [seriesFlujoChart]);
  const gapsPart = useMemo(() => seriesNullGapSummary(seriesPartChart), [seriesPartChart]);

  /** Solo las ~5 empresas del grupo por defecto (chips), no todo el ranking SUDEASEG. */
  const rowsChipsCatalogo = useMemo(() => (data ? catalogRowsForChartChips(data) : []), [data]);

  /** Variación YoY: solo cierres de diciembre con año final ≥ 2022 (menos columnas). */
  const yoyPeriodCols = useMemo(() => {
    if (!data) return [];
    return data.periods.filter((p) => {
      const m = String(p).match(/(\d{4})\s*(?:->|→|[-–])\s*(\d{4})/);
      if (!m) return true;
      const endY = Number(m[2]);
      return Number.isFinite(endY) && endY >= 2022;
    });
  }, [data]);

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!data) return <BiHistoricoSkeleton />;

  const selectedPrimas = new Set(selectedPeersPrimas);
  const brechaUsd =
    Number.isFinite(data.ytdUsdLider) && Number.isFinite(data.ytdUsdIntl)
      ? data.ytdUsdLider - data.ytdUsdIntl
      : null;

  function togglePeerPrimas(peerId: string) {
    setSelectedPeersPrimas((prev) => {
      const next = applyPeerToggle(prev, peerId);
      if (syncSelections) setSelectedPeersParticipacion(next);
      return next;
    });
  }

  function togglePeerParticipacion(peerId: string) {
    setSelectedPeersParticipacion((prev) => {
      const next = applyPeerToggle(prev, peerId);
      if (syncSelections) setSelectedPeersPrimas(next);
      return next;
    });
  }

  const csvPrimasTitulo = useUsd ? 'Primas netas del mes (millones USD)' : 'Primas netas del mes (miles Bs.)';

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-[#7823BD]">BI Histórico</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          KPIs del último cierre publicado, evolución mensual de <strong>primas netas del mes</strong> y de{' '}
          <strong>participación de mercado</strong>, y variación interanual (diciembre vs diciembre). Los importes en USD
          aplican el <strong>tipo de cambio oficial BCV</strong> de cada mes.
        </p>
        <label className="flex max-w-xl cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={syncSelections}
            onChange={(e) => {
              const on = e.target.checked;
              setSyncSelections(on);
              if (on) setSelectedPeersParticipacion([...selectedPeersPrimas]);
            }}
          />
          <span>
            <strong className="text-[#7823BD]">Misma selección en primas y participación</strong>
            <span className="block text-xs font-normal text-slate-500">
              Al activarla, los chips de participación siguen a los de primas (y viceversa si cambia participación con
              sync activo).
            </span>
          </span>
        </label>
        <p className="text-xs text-slate-500">
          Datos hasta el cierre <strong>{data.ult.slice(0, 10)}</strong> · Vista generada{' '}
          <strong>{fmtFechaGeneracion(data.generatedAt)}</strong>
          {data.datasetMeta ? (
            <>
              {' '}
              · Carpeta de datos <code className="rounded bg-slate-100 px-1">{data.datasetMeta.dataDirBase}</code> · Filas
              CSV primas: <strong>{data.datasetMeta.primasRowCount}</strong>
              {data.datasetMeta.periodoPrimas ? (
                <>
                  {' '}
                  · Serie primas en CSV:{' '}
                  <strong>
                    {data.datasetMeta.periodoPrimas.minFecha.slice(0, 7)} →{' '}
                    {data.datasetMeta.periodoPrimas.maxFecha.slice(0, 7)}
                  </strong>
                </>
              ) : null}
            </>
          ) : null}
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#7823BD]">
          <a href="#historico-primas" className="underline-offset-2 hover:underline">
            Primas del mes
          </a>
          <span className="text-slate-300">·</span>
          <a href="#historico-resumen" className="underline-offset-2 hover:underline">
            Resumen último cierre
          </a>
          <span className="text-slate-300">·</span>
          <a href="#historico-participacion" className="underline-offset-2 hover:underline">
            Participación
          </a>
          <span className="text-slate-300">·</span>
          <a href="#historico-yoy" className="underline-offset-2 hover:underline">
            Variación YoY
          </a>
          <span className="text-slate-300">·</span>
          <a href="#historico-fuentes" className="underline-offset-2 hover:underline">
            Fuentes
          </a>
        </nav>
      </header>

      <section id="historico-primas" className="scroll-mt-4 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#7823BD]">Primas netas del mes (serie histórica)</h3>
          <p className="mt-1 text-xs text-slate-500">
            Por defecto se seleccionan <strong>Seguros La Fe</strong>, <strong>Altamira</strong> y{' '}
            <strong>Previsora</strong> (si constan en los datos). Puede activar otras empresas (hasta{' '}
            {MAX_CHART_EMPRESAS} a la vez). La serie de <strong>Seguros La Fe</strong> lleva sombra bajo la curva en
            millones USD. El eje y el selector inferior solo
            incluyen meses desde <strong>enero de 2023</strong> (no es posible desplazarse a años anteriores). Luego ajuste{' '}
            <strong>USD / Bs.</strong> y, si lo necesita, la metodología más abajo.
          </p>
        </div>

        <div className="rounded-xl border-2 border-[#7823BD]/15 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <p className="text-sm font-bold text-[#7823BD]">Empresas en primas</p>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {selectedPeersPrimas.length} / {MAX_CHART_EMPRESAS} · mín. {MIN_CHART_EMPRESAS}
            </span>
          </div>
          {rowsChipsCatalogo.length === 0 ? (
            <p className="mt-3 text-sm text-amber-900">
              No hay datos de primas disponibles para listar empresas. Intente más tarde o contacte al administrador del
              tablero.
            </p>
          ) : (
            <>
              <p className="mt-2 text-xs text-slate-600">
                Pulse para incluir o quitar entre las {rowsChipsCatalogo.length} empresas del grupo (máximo{' '}
                {MAX_CHART_EMPRESAS} activas). <strong>{BRAND_DISPLAY_NAME}</strong> se resalta en dorado al estar activa.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {rowsChipsCatalogo.map((c) => {
                  const checked = selectedPrimas.has(c.peer_id);
                  const atMax = selectedPeersPrimas.length >= MAX_CHART_EMPRESAS;
                  const onlyOneLeft = checked && selectedPeersPrimas.length <= MIN_CHART_EMPRESAS;
                  const disabled = (!checked && atMax) || onlyOneLeft;
                  const isMarca = c.peer_id === BRAND_PEER_ID;
                  return (
                    <button
                      key={c.peer_id}
                      type="button"
                      disabled={disabled}
                      title={c.name}
                      onClick={() => togglePeerPrimas(c.peer_id)}
                      className={cn(
                        'max-w-[min(100%,14rem)] truncate rounded-full border px-3 py-2 text-left text-xs font-medium transition-all',
                        disabled && 'cursor-not-allowed opacity-45',
                        !disabled && 'cursor-pointer',
                        checked
                          ? isMarca
                            ? 'border-[#FFC857] bg-[#7823BD] text-white shadow-md ring-2 ring-[#FFC857] ring-offset-2'
                            : 'border-[#7823BD] bg-[#7823BD] text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-[#7823BD]/40 hover:bg-white'
                      )}
                    >
                      <span className="font-mono opacity-70">#{c.ranking ?? '—'} </span>
                      {c.name}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="mt-3 text-xs font-semibold text-[#7823BD] underline-offset-2 hover:underline"
                onClick={() => {
                  const initial = pickInitialPeerSelection(data);
                  setSelectedPeersPrimas(initial);
                  if (syncSelections) setSelectedPeersParticipacion(initial);
                }}
              >
                Restaurar las 5 predeterminadas
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm">
          <span className="font-medium text-slate-700">Unidad del flujo mensual:</span>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" name="u" checked={useUsd} onChange={() => setUseUsd(true)} />
            Millones USD
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" name="u" checked={!useUsd} onChange={() => setUseUsd(false)} />
            Miles Bs. nominales
          </label>
          <span className="text-xs text-slate-500">(sombra bajo la curva solo en USD para Seguros La Fe)</span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#7823BD] shadow-sm hover:bg-slate-50"
            onClick={() => {
              const csv = buildHistoricoCsv(seriesFlujoChart, csvPrimasTitulo);
              if (!csv) return;
              downloadTextFile(`historico-primas-${useUsd ? 'usd' : 'bs'}.csv`, csv, 'text/csv;charset=utf-8');
            }}
          >
            Exportar CSV (serie visible)
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#7823BD] shadow-sm hover:bg-slate-50"
            onClick={() => void downloadChartPng(refChartPrimas, `historico-primas-${useUsd ? 'usd' : 'bs'}.png`)}
          >
            Exportar PNG
          </button>
        </div>

        {gapsPrimas.length > 0 ? (
          <div
            className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-950"
            role="status"
          >
            <strong>Huecos en la serie:</strong>{' '}
            {gapsPrimas.map((g) => `${g.name} (${g.nullCount} meses sin dato)`).join(' · ')}.
          </div>
        ) : null}

        <LaFeHistoricoLines
          ref={refChartPrimas}
          series={seriesFlujoChart.map((s) => ({
            ...s,
            y: s.y.map((v) => v) as (number | null)[],
          }))}
          title={
            useUsd
              ? '<b>Primas netas del mes — millones USD</b><br><sup>Tipo oficial de cada mes · SUDEASEG</sup>'
              : '<b>Primas netas del mes — miles Bs. nominales</b><br><sup>Diferencia de acumulados</sup>'
          }
          yAxisLabel={
            useUsd ? 'Millones USD (nominal, al tipo del mes)' : 'Miles de Bs. (flujo mensual nominal)'
          }
          areaPeerId={useUsd ? BRAND_PEER_ID : undefined}
          formatValue={(v) =>
            useUsd
              ? `${v.toLocaleString('es-ES', { maximumFractionDigits: 3 })} M USD`
              : `${v.toLocaleString('es-ES', { maximumFractionDigits: 0 })} miles Bs.`
          }
          tooltipFooter={
            useUsd
              ? 'Tipo BCV del mes: cada punto usa el tipo oficial de ese mes; no es un único tipo aplicado a toda la serie.'
              : undefined
          }
          className="min-h-[480px]"
        />

        <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <summary className="cursor-pointer font-medium text-[#7823BD]">Metodología (flujo mensual y USD)</summary>
          <p className="mt-2 text-slate-600">
            <strong>Flujo mensual:</strong> acumulado del mes menos acumulado del mes anterior (por año).{' '}
            <strong>USD:</strong> cada mes al tipo BCV oficial de ese mes.
          </p>
        </details>

        <p className="text-xs text-slate-500">
          La <strong>participación de mercado</strong> tiene su propio selector (1–5 empresas) más abajo; puede
          sincronizarlo con el cuadro superior usando la casilla del encabezado.
        </p>
      </section>

      <details id="historico-resumen" className="scroll-mt-4 group space-y-4 rounded-xl border border-slate-200 bg-white/60 p-3 sm:p-4">
        <summary className="cursor-pointer list-none text-base font-bold text-[#7823BD] [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            Último cierre (resumen)
            <span className="text-xs font-normal text-slate-500 group-open:hidden sm:inline">Pulsa para expandir</span>
            <span className="hidden text-xs font-normal text-slate-500 group-open:inline sm:inline">Pulsa para plegar</span>
          </span>
        </summary>
        <div className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Último cierre (SUDEASEG)" value={data.ult.slice(0, 10)} />
            <Metric label="Ranking La Fe" value={data.rankI != null ? `#${data.rankI}` : '—'} />
            <Metric
              label="Acum. año La Fe (M USD)"
              value={
                Number.isFinite(data.ytdUsdIntl) ? data.ytdUsdIntl.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : '—'
              }
            />
            <Metric
              label={`Acum. año ${(data.leaderLabel ?? 'líder').slice(0, 28)}${(data.leaderLabel ?? '').length > 28 ? '…' : ''} (M USD)`}
              value={
                Number.isFinite(data.ytdUsdLider) ? data.ytdUsdLider.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : '—'
              }
            />
            <Metric
              label="Participación La Fe"
              value={data.partI != null ? `${data.partI.toFixed(2).replace('.', ',')} %` : '—'}
            />
            <Metric
              label="Brecha acum. vs líder (M USD)"
              value={
                brechaUsd != null && Number.isFinite(brechaUsd)
                  ? brechaUsd.toLocaleString('es-ES', { maximumFractionDigits: 2 })
                  : '—'
              }
              hint="Líder acumulado menos Seguros La Fe (mismo cierre y metodología YTD)."
            />
          </div>

          <p className="text-xs text-slate-500">
            USD: flujo mensual al tipo oficial de cada mes · Cierre SUDEASEG <strong>{data.ult.slice(0, 7)}</strong>.
          </p>

          {data.vsLiderPct != null && (
            <div className="border-l-4 border-[#FFCB05] bg-white/80 py-2 pl-4 text-sm text-slate-600">
              vs <strong>{data.leaderLabel ?? 'el líder'}</strong> (#1): acumulado en USD de Seguros La Fe ={' '}
              <strong>{data.vsLiderPct.toFixed(1)}%</strong> del líder.
            </div>
          )}
        </div>
      </details>

      <section id="historico-participacion" className="scroll-mt-4 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#7823BD]">Participación de mercado</h3>
          <p className="mt-1 text-xs text-slate-500">
            Selección <strong>independiente</strong> del gráfico de primas (entre 1 y {MAX_CHART_EMPRESAS} empresas), salvo
            que active la sincronización arriba. <strong>Seguros La Fe</strong> lleva área sombreada bajo la curva. Mismo
            corte temporal: solo meses desde <strong>enero de 2023</strong>.
          </p>
        </div>

        <div className="rounded-xl border-2 border-[#7823BD]/15 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <p className="text-sm font-bold text-[#7823BD]">Empresas en participación</p>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {selectedPeersParticipacion.length} / {MAX_CHART_EMPRESAS} · mín. {MIN_CHART_EMPRESAS}
            </span>
          </div>
          {rowsChipsCatalogo.length === 0 ? (
            <p className="mt-3 text-sm text-amber-900">
              No hay empresas disponibles para participación. Compruebe los CSV de primas en el servidor.
            </p>
          ) : (
            <>
              <p className="mt-2 text-xs text-slate-600">
                Pulse para incluir o quitar entre las mismas {rowsChipsCatalogo.length} empresas del grupo. Los porcentajes
                son los del cuadro SUDEASEG (no dependen de USD/Bs.).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {rowsChipsCatalogo.map((c) => {
                  const checked = selectedPeersParticipacion.includes(c.peer_id);
                  const atMax = selectedPeersParticipacion.length >= MAX_CHART_EMPRESAS;
                  const onlyOneLeft = checked && selectedPeersParticipacion.length <= MIN_CHART_EMPRESAS;
                  const disabled = (!checked && atMax) || onlyOneLeft;
                  const isMarca = c.peer_id === BRAND_PEER_ID;
                  return (
                    <button
                      key={`part-${c.peer_id}`}
                      type="button"
                      disabled={disabled}
                      title={c.name}
                      onClick={() => togglePeerParticipacion(c.peer_id)}
                      className={cn(
                        'max-w-[min(100%,14rem)] truncate rounded-full border px-3 py-2 text-left text-xs font-medium transition-all',
                        disabled && 'cursor-not-allowed opacity-45',
                        !disabled && 'cursor-pointer',
                        checked
                          ? isMarca
                            ? 'border-[#FFC857] bg-[#7823BD] text-white shadow-md ring-2 ring-[#FFC857] ring-offset-2'
                            : 'border-[#7823BD] bg-[#7823BD] text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-[#7823BD]/40 hover:bg-white'
                      )}
                    >
                      <span className="font-mono opacity-70">#{c.ranking ?? '—'} </span>
                      {c.name}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="mt-3 text-xs font-semibold text-[#7823BD] underline-offset-2 hover:underline"
                onClick={() => {
                  const initial = pickInitialPeerSelection(data);
                  setSelectedPeersParticipacion(initial);
                  if (syncSelections) setSelectedPeersPrimas(initial);
                }}
              >
                Restaurar las 5 predeterminadas
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#7823BD] shadow-sm hover:bg-slate-50"
            onClick={() => {
              const csv = buildHistoricoCsv(seriesPartChart, 'Participación de mercado (%)');
              if (!csv) return;
              downloadTextFile('historico-participacion.csv', csv, 'text/csv;charset=utf-8');
            }}
          >
            Exportar CSV (serie visible)
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#7823BD] shadow-sm hover:bg-slate-50"
            onClick={() => void downloadChartPng(refChartPart, 'historico-participacion.png')}
          >
            Exportar PNG
          </button>
        </div>

        {gapsPart.length > 0 ? (
          <div
            className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-950"
            role="status"
          >
            <strong>Huecos en la serie:</strong>{' '}
            {gapsPart.map((g) => `${g.name} (${g.nullCount} meses sin dato)`).join(' · ')}.
          </div>
        ) : null}

        <LaFeHistoricoLines
          ref={refChartPart}
          series={seriesPartChart}
          title="<b>Participación de mercado</b><br><sup>% sobre el universo del cuadro (SUDEASEG)</sup>"
          yAxisLabel="% participación"
          areaPeerId={BRAND_PEER_ID}
          formatValue={(v) => `${v.toFixed(2).replace('.', ',')} %`}
          className="min-h-[420px]"
        />
      </section>

      <section id="historico-yoy" className="scroll-mt-4 space-y-3">
        <h3 className="text-base font-bold text-[#7823BD]">Variación interanual (diciembre vs diciembre)</h3>
        {data.varPivot.length === 0 ? (
          <p className="text-sm text-slate-500">No hay pares completos de cierres de diciembre para calcular variación YoY.</p>
        ) : (
          <div className="bi-table-scroll rounded-xl border border-slate-200">
            <table className="w-max min-w-[480px] max-w-none text-left text-sm">
              <caption className="caption-bottom px-2 pb-2 pt-3 text-left text-xs text-slate-500">
                Variación porcentual entre cierres de diciembre consecutivos · primas en miles de Bs. nominales · solo
                períodos con cierre en diciembre de <strong>2022</strong> o posterior. Fuente: SUDEASEG.
              </caption>
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-2 py-2">Empresa</th>
                  {yoyPeriodCols.map((p) => (
                    <th key={p} className="px-2 py-2">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.varPivot.map((row) => {
                  const intl = row.peer_id === BRAND_PEER_ID;
                  return (
                    <tr
                      key={row.peer_id}
                      className={
                        intl
                          ? 'bg-[#FFC857]/15 ring-1 ring-inset ring-[#7823BD]/20'
                          : 'odd:bg-white even:bg-slate-50'
                      }
                    >
                      <td className="px-2 py-1.5 font-medium">{row.label}</td>
                      {yoyPeriodCols.map((p) => (
                        <td key={p} className="px-2 py-1.5 font-mono tabular-nums">
                          {row.values[p] != null && Number.isFinite(row.values[p])
                            ? `${Number(row.values[p]).toFixed(1).replace('.', ',')} %`
                            : '—'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <details id="historico-fuentes" className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium text-[#7823BD]">Fuentes y metadatos</summary>
        <div className="mt-3 space-y-2 text-slate-600">
          <p>
            <strong>SUDEASEG:</strong> estadísticas públicas del sector (primas netas por empresa y series publicadas).
          </p>
          <p>
            <strong>BCV:</strong> tipo de cambio oficial mensual para conversión a USD cuando el gráfico está en dólares.
          </p>
          <p className="text-xs text-slate-500">
            Último cierre en esta vista: <strong>{data.ult.slice(0, 7)}</strong>
            {data.generatedAt ? (
              <>
                {' '}
                · actualizado <strong>{fmtFechaGeneracion(data.generatedAt)}</strong>
              </>
            ) : null}
            .
          </p>
        </div>
      </details>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#7823BD]">{value}</p>
      {hint && <p className="mt-1 text-[10px] leading-snug text-slate-400">{hint}</p>}
    </div>
  );
}

function BiHistoricoSkeleton() {
  return (
    <div
      className="space-y-8 animate-pulse rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-sm"
      aria-busy="true"
      aria-label="Cargando BI Histórico"
    >
      <p className="text-sm font-medium text-slate-500">Cargando BI Histórico…</p>
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-slate-300/80" />
        <div className="h-12 w-full max-w-3xl rounded bg-slate-200/90" />
        <div className="h-4 w-64 rounded bg-slate-200/80" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-slate-200 bg-slate-200/50" />
        ))}
      </div>
      <div className="h-40 rounded-xl border border-slate-200 bg-slate-200/50" />
      <div className="h-[min(480px,55vh)] min-h-[320px] rounded-2xl border border-slate-200 bg-slate-200/40" />
      <div className="h-[min(420px,50vh)] min-h-[280px] rounded-2xl border border-slate-200 bg-slate-200/40" />
    </div>
  );
}
