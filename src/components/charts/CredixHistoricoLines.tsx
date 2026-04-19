import { forwardRef, useId, useMemo } from 'react';
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { etiquetaMesEje, etiquetaPeriodoLegible } from '../../../lib/monthLabels';
import { useCompactViewport } from '../../lib/useCompactViewport';
import {
  BRAND_PEER_ID,
  CHART_HISTORICO_MIN_MES_PREFIJO,
  CHART_LINE_STROKE_MARCA,
  COLOR_BRAND_NAVY,
  COLOR_BRAND_PRIMARY,
} from '../../../lib/bi/config';
import type { CredixLineSeries } from '@/src/lib/biHistoricoHelpers';

export type { CredixLineSeries } from '@/src/lib/biHistoricoHelpers';

const CARD_BORDER = 'border-[#7823BD]/15';
const CARD_BG = 'bg-[#FBF9F9]';
const TITLE_COLOR = '#7823BD';

type Props = {
  series: CredixLineSeries[];
  title: string;
  subtitle?: string;
  yAxisLabel: string;
  /** Relleno bajo la curva solo para la empresa en marca (peer_id configurado). */
  areaPeerId?: string;
  /** Formato del eje Y y tooltip */
  formatValue: (v: number) => string;
  className?: string;
  /** Sin series: mensaje en lugar del gráfico. */
  emptyMessage?: string;
  /** Barra de zoom/selección en el eje X (útil en series largas). */
  enableBrush?: boolean;
  /** Texto bajo el tooltip (p. ej. nota tipo BCV en vista USD). */
  tooltipFooter?: string;
};

/** Garantiza morado oscuro para La Fe aunque `s.color` venga desactualizado del payload. */
function strokeForPeer(peerId: string, seriesColor: string): string {
  return peerId === BRAND_PEER_ID ? CHART_LINE_STROKE_MARCA : seriesColor;
}

function rowsFromSeries(series: CredixLineSeries[]) {
  if (!series.length) return [];
  const allX = [...new Set(series.flatMap((s) => s.x))].sort((a, b) => a.localeCompare(b));
  const mesMin = CHART_HISTORICO_MIN_MES_PREFIJO;
  const desdeMin = allX.filter((fecha) => String(fecha).slice(0, 7) >= mesMin);
  return desdeMin.map((fecha) => {
    const row: Record<string, number | string | null> = { _x: fecha };
    for (const s of series) {
      const idx = s.x.indexOf(fecha);
      const raw = idx >= 0 ? s.y[idx] : null;
      const v = raw as number | null;
      row[s.peer_id] = v == null || !Number.isFinite(v) ? null : v;
    }
    return row;
  });
}

/** Min/max de los valores mostrados con margen; evita eje Y absurdamente amplio por meses vacíos. */
function yDomainFromRows(rows: Record<string, unknown>[], keys: string[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const row of rows) {
    for (const k of keys) {
      const v = row[k];
      if (typeof v === 'number' && Number.isFinite(v)) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1];
  const span = hi - lo || Math.max(Math.abs(hi), 1e-6);
  const pad = Math.max(span * 0.08, 1e-6);
  let y0 = lo - pad;
  let y1 = hi + pad;
  if (lo >= 0 && y0 < 0) y0 = 0;
  if (y1 <= y0) y1 = y0 + 1;
  return [y0, y1];
}

/** Índices del Brush: rango completo visible (datos ya ≥ 2023); fin en el último mes con valor. */
function brushSpan(rows: Record<string, unknown>[], keys: string[]): { start: number; end: number } {
  if (rows.length === 0) return { start: 0, end: 0 };
  const hasVal = (row: Record<string, unknown>) =>
    keys.some((k) => {
      const v = row[k];
      return typeof v === 'number' && Number.isFinite(v);
    });
  let end = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (hasVal(rows[i]!)) {
      end = i;
      break;
    }
  }
  return { start: 0, end };
}

/**
 * Líneas suaves + animación de trazo (Recharts), estilo “evolución” tipo Credix.
 * `ref` apunta al contenedor exportable (PNG).
 */
