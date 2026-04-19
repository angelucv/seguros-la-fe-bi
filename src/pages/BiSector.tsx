import { useEffect, useMemo, useState } from 'react';
import { fetchApiJson } from '@/lib/apiFetch';
import { BRAND_DISPLAY_NAME, SECTOR_COMPARATIVA_MAX_EMPRESAS } from '../../lib/bi/config';
import type { Data, Layout } from 'plotly.js';
import { PlotlyFigure } from '../components/charts/PlotlyFigure';
import { CredixDonut } from '../components/charts/CredixDonut';
import { CredixPrimasBars } from '../components/charts/CredixPrimasBars';
import type { ResultadoPayload } from '../components/bi/ResultadoTecnicoSection';

type SectorApi = {
  error?: string;
  anioCurso: number;
  fech26: string;
  periodoPrimas: { minFecha: string; maxFecha: string };
  rango: number | null;
  nEmpresas: number;
  totalMercadoUsd: number;
  tacometers: {
    title: string;
    valueEmpresa: number;
    sectorAvg: number | null;
    max: number;
    needleColor: string;
  }[];
  indicesCorte: { iy: number; im: number; mesNombre: string; archivo?: string } | null;
  pie: {
    labels: string[];
    values: number[];
    colors: string[];
    pull: number[];
    anioCurso: number;
    fech26: string;
    participacionDescripcion?: string;
    marcaHighlightIndex: number | null;
  };
  primasMensuales: {
    mesesLabels: string[];
    series: { peer_id: string; name: string; color: string; y: number[] }[];
  };
  tabVol: { ranking: number | null; empresa: string; usd: number; pct: number | null; milesBs: number }[];
  tabIndTable: { empresa: string; peer_id: string; metrics: Record<string, number | null> }[];
  tabIndBars: { title: string; traces: { name: string; x: string[]; y: number[]; color: string }[] }[];
  tabEvoIndices: {
    subplotTitles: string[];
    xLabels: string[];
    tracesByMetric: {
      metricIndex: number;
      traces: { name: string; x: string[]; y: number[]; color: string }[];
    }[];
  } | null;
  indicadores29: {
    empresa: string;
    sini: number | null;
    comAdq: number | null;
    gastAdm: number | null;
    gastRes: number | null;
    utilPat: number | null;
  }[];
  dataYear: number;
  resultado: ResultadoPayload | null;
  cortesResultado: { value: string; label: string }[];
  defaultCorte: string;
};

