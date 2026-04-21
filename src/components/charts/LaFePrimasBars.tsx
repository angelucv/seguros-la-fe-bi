import { useEffect, useMemo, useState } from 'react';
import type { Data, Layout } from 'plotly.js';
import { etiquetaMesLargoBarras } from '../../../lib/monthLabels';
import { useCompactViewport } from '../../lib/useCompactViewport';
import { BRAND_PEER_ID, COLOR_BRAND_PRIMARY, COLOR_PEER_MARCA } from '../../../lib/bi/config';
import { PlotlyFigure } from './PlotlyFigure';

type Serie = { peer_id: string; name: string; color: string; y: number[] };

function colorSeriePrimas(s: Serie): string {
  return s.peer_id === BRAND_PEER_ID ? COLOR_PEER_MARCA : s.color;
}

/**
 * Primas mensuales — banda de comparativa.
 * Usa Plotly (mismo stack que tacómetros / barras de índices) para evitar fallos de
 * render en producción con Recharts + React 19 / StrictMode.
 */
export function LaFePrimasBars({
  mesesLabels,
  series,
  title,
  subtitle,
  className = '',
}: {
  mesesLabels: string[];
  series: Serie[];
  title: string;
  subtitle?: string;
  className?: string;
}) {
  const compact = useCompactViewport();

  const fingerprint = useMemo(
    () => mesesLabels.join('|') + series.map((s) => s.peer_id + s.y.join(',')).join(';'),
    [mesesLabels, series]
  );

  const xAll = useMemo(
    () => mesesLabels.map((lab) => etiquetaMesLargoBarras(lab, mesesLabels)),
    [mesesLabels]
  );

  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (compact) {
      setVisibleCount(xAll.length);
      return;
    }
    setVisibleCount(1);
  }, [fingerprint, compact, xAll.length]);

  useEffect(() => {
    if (compact) return;
    if (visibleCount >= xAll.length) return;
    const t = window.setTimeout(() => setVisibleCount((n) => n + 1), 420);
    return () => clearTimeout(t);
  }, [visibleCount, xAll.length, compact]);

  const x = compact ? xAll : xAll.slice(0, Math.max(1, visibleCount));

  const seriesForChart = useMemo(
    () => series.map((s) => ({ ...s, color: colorSeriePrimas(s) })),
    [series]
  );

  const plotData: Data[] = useMemo(() => {
    const bars: Data[] = seriesForChart.map((s) => ({
      type: 'bar',
      name: s.name,
      x,
      y: x.map((_, i) => {
        const v = s.y[i];
        return v != null && Number.isFinite(v) ? v : 0;
      }),
      marker: { color: s.color, line: { color: '#ffffff', width: 1 } },
      hovertemplate: '%{x}<br>%{y:.4f} M USD<extra></extra>',
    }));

    const marca = seriesForChart.find((s) => s.peer_id === BRAND_PEER_ID);
    if (!marca || x.length < 2) return bars;

    const yTendencia = x.map((_, i) => {
      const v = marca.y[i];
      return v != null && Number.isFinite(v) ? v : 0;
    });

    const tendenciaLaFe: Data = {
      type: 'scatter',
      mode: 'lines+markers',
      name: 'La Fe · tendencia',
      x,
      y: yTendencia,
      line: { color: COLOR_BRAND_PRIMARY, width: 3, shape: 'linear' },
      marker: {
        color: '#ffffff',
        size: compact ? 8 : 10,
        line: { color: COLOR_BRAND_PRIMARY, width: 2.4 },
      },
      hovertemplate: '%{x}<br><b>La Fe</b> (tendencia): %{y:.4f} M USD<extra></extra>',
      showlegend: false,
    };

    return [...bars, tendenciaLaFe];
  }, [seriesForChart, x, compact]);

  const layout: Partial<Layout> = useMemo(
    () => ({
      height: compact ? 300 : 380,
      barmode: 'group',
      bargap: 0.22,
      paper_bgcolor: 'rgba(255,255,255,0.97)',
      plot_bgcolor: 'rgba(255,255,255,0.97)',
      title: {
        text: subtitle
          ? `${title}<br><span style="font-size:11px;font-weight:500;color:#64748b">${subtitle}</span>`
          : title,
        x: 0.5,
        xanchor: 'center',
        font: { size: compact ? 13 : 14, color: '#0f172a' },
      },
      margin: { t: subtitle ? 88 : 64, r: 12, b: compact ? 72 : 52, l: 56 },
      xaxis: {
        tickangle: compact ? -38 : -12,
        automargin: true,
        title: { text: '' },
        tickfont: { size: compact ? 10 : 11, color: '#0f172a' },
      },
      yaxis: {
        title: { text: 'Millones USD', font: { size: compact ? 10 : 11, color: '#1e293b' } },
        rangemode: 'tozero',
        automargin: true,
        tickfont: { size: compact ? 10 : 11, color: '#334155' },
      },
      showlegend: false,
    }),
    [compact, title, subtitle]
  );

  return (
    <div
      className={`rounded-2xl border border-[#7823BD]/15 bg-[#EEF2FA] p-4 shadow-sm sm:p-6 ${className}`}
    >
      <div className="rounded-xl bg-white/95 p-1 shadow-inner sm:p-2">
        <PlotlyFigure
          key={`${fingerprint}-${x.length}`}
          data={plotData}
          layout={layout}
          className="min-h-[280px] w-full sm:min-h-[320px]"
        />
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500 sm:text-xs">
        Línea morada: evolución mes a mes de <strong className="text-[#7823BD]">Seguros La Fe</strong> sobre las mismas
        primas en millones USD.
      </p>
      <ul
        className="mt-2 flex list-none flex-col gap-2 border-t border-slate-100 px-1 pb-2 pt-3 text-left sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:text-center"
        style={{ margin: 0, paddingLeft: 0, paddingRight: 0 }}
      >
        {seriesForChart.map((s) => {
          const label = s.name;
          const labelColor = s.peer_id === BRAND_PEER_ID ? '#0f172a' : s.color;
          return (
            <li key={`leg-${s.peer_id}`} className="flex items-start gap-2 text-[11px] font-semibold sm:items-center sm:text-[12px]">
              <span
                className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-sm border border-slate-200 sm:mt-0"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden className="mt-1 shrink-0 sm:mt-0">
                <polyline
                  points="0,8 6,4 12,6 20,2"
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="6" r="2.2" fill="#fff" stroke={s.color} strokeWidth="1.5" />
              </svg>
              <span className="min-w-0 leading-snug" style={{ color: labelColor }}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
