import { useEffect, useMemo, useRef, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { BRAND_DISPLAY_NAME, COLOR_BRAND_PRIMARY } from '@/lib/bi/config';

export type CredixDonutSlice = {
  name: string;
  value: number;
  color: string;
  highlight?: boolean;
};

function LabelConContraste(props: Record<string, unknown>) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const { name, percent } = props;
  const payload = (props.payload ?? {}) as CredixDonutSlice;
  const nm = String(name).toLowerCase();
  const isMarca =
    Boolean(payload.highlight) ||
    nm.includes(BRAND_DISPLAY_NAME.toLowerCase()) ||
    (nm.includes('la fe') && nm.includes('seguros'));
  const RADIAN = Math.PI / 180;
  const pad = isMarca ? 30 : 22;
  const r = outerRadius + pad;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  const short = String(name).split(',')[0]?.slice(0, 20) ?? String(name);
  const pct = (Number(percent ?? 0) * 100).toFixed(1);
  const label = `${short}: ${pct}%`;
  const anchor = x > cx ? 'start' : 'end';
  if (isMarca) {
    return (
      <g>
        <text
          x={x}
          y={y}
          fill="#4C1D95"
          textAnchor={anchor}
          dominantBaseline="central"
          opacity={0.35}
          style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.02em' }}
          transform="translate(1.2,1.2)"
        >
          {label}
        </text>
        <text
          x={x}
          y={y}
          fill={COLOR_BRAND_PRIMARY}
          textAnchor={anchor}
          dominantBaseline="central"
          style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.02em' }}
          stroke="#ffffff"
          strokeWidth={4}
          paintOrder="stroke"
        >
          {label}
        </text>
      </g>
    );
  }
  return (
    <text
      x={x}
      y={y}
      fill="#0f172a"
      textAnchor={anchor}
      dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700 }}
      stroke="#ffffff"
      strokeWidth={3}
      paintOrder="stroke"
    >
      {label}
    </text>
  );
}

/**
 * Donut de participación: la animación de Recharts solo se ve bien cuando el contenedor ya tiene tamaño
 * (ResponsiveContainer). Se retrasa un fotograma el montaje del Pie y se fuerza `key` al cambiar datos.
 */
export function CredixDonut({
  slices,
  title,
  subtitle,
  className = '',
}: {
  slices: CredixDonutSlice[];
  title: string;
  subtitle?: string;
  className?: string;
}) {
  const data = useMemo(
    () =>
      slices.map((s) => ({
        ...s,
        fill: s.color,
      })),
    [slices]
  );

  const dataSig = useMemo(() => data.map((d) => `${d.name}:${d.value}`).join('|'), [data]);

  const [animKey, setAnimKey] = useState(0);
  const dataSigPrev = useRef<string | null>(null);
  useEffect(() => {
    if (dataSigPrev.current === null) {
      dataSigPrev.current = dataSig;
      return;
    }
    if (dataSigPrev.current !== dataSig) {
      dataSigPrev.current = dataSig;
      setAnimKey((k) => k + 1);
    }
  }, [dataSig]);

  /** Montar el Pie un tick después de tener datos + layout, para que la animación nativa no quede en 0. */
  const [paintReady, setPaintReady] = useState(false);
  useEffect(() => {
    if (!data.length) {
      setPaintReady(false);
      return;
    }
    setPaintReady(false);
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (!cancelled) setPaintReady(true);
    }, 72);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [data.length, dataSig, animKey]);

  const pieKey = `${animKey}-${dataSig.length}-${dataSig.slice(0, 120)}`;

  return (
    <div
      className={`rounded-2xl border border-[#7823BD]/15 bg-[#EEF2FA] p-4 shadow-sm sm:p-6 ${className}`}
    >
      <h3
        className="text-center text-sm font-bold leading-snug text-[#1e293b] sm:text-base"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {subtitle && (
        <p
          className="mt-1 text-center text-xs font-medium text-slate-600"
          dangerouslySetInnerHTML={{ __html: subtitle }}
        />
      )}
      <div className="mt-4 rounded-xl bg-white/95 p-2 shadow-inner">
        <div className="donut-chart-enter h-[min(420px,70vw)] w-full min-h-[320px]">
          {!data.length && (
            <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-slate-400">
              Sin datos de participación
            </div>
          )}
          {data.length > 0 && paintReady && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
                <Pie
                  key={pieKey}
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="78%"
                  paddingAngle={3}
                  startAngle={88}
                  endAngle={-272}
                  animationBegin={60}
                  animationDuration={2800}
                  animationEasing="ease-out"
                  isAnimationActive
                  label={LabelConContraste}
                  labelLine={{ stroke: '#64748b', strokeWidth: 1.2 }}
                >
                  {data.map((entry, i) => (
                    <Cell
                      key={`${pieKey}-${i}`}
                      fill={entry.fill}
                      stroke={entry.highlight ? '#4C1D95' : '#94a3b8'}
                      strokeWidth={entry.highlight ? 6.5 : 1.6}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) =>
                    `${v.toLocaleString('es-ES', { maximumFractionDigits: 2 })} M USD`
                  }
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    color: '#0f172a',
                    fontWeight: 600,
                    boxShadow: '0 4px 14px rgba(15,23,42,0.12)',
                  }}
                  labelStyle={{ color: '#0f172a', fontWeight: 700 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          {data.length > 0 && !paintReady && (
            <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-slate-400">
              Cargando gráfico…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