export function BiSector({ onOpenFunerario }: { onOpenFunerario?: () => void } = {}) {
  const [data, setData] = useState<SectorApi | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<'vol' | 'ind' | 'evo'>('vol');

  useEffect(() => {
    fetchApiJson<SectorApi>('/api/bi/sector')
      .then((j) => {
        if (j.error) setErr(j.error);
        else setData(j);
      })
      .catch((e: unknown) => setErr(String(e)));
  }, []);

  const donutSlices = useMemo(() => {
    if (!data) return [];
    const hi = data.pie.marcaHighlightIndex;
    return data.pie.labels.map((name, i) => ({
      name,
      value: data.pie.values[i]!,
      color: data.pie.colors[i]!,
      highlight: hi != null ? i === hi : /\bla fe\b/i.test(name) || name.includes(BRAND_DISPLAY_NAME),
    }));
  }, [data]);

  if (err) {
    return <p className="text-sm text-red-600">{err}</p>;
  }
  if (!data) {
    return <BiSectorLoadingSkeleton />;
  }

  const hasPrimasChart =
    data.primasMensuales.mesesLabels.length > 0 && data.primasMensuales.series.length > 0;

  return (
    <div className="space-y-8">
      <div
        id="bi-sectorial-intro"
        className="rounded-2xl border border-[#7823BD]/10 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2 className="text-base font-bold text-[#7823BD] sm:text-lg">BI Sectorial</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Mercado asegurador y <strong>{BRAND_DISPLAY_NAME}</strong>: indicadores y tacómetros, participación en USD, primas
          mensuales y comparativa con un conjunto de empresas de <strong>volumen parecido</strong>, además de tablas de detalle.
          Use el menú rápido para desplazarse; el ramo funerario está en <strong>BI Funerario</strong> en el menú principal
          {onOpenFunerario ? (
            <>
              {' '}
              (<button
                type="button"
                onClick={onOpenFunerario}
                className="font-semibold text-[#7823BD] underline decoration-[#7823BD]/40 underline-offset-2 hover:decoration-[#7823BD]"
              >
                abrir aquí
              </button>
              ).
            </>
          ) : (
            '.'
          )}
        </p>
        <SectorDataMeta data={data} />
        <SectorQuickNav onOpenFunerario={onOpenFunerario} />
      </div>

      <section id="bi-sectorial-tacometros" className="scroll-mt-28">
        <h2 className="text-lg font-bold text-[#7823BD]">
          Indicadores — {BRAND_DISPLAY_NAME} frente al sector
        </h2>
        <TacometrosCorteBanner indicesCorte={data.indicesCorte} />
        {data.tacometers.length === 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            <p className="font-semibold text-amber-900">No hay tacómetros disponibles</p>
            <p className="mt-1 text-amber-900/90">
              No hay índices disponibles para este corte. Verifique la actualización de los datos del tablero.
            </p>
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {data.tacometers.map((t) => (
            <GaugeCard key={t.title} t={t} corteLine={formatIndicesCorteLine(data.indicesCorte)} />
          ))}
        </div>
        {data.tacometers.length > 0 && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-slate-600 shadow-sm sm:text-sm">
            <strong className="text-[#7823BD]">Leyenda tacómetros:</strong> el arco refleja el rango del indicador; la barra de
            color es el valor de <strong>{BRAND_DISPLAY_NAME}</strong>; la marca de referencia en el arco es el{' '}
            <strong>promedio del sector</strong> (mismo corte mensual que el recuadro «Corte de información» arriba). El
            porcentaje grande en el centro corresponde a {BRAND_DISPLAY_NAME}.
          </div>
        )}
      </section>

      <section id="bi-sectorial-participacion" className="scroll-mt-28">
        <h2 className="text-lg font-bold text-[#7823BD]">
          Participación en el mercado · {data.anioCurso} · millones USD
        </h2>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-600">
          El gráfico destaca las mayores participaciones; <strong>{BRAND_DISPLAY_NAME}</strong> aparece como rebanada propia
          cuando no está entre los líderes; el resto se agrupa en «Resto del mercado».
        </p>
        {donutSlices.length === 0 ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-950">
            <p className="font-semibold text-amber-900">Sin datos para el gráfico de participación</p>
            <p className="mt-2 text-amber-900/90">
              No hay valores de participación para este corte.
            </p>
          </div>
        ) : (
          <CredixDonut
            slices={donutSlices}
            title={`<b>Participación de mercado · ${data.anioCurso}</b> · millones USD`}
            subtitle={`Datos al cierre ${data.pie.fech26.slice(0, 7)}${
              data.pie.participacionDescripcion
                ? `<br/><span class="text-slate-600 font-normal text-[11px] leading-relaxed">${data.pie.participacionDescripcion}</span>`
                : ''
            }`}
            className="min-h-[400px]"
          />
        )}
      </section>

      <section id="bi-sectorial-primas" className="scroll-mt-28">
        <h2 className="text-lg font-bold text-[#7823BD]">
          Primas mensuales · {data.anioCurso} · millones USD (banda de comparativa)
        </h2>
        {!hasPrimasChart ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-950">
            <p className="font-semibold text-amber-900">Sin serie mensual de primas</p>
            <p className="mt-2 text-amber-900/90">No hay serie mensual de primas disponible para graficar.</p>
          </div>
        ) : (
          <CredixPrimasBars
            mesesLabels={data.primasMensuales.mesesLabels}
            series={data.primasMensuales.series}
            title={`<b>Primas mensuales · ${data.anioCurso}</b> · millones USD`}
            subtitle={`Barras por mes · hasta ${SECTOR_COMPARATIVA_MAX_EMPRESAS} empresas en comparativa (incluye a ${BRAND_DISPLAY_NAME})`}
            className="min-h-[420px]"
          />
        )}
      </section>

      <section id="bi-sectorial-ranking" className="scroll-mt-28">
        {data.rango != null ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <strong>{BRAND_DISPLAY_NAME}</strong> — posición <strong>#{data.rango}</strong> en el ranking acumulado a{' '}
            {data.fech26.slice(0, 7)} ({data.nEmpresas} empresas en el cuadro).
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <strong className="text-[#7823BD]">Posición en el ranking</strong> — no hay dato de posición en el acumulado
            para el corte actual, o {BRAND_DISPLAY_NAME} no figura en el cuadro de primas utilizado para el ranking.
          </div>
        )}
      </section>

      <div id="bi-sectorial-detalle" className="scroll-mt-28 space-y-4">
        <p className="text-sm leading-relaxed text-slate-600">
          Detalle: <strong>volumen y participación</strong>, <strong>indicadores en cifras</strong> o{' '}
          <strong>evolución mensual</strong> (misma banda de comparativa).
        </p>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {(
          [
            ['vol', 'Volumen y participación'],
            ['ind', 'Indicadores — Boletín en cifras'],
            ['evo', 'Evolución mensual'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === id ? 'bg-[#7823BD] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'vol' && <TabVol rows={data.tabVol} fech26={data.fech26} />}
      {tab === 'ind' && (
        <TabInd
          tabIndTable={data.tabIndTable}
          tabIndBars={data.tabIndBars}
          dataYear={data.dataYear}
          indicadores29={data.indicadores29}
          anioCurso={data.anioCurso}
        />
      )}
      {tab === 'evo' && (
        <TabEvo
          mesesLabels={data.primasMensuales.mesesLabels}
          series={data.primasMensuales.series}
          tabEvoIndices={data.tabEvoIndices}
          anioCurso={data.anioCurso}
        />
      )}
      </div>
    </div>
  );
}

function mesAnioSector(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const s = d.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatIndicesCorteLine(idx: SectorApi['indicesCorte']): string | null {
  if (!idx) return null;
  return `Índices · ${idx.mesNombre} ${idx.iy}`;
}

function TacometrosCorteBanner({ indicesCorte }: { indicesCorte: SectorApi['indicesCorte'] }) {
  if (!indicesCorte) {
    return (
      <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
        <strong className="text-amber-900">Índices:</strong> no hay mes de referencia disponible para estos indicadores.
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-2xl border-2 border-[#7823BD]/35 bg-gradient-to-br from-white via-[#F0F4FB] to-[#7823BD]/10 px-4 py-5 text-center shadow-md sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Corte de los índices (tacómetros)</p>
      <p className="mt-2 text-3xl font-bold leading-tight text-[#7823BD] sm:text-4xl">
        {indicesCorte.mesNombre} {indicesCorte.iy}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        Valores de <strong>{BRAND_DISPLAY_NAME}</strong> y promedio del sector corresponden a <strong>ese mes</strong> (no al
        acumulado de primas).
      </p>
    </div>
  );
}

function BiSectorLoadingSkeleton() {
  return (
    <div
      className="animate-pulse space-y-6"
      role="status"
      aria-busy="true"
      aria-label="Cargando BI Sectorial"
    >
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="h-6 w-2/3 max-w-md rounded bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-10 w-full rounded-lg bg-slate-100" />
      </div>
      <div className="h-56 rounded-xl bg-slate-200/70 sm:h-64" />
      <div className="h-48 rounded-xl bg-slate-200/60" />
      <div className="h-40 rounded-xl bg-slate-200/50" />
      <p className="text-center text-sm text-slate-500">Cargando datos del sector…</p>
    </div>
  );
}

function SectorDataMeta({ data }: { data: SectorApi }) {
  const fechaPrimas = data.fech26.length >= 10 ? data.fech26.slice(0, 10) : data.fech26;
  const hasta = data.periodoPrimas?.maxFecha?.slice(0, 10);
  const mismoMesCierre =
    hasta && fechaPrimas.length >= 7 && hasta.length >= 7 && fechaPrimas.slice(0, 7) === hasta.slice(0, 7);
  const etiquetaCierre = mesAnioSector(fechaPrimas);
  return (
    <div className="mt-4 max-w-2xl rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-4 text-center shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cierre de primas (acumulado)</p>
      <p className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">{etiquetaCierre}</p>
      {hasta && !mismoMesCierre ? (
        <p className="mt-2 text-xs text-slate-600">
          Serie disponible hasta <strong>{mesAnioSector(hasta)}</strong> · universo <strong>{data.nEmpresas}</strong> empresas ·
          año <strong>{data.anioCurso}</strong>
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-600">
          Universo <strong>{data.nEmpresas}</strong> empresas · año en curso <strong>{data.anioCurso}</strong>
        </p>
      )}
      <p className="mt-2 text-[11px] text-slate-500">
        El <strong className="text-[#7823BD]">mes de los índices</strong> (tacómetros) aparece en grande en la siguiente
        sección.
      </p>
    </div>
  );
}

function scrollToSectorSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function SectorQuickNav({ onOpenFunerario }: { onOpenFunerario?: () => void }) {
  const items: { id: string; label: string }[] = [
    { id: 'bi-sectorial-tacometros', label: 'Tacómetros' },
    { id: 'bi-sectorial-participacion', label: 'Participación' },
    { id: 'bi-sectorial-primas', label: 'Primas mensuales' },
    { id: 'bi-sectorial-ranking', label: 'Posición en el mercado' },
    { id: 'bi-sectorial-detalle', label: 'Tablas y evolución' },
  ];

  return (
    <nav className="mt-5 border-t border-slate-100 pt-4" aria-label="Navegación rápida BI Sectorial">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Menú rápido</p>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollToSectorSection(item.id)}
            className="rounded-full border border-[#7823BD]/20 bg-[#F0F4FB] px-3 py-1.5 text-left text-xs font-semibold text-[#7823BD] transition hover:border-[#7823BD]/40 hover:bg-white sm:text-center sm:text-sm"
          >
            {item.label}
          </button>
        ))}
        {onOpenFunerario ? (
          <button
            type="button"
            onClick={onOpenFunerario}
            className="rounded-full border border-dashed border-[#7823BD]/45 bg-white px-3 py-1.5 text-left text-xs font-semibold text-[#7823BD] transition hover:border-[#7823BD]/60 hover:bg-[#F0F4FB] sm:text-center sm:text-sm"
          >
            BI Funerario (otra pestaña)
          </button>
        ) : null}
      </div>
    </nav>
  );
}

function GaugeCard({ t, corteLine }: { t: SectorApi['tacometers'][0]; corteLine: string | null }) {
  const { gauge, layout } = useMemo(() => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sub = corteLine
      ? `<br><span style="font-size:11px;font-weight:600;color:#495057">${esc(corteLine)}</span>`
      : '';
    const titleLines = esc(t.title).replace(' ', '<br>');
    const g: Data = {
      type: 'indicator',
      mode: 'gauge+number',
      value: t.valueEmpresa,
      number: { suffix: ' %', font: { size: 26, color: '#7823BD' } },
      title: {
        text: `<b style="font-size:17px;font-weight:700">${titleLines}</b>${sub}`,
        font: { size: 17, color: '#7823BD', family: 'Segoe UI, system-ui, sans-serif' },
      },
      gauge: {
        axis: { range: [0, t.max], tickwidth: 2, tickcolor: '#7823BD' },
        bar: { color: t.needleColor, thickness: 0.82 },
        bgcolor: 'rgba(255,255,255,0.6)',
        borderwidth: 2,
        bordercolor: 'rgba(39,48,110,0.22)',
        steps: [{ range: [0, t.max], color: 'rgba(218, 226, 239, 0.55)' }],
        ...(t.sectorAvg != null && t.sectorAvg >= 0 && t.sectorAvg <= t.max
          ? {
              threshold: {
                line: { color: '#0f2e5f', width: 5 },
                thickness: 1,
                value: t.sectorAvg,
              },
            }
          : {}),
      },
      domain: { x: [0.06, 0.94], y: [0.08, 0.92] },
    };
    const lay: Partial<Layout> = {
      height: 380,
      margin: { t: 76, b: 90, l: 8, r: 8 },
      paper_bgcolor: '#F0F4FB',
      annotations:
        t.sectorAvg != null
          ? [
              {
                x: 0.5,
                y: -0.08,
                xref: 'paper',
                yref: 'paper',
                showarrow: false,
                text: `<b style="color:#087F5B">Promedio sector</b> ${t.sectorAvg.toFixed(1)} %<br><b style="color:#7823BD">${BRAND_DISPLAY_NAME}</b> ${t.valueEmpresa.toFixed(1)} %`,
                font: { size: 12, color: '#343A40' },
              },
            ]
          : [],
    };
    return { gauge: g, layout: lay };
  }, [t.title, t.valueEmpresa, t.sectorAvg, t.max, t.needleColor, BRAND_DISPLAY_NAME, corteLine]);

  return <PlotlyFigure data={[gauge]} layout={layout} config={{ displayModeBar: false }} />;
}

