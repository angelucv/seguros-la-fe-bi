import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { etiquetaMesLargoBarras } from '../../../lib/monthLabels';
import { useCompactViewport } from '../../lib/useCompactViewport';
import { BRAND_PEER_ID, CHART_STROKE_MARCA, COLOR_PEER_MARCA } from '../../../lib/bi/config';

type Serie = { peer_id: string; name: string; color: string; y: number[] };

function colorSeriePrimas(s: Serie): string {
  return s.peer_id === BRAND_PEER_ID ? COLOR_PEER_MARCA : s.color;
}

function TooltipPrimas({
  active,
  payload,
  label,
  nameByPeer,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: string | number | (string | number)[];
    color?: string;
    name?: string | number;
  }>;
  label?: string;
  nameByPeer: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  const seen = new Set<string>();
  const items: NonNullable<typeof payload> = [];
  for (const p of payload) {
    const k = String(p.dataKey ?? '');
    if (!k || seen.has(k)) continue;
    seen.add(k);
    items.push(p);
  }
  return (
    <div
      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 shadow-lg"
      style={{ fontSize: 12 }}
    >
      <p className="mb-2 font-bold text-slate-900">{label}</p>
      {items.map((p) => {
        const key = String(p.dataKey);
        const name = nameByPeer[key] ?? key;
        const raw = p.value;
        const v = Array.isArray(raw) ? Number(raw[0]) : Number(raw);
        const colRaw = p.color && p.color !== '#ffffff' ? p.color : '#0f172a';
        const col = key === BRAND_PEER_ID ? '#0f172a' : colRaw;
        return (
          <p key={key} className="font-semibold leading-relaxed" style={{ color: col }}>
            {name}: {v.toLocaleString('es-ES', { maximumFractionDigits: 2 })} M USD
          </p>
        );
      })}
    </div>
  );
}

/**
 * Barras agrupadas + líneas que unen cada empresa mes a mes.
 * Revelado de izquierda a derecha (mes a mes) y meses en español bajo el eje.
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
  const fullRows = useMemo(() => {
    return mesesLabels.map((lab, i) => {
      const row: Record<string, number | string> = {
        mesRaw: lab,
        mesNombre: etiquetaMesLargoBarras(lab, mesesLabels),
      };
      for (const s of series) {
        row[s.peer_id] = s.y[i] ?? 0;
      }
      return row;
    });
  }, [mesesLabels, series]);

  const fingerprint = useMemo(
    () => mesesLabels.join('|') + series.map((s) => s.peer_id + s.y.join(',')).join(';'),
    [mesesLabels, series]
  );

  const seriesForChart = useMemo(
    () => series.map((s) => ({ ...s, color: colorSeriePrimas(s) })),
    [series]
  );

  const [visibleCount, setVisibleCount] = useState(1);
  const compact = useCompactViewport();

  useEffect(() => {
    if (compact) {
      setVisibleCount(fullRows.length);
      return;
    }
    setVisibleCount(1);
  }, [fingerprint, compact, fullRows.length]);

  useEffect(() => {
    if (compact) return;
    if (visibleCount >= fullRows.length) return;
    const t = window.setTimeout(() => setVisibleCount((n) => n + 1), 420);
    return () => clearTimeout(t);
  }, [visibleCount, fullRows.length, compact]);

  const data = compact ? fullRows : fullRows.slice(0, Math.max(1, visibleCount));
  const nameByPeer = Object.fromEntries(series.map((s) => [s.peer_id, s.name]));

  return (
    <div
      className={`rounded-2xl border border-[#7823BD]/15 bg-[#EEF2FA] p-4 shadow-sm sm:p-6 ${className}`}
    >
      <h3
        className="text-center text-sm font-bold leading-snug text-[#1e293b] sm:text-base"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {subtitle && <p className="mt-1 text-center text-xs font-medium text-slate-600">{subtitle}</p>}
      <div className="mt-4 rounded-xl bg-white/95 p-2 pt-4 shadow-inner">
        <div className="h-[min(420px,70vh)] w-full min-h-[220px] sm:min-h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{
                top: 12,
                right: compact ? 6 : 12,
                left: compact ? 0 : 4,
                bottom: compact ? 8 : 28,
              }}
              barGap={4}
              barCategoryGap="18%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d8dee9" />
              <XAxis
                dataKey="mesNombre"
                angle={compact ? -38 : 0}
                textAnchor={compact ? 'end' : 'middle'}
                height={compact ? 72 : undefined}
                interval={0}
                tick={{ fontSize: compact ? 10 : 12, fill: '#0f172a', fontWeight: 600 }}
                tickLine={{ stroke: '#94a3b8' }}
                axisLine={{ stroke: '#94a3b8' }}
              />
              <YAxis
                tick={{ fontSize: compact ? 10 : 11, fill: '#334155', fontWeight: 500 }}
                tickLine={{ stroke: '#94a3b8' }}
                axisLine={{ stroke: '#94a3b8' }}
                label={{
                  value: 'Millones USD',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#1e293b',
                  fontSize: compact ? 10 : 11,
                  fontWeight: 600,
                }}
                width={compact ? 48 : 56}
              />
              <Tooltip
                content={(props) => {
                  const mes = (
                    props.payload?.[0]?.payload as { mesNombre?: string } | undefined
                  )?.mesNombre;
                  return (
                    <TooltipPrimas
                      active={props.active}
                      payload={props.payload}
                      label={mes ?? (typeof props.label === 'string' ? props.label : undefined)}
                      nameByPeer={nameByPeer}
                    />
                  );
                }}
              />
              {seriesForChart.map((s) => (
                <Bar
                  key={`bar-${s.peer_id}`}
                  dataKey={s.peer_id}
                  name={s.peer_id}
                  fill={s.color}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={40}
                  animationBegin={120}
                  animationDuration={900}
                  animationEasing="ease-out"
                  isAnimationActive
                  stroke={s.peer_id === BRAND_PEER_ID ? CHART_STROKE_MARCA : '#ffffff'}
                  strokeWidth={s.peer_id === BRAND_PEER_ID ? 2.2 : 1}
                />
              ))}
              {data.length >= 2 &&
                seriesForChart.map((s) => (
                  <Line
                    key={`line-${s.peer_id}`}
                    type="monotone"
                    dataKey={s.peer_id}
                    name={s.peer_id}
                    stroke={s.color}
                    strokeWidth={s.peer_id === BRAND_PEER_ID ? 3.4 : 2.6}
                    dot={{ r: 5, fill: '#fff', strokeWidth: 2.2, stroke: s.color }}
                    activeDot={{ r: 7 }}
                    connectNulls
                    animationDuration={900}
                    animationBegin={80}
                    animationEasing="ease-out"
                    isAnimationActive
                  />
                ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <ul
          className="mt-2 flex list-none flex-col gap-2 border-t border-slate-100 px-1 pb-2 pt-3 text-left sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:text-center"
          style={{ margin: 0, paddingLeft: 0, paddingRight: 0 }}
        >
          {seriesForChart.map((s) => {
            const label = nameByPeer[s.peer_id] ?? s.peer_id;
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
    </div>
  );
}