export const CredixHistoricoLines = forwardRef<HTMLDivElement, Props>(function CredixHistoricoLines(
  {
    series,
    title,
    subtitle,
    yAxisLabel,
    areaPeerId,
    formatValue,
    className = '',
    emptyMessage = 'Seleccione al menos una empresa para ver la serie.',
    enableBrush = true,
    tooltipFooter,
  },
  ref
) {
  const uid = useId().replace(/:/g, '');
  const gradId = `${uid}-grad`;
  const shadowFilterId = `${uid}-intl-shadow`;
  const compact = useCompactViewport();

  const peerKeys = useMemo(() => series.map((s) => s.peer_id), [series]);

  const rows = useMemo(() => rowsFromSeries(series), [series]);
  const yDomain = useMemo(() => yDomainFromRows(rows, peerKeys), [rows, peerKeys]);
  const brushIdx = useMemo(() => brushSpan(rows, peerKeys), [rows, peerKeys]);

  const showBrush = enableBrush && rows.length > 12;
  const chartBottom = showBrush ? (compact ? 92 : 100) : compact ? 56 : 64;
  const yTickUseShort = compact && Math.abs(yDomain[1] - yDomain[0]) > 500;

  const ordered = [...series].sort((a, b) => {
    if (a.peer_id === areaPeerId) return 1;
    if (b.peer_id === areaPeerId) return -1;
    return 0;
  });

  const nameByPeer = Object.fromEntries(series.map((s) => [s.peer_id, s.name]));

  if (!series.length) {
    return (
      <div
        ref={ref}
        className={`rounded-2xl border ${CARD_BORDER} ${CARD_BG} p-4 shadow-sm sm:p-6 ${className}`}
      >
        <h3
          className="text-center text-sm font-bold leading-snug sm:text-base"
          style={{ color: TITLE_COLOR }}
          dangerouslySetInnerHTML={{ __html: title }}
        />
        {subtitle && (
          <p className="mt-1 text-center text-xs text-slate-500" dangerouslySetInnerHTML={{ __html: subtitle }} />
        )}
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white/80 py-10 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div ref={ref} className={`rounded-2xl border ${CARD_BORDER} ${CARD_BG} p-4 shadow-sm sm:p-6 ${className}`}>
        <h3
          className="text-center text-sm font-bold leading-snug sm:text-base"
          style={{ color: TITLE_COLOR }}
          dangerouslySetInnerHTML={{ __html: title }}
        />
        {subtitle && (
          <p className="mt-1 text-center text-xs text-slate-500" dangerouslySetInnerHTML={{ __html: subtitle }} />
        )}
        <p className="mt-6 rounded-xl border border-dashed border-amber-200 bg-amber-50/90 py-10 px-4 text-center text-sm text-amber-950">
          No hay periodos desde <strong>enero de 2023</strong> para la selección actual (el eje del gráfico solo incluye
          meses desde esa fecha).
        </p>
      </div>
    );
  }

  return (
    <div ref={ref} className={`rounded-2xl border ${CARD_BORDER} ${CARD_BG} p-4 shadow-sm sm:p-6 ${className}`}>
      <h3
        className="text-center text-sm font-bold leading-snug sm:text-base"
        style={{ color: TITLE_COLOR }}
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {subtitle && (
        <p className="mt-1 text-center text-xs text-slate-500" dangerouslySetInnerHTML={{ __html: subtitle }} />
      )}
        <div className="mt-4 rounded-xl bg-white/95 p-2 pt-3 shadow-inner">
        <div className="h-[min(560px,85vh)] w-full min-h-[280px] sm:min-h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={rows}
              margin={{ top: 12, right: compact ? 8 : 12, left: compact ? 4 : 8, bottom: chartBottom }}
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_LINE_STROKE_MARCA} stopOpacity={0.55} />
                  <stop offset="45%" stopColor={COLOR_BRAND_PRIMARY} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={COLOR_BRAND_NAVY} stopOpacity={0.1} />
                </linearGradient>
                {areaPeerId && (
                  <filter
                    id={shadowFilterId}
                    x="-35%"
                    y="-25%"
                    width="170%"
                    height="180%"
                    colorInterpolationFilters="sRGB"
                  >
                    <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor={CHART_LINE_STROKE_MARCA} floodOpacity={0.42} />
                    <feDropShadow dx="0" dy="16" stdDeviation="14" floodColor={COLOR_BRAND_NAVY} floodOpacity={0.22} />
                    <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#0f172a" floodOpacity={0.12} />
                  </filter>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d8dee9" />
              <XAxis
                dataKey="_x"
                type="category"
                tick={{ fontSize: compact ? 9 : 10, fill: '#0f172a', fontWeight: 600 }}
                tickFormatter={(v) => etiquetaMesEje(String(v))}
                interval="preserveStartEnd"
                tickLine={{ stroke: '#94a3b8' }}
                axisLine={{ stroke: '#94a3b8' }}
              />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: compact ? 9 : 10, fill: '#334155', fontWeight: 500 }}
                tickLine={{ stroke: '#94a3b8' }}
                axisLine={{ stroke: '#94a3b8' }}
                tickFormatter={(v) => {
                  const n = Number(v);
                  if (!Number.isFinite(n)) return '';
                  if (yTickUseShort) {
                    const a = Math.abs(n);
                    if (a >= 1e9) return `${(n / 1e9).toFixed(2)}G`;
                    if (a >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
                    if (a >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
                  }
                  return formatValue(n);
                }}
                label={{
                  value:
                    compact && yAxisLabel.length > 32
                      ? `${yAxisLabel.slice(0, 30)}…`
                      : yAxisLabel,
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#1e293b',
                  fontSize: compact ? 10 : 11,
                  fontWeight: 600,
                }}
                width={compact ? 52 : 56}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const periodo = etiquetaPeriodoLegible(String(label));
                  return (
                    <div
                      className="max-w-[min(100vw-2rem,20rem)] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg"
                      style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}
                    >
                      <p className="font-bold text-[#0f172a]">Periodo: {periodo}</p>
                      {payload.map((item) => {
                        const dk = String(item.dataKey ?? '');
                        const raw = item.value;
                        const num = typeof raw === 'number' ? raw : Number(raw);
                        const show =
                          raw != null && raw !== '' && typeof num === 'number' && Number.isFinite(num);
                        return (
                          <p key={dk} className="mt-0.5">
                            <span className="inline-block w-2 align-middle" style={{ color: item.color }} aria-hidden>
                              ●
                            </span>{' '}
                            {nameByPeer[dk] ?? dk}: {show ? formatValue(num) : '—'}
                          </p>
                        );
                      })}
                      {tooltipFooter ? (
                        <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] font-medium leading-snug text-slate-500">
                          {tooltipFooter}
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Legend
                layout="horizontal"
                wrapperStyle={{
                  paddingTop: 12,
                  color: '#0f172a',
                  fontWeight: 600,
                  maxHeight: 120,
                  overflowY: 'auto',
                }}
                formatter={(value) => nameByPeer[value] ?? value}
              />

              {ordered.map((s) => {
                const common = {
                  key: s.peer_id,
                  dataKey: s.peer_id,
                  name: s.peer_id,
                  type: 'monotone' as const,
                  connectNulls: true,
                  animationBegin: 0,
                  animationDuration: 1650,
                  animationEasing: 'ease-out' as const,
                  isAnimationActive: true,
                };

                if (areaPeerId && s.peer_id === areaPeerId) {
                  const stroke = strokeForPeer(s.peer_id, s.color);
                  return (
                    <Area
                      {...common}
                      stroke={stroke}
                      strokeWidth={4.2}
                      fill={`url(#${gradId})`}
                      style={{ filter: `url(#${shadowFilterId})` }}
                      dot={{ r: 3, fill: stroke, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 5 }}
                    />
                  );
                }

                const stroke = strokeForPeer(s.peer_id, s.color);
                return (
                  <Line
                    {...common}
                    stroke={stroke}
                    strokeWidth={s.peer_id === BRAND_PEER_ID && !areaPeerId ? 4.2 : 2.2}
                    strokeOpacity={0.88}
                    dot={false}
                  />
                );
              })}

              {showBrush ? (
                <Brush
                  dataKey="_x"
                  height={28}
                  travellerWidth={9}
                  stroke="#7823BD"
                  fill="#EDE7F6"
                  tickFormatter={(v) => etiquetaMesEje(String(v))}
                  startIndex={brushIdx.start}
                  endIndex={brushIdx.end}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});