function TabVol({ rows, fech26 }: { rows: SectorApi['tabVol']; fech26: string }) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        No hay filas de <strong>volumen y participación</strong> para el corte seleccionado. Compruebe los CSV de primas y
        ranking en datos públicos.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-[#7823BD]">Detalle volumen — {fech26.slice(0, 7)} · USD</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-800">
            <tr>
              <th className="px-3 py-2">Ranking</th>
              <th className="px-3 py-2">Empresa</th>
              <th className="px-3 py-2">Acum. año (M USD)</th>
              <th className="px-3 py-2">% part.</th>
              <th className="px-3 py-2">Acum. año (miles Bs.)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="odd:bg-slate-50">
                <td className="px-3 py-1.5">{r.ranking ?? '—'}</td>
                <td className="px-3 py-1.5">{r.empresa}</td>
                <td className="px-3 py-1.5 font-mono">{Number.isFinite(r.usd) ? r.usd.toLocaleString('es-VE', { maximumFractionDigits: 2 }) : '—'}</td>
                <td className="px-3 py-1.5 font-mono">{r.pct != null ? r.pct.toFixed(2).replace('.', ',') : '—'}</td>
                <td className="px-3 py-1.5 font-mono">{r.milesBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabInd({
  tabIndTable,
  tabIndBars,
  dataYear,
  indicadores29,
  anioCurso,
}: {
  tabIndTable: SectorApi['tabIndTable'];
  tabIndBars: SectorApi['tabIndBars'];
  dataYear: number;
  indicadores29: SectorApi['indicadores29'];
  anioCurso: number;
}) {
  const metricLabels = tabIndTable[0] ? Object.keys(tabIndTable[0].metrics) : [];
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-[#7823BD]">Índices por empresa (Boletín en cifras)</h3>
        {tabIndTable.length === 0 ? (
          <p className="mt-2 text-sm text-amber-800">No hay filas de índices para la banda de comparativa en el corte actual.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-2 py-2">Empresa</th>
                  {metricLabels.map((m) => (
                    <th key={m} className="px-2 py-2">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabIndTable.map((row) => (
                  <tr key={row.peer_id} className="odd:bg-white even:bg-slate-50">
                    <td className="px-2 py-1.5 font-medium">{row.empresa}</td>
                    {metricLabels.map((lab) => (
                      <td key={lab} className="px-2 py-1.5 font-mono">
                        {row.metrics[lab] != null ? row.metrics[lab]!.toFixed(2).replace('.', ',') : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {tabIndBars.map((b) => {
          const traces: Data[] = b.traces.map((tr) => ({
            type: 'bar',
            name: tr.name,
            x: tr.x,
            y: tr.y,
            marker: { color: tr.color, line: { color: '#fff', width: 1 } },
            hovertemplate: '%{x}<br>%{y:,.4f}<extra></extra>',
          }));
          const layout: Partial<Layout> = {
            height: 300,
            title: { text: `<b>${b.title}</b>`, x: 0.5, xanchor: 'center', font: { size: 12 } },
            yaxis: { title: { text: '' } },
            showlegend: false,
            margin: { t: 52, b: 72, l: 44, r: 20 },
          };
          return <PlotlyFigure key={b.title} data={traces} layout={layout} />;
        })}
      </div>

      <div>
        <h3 className="font-semibold text-[#7823BD]">Indicadores financieros (referencia {dataYear})</h3>
        <p className="text-xs text-slate-500">Cifras anuales; el periodo puede no coincidir con series mensuales.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-2 py-2">Empresa</th>
                <th className="px-2 py-2">Siniestralidad pagada %</th>
                <th className="px-2 py-2">Comisión y gastos adq. %</th>
                <th className="px-2 py-2">Gastos adm. %</th>
                <th className="px-2 py-2">Gastos cobertura reservas</th>
                <th className="px-2 py-2">Índice utilidad / patrimonio</th>
              </tr>
            </thead>
            <tbody>
              {indicadores29.map((r) => (
                <tr key={r.empresa} className="odd:bg-white even:bg-slate-50">
                  <td className="px-2 py-1.5">{r.empresa}</td>
                  <td className="px-2 py-1.5 font-mono">{r.sini?.toFixed(2).replace('.', ',') ?? '—'}</td>
                  <td className="px-2 py-1.5 font-mono">{r.comAdq?.toFixed(2).replace('.', ',') ?? '—'}</td>
                  <td className="px-2 py-1.5 font-mono">{r.gastAdm?.toFixed(2).replace('.', ',') ?? '—'}</td>
                  <td className="px-2 py-1.5 font-mono">{r.gastRes?.toFixed(2).replace('.', ',') ?? '—'}</td>
                  <td className="px-2 py-1.5 font-mono">{r.utilPat?.toFixed(2).replace('.', ',') ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Primas (pestaña «Volumen»): acumulado {anioCurso} en USD (metodología SUDEASEG + tipo de cambio mensual).
        </p>
      </div>
    </div>
  );
}

function TabEvo({
  mesesLabels,
  series,
  tabEvoIndices,
  anioCurso,
}: {
  mesesLabels: string[];
  series: SectorApi['primasMensuales']['series'];
  tabEvoIndices: SectorApi['tabEvoIndices'];
  anioCurso: number;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-[#7823BD]">Evolución mes a mes — primas (misma banda de comparativa)</h3>
        <CredixPrimasBars
          mesesLabels={mesesLabels}
          series={series}
          title={`<b>Primas mensuales · ${anioCurso}</b> · millones USD`}
          subtitle="Misma serie que arriba; vista compacta en pestaña Evolución"
          className="min-h-[400px]"
        />
      </div>
      <div>
        <h3 className="font-semibold text-[#7823BD]">Evolución mes a mes — índices (misma banda)</h3>
        {!tabEvoIndices || tabEvoIndices.tracesByMetric.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No hay serie histórica de índices para graficar.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tabEvoIndices.tracesByMetric.map((block) => {
              const title = tabEvoIndices.subplotTitles[block.metricIndex] ?? `M${block.metricIndex}`;
              const traces: Data[] = block.traces.map((tr) => ({
                type: 'bar',
                name: tr.name,
                x: tr.x,
                y: tr.y,
                marker: { color: tr.color, line: { width: 1, color: '#fff' } },
              }));
              const layout: Partial<Layout> = {
                height: 280,
                title: { text: title, font: { size: 11, color: '#7823BD' } },
                barmode: 'group',
                xaxis: { tickangle: -35 },
                legend: { orientation: 'h', y: 1.12, x: 0.5, xanchor: 'center' },
                margin: { t: 56, b: 80, l: 48, r: 16 },
              };
              return <PlotlyFigure key={block.metricIndex} data={traces} layout={layout} />;
            })}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">Barras agrupadas por mes; año de referencia de primas: {anioCurso}.</p>
    </div>
  );
}
