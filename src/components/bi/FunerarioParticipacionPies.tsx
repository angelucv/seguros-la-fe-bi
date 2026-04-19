import { useMemo, useState, useEffect } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  BRAND_DISPLAY_NAME,
  BRAND_PEER_ID,
  CHART_LINE_STROKE_MARCA,
  COLOR_BRAND_GOLD,
  COLOR_BRAND_PRIMARY,
} from '../../../lib/bi/config';
import { milesBsNominalToUsdMillonesNullable } from '../../../lib/bi/fxEngine';
import type { FunerarioRow, TipoCambioDiciembre } from './FunerarioEvolutionChart';

const PALETTE = ['#2563eb', '#0d9488', '#ea580c', '#64748b', '#be123c', '#7c3aed', '#0f766e', '#b45309'];

type SliceSegment = 'top3' | 'fe_extra' | 'resto';

type Slice = {
  name: string;
  peer_id: string;
  /** Miles Bs. (referencia); el ángulo usa `value` según moneda. */
  value: number;
  pct: number;
  color: string;
  /** Seguros La Fe (borde dorado). */
  highlight: boolean;
  segment: SliceSegment;
};

function rowsForYear(byYear: Record<string, FunerarioRow[]>, year: number): FunerarioRow[] {
  return byYear[String(year)] ?? [];
}

function vesForYear(tc: TipoCambioDiciembre[], year: number): number | null {
  return tc.find((t) => t.year === year)?.ves_por_usd ?? null;
}

function shortName(raw: string): string {
  const s = raw.split(',')[0]?.trim() ?? raw;
  return s.length > 36 ? `${s.slice(0, 34)}…` : s;
}

/** Etiqueta fuera de la torta: nombre + % en dos líneas, línea guía desde el arco. */
function PieOutsideLabel(props: Record<string, unknown>) {
  const cx = Number(props.cx);
  const cy = Number(props.cy);
  const midAngle = Number(props.midAngle);
  const outerRadius = Number(props.outerRadius);
  const percent = Number(props.percent);
  const payload = props.payload as Slice | undefined;
  if (!payload || !Number.isFinite(cx) || !Number.isFinite(outerRadius)) return null;

  const pct = percent * 100;
  if (pct < 1.8 && payload.segment !== 'resto') return null;

  const RAD = Math.PI / 180;
  const ang = -midAngle * RAD;
  const or = outerRadius;
  const sx = cx + or * Math.cos(ang);
  const sy = cy + or * Math.sin(ang);
  const labelR = or * 1.52;
  const tpx = cx + labelR * Math.cos(ang);
  const tpy = cy + labelR * Math.sin(ang);
  const anchorRight = tpx >= cx;
  const pad = anchorRight ? 6 : -6;
  const rawTitle = payload.segment === 'resto' ? 'Resto del mercado' : String(payload.name);
  const words = rawTitle.trim().split(/\s+/).filter(Boolean).slice(0, 10);
  const fill = payload.highlight ? COLOR_BRAND_PRIMARY : '#1e293b';
  const lineH = 11;
  const pctLine = `${pct.toFixed(1).replace('.', ',')}\u00A0%`;
  const lines = [...words, pctLine];
  const yStart = tpy - ((lines.length - 1) * lineH) / 2;

  return (
    <g>
      <path
        d={`M${sx},${sy}L${tpx},${tpy}`}
        stroke="#94a3b8"
        strokeWidth={1.25}
        fill="none"
      />
      <text
        textAnchor={anchorRight ? 'start' : 'end'}
        className="pointer-events-none select-none"
      >
        {lines.map((line, i) => {
          const isPct = i === lines.length - 1;
          return (
            <tspan
              key={`${line}-${i}`}
              x={tpx + pad}
              y={yStart + i * lineH}
              fill={isPct ? '#475569' : fill}
              style={{
                fontSize: isPct ? 10.5 : 11,
                fontWeight: isPct ? 600 : 700,
              }}
            >
              {line}
            </tspan>
          );
        })}
      </text>
    </g>
  );
}

function valueForPie(
  milesBs: number,
  moneda: 'bs' | 'usd',
  ves: number | null
): number {
  if (moneda === 'usd' && ves != null) {
    const u = milesBsNominalToUsdMillonesNullable(milesBs, ves);
    if (u != null && Number.isFinite(u)) return u;
  }
  return milesBs;
}

/**
 * Top 3 por prima; si La Fe no está entre ellas, va aparte resaltada; el resto agrupado.
 * Los ángulos son idénticos en Bs. o USD (misma proporción); en USD `value` son millones para tooltip coherente.
 */
function buildSlices(
  rows: FunerarioRow[],
  totalMilesBs: number,
  moneda: 'bs' | 'usd',
  ves: number | null
): Slice[] {
  if (rows.length === 0 || totalMilesBs <= 0) return [];
  const sorted = [...rows].sort((a, b) => b.primas_funerario_miles_bs - a.primas_funerario_miles_bs);
  const top3 = sorted.slice(0, 3);
  const feInTop3 = top3.some((r) => r.peer_id === BRAND_PEER_ID);
  const feRow = sorted.find((r) => r.peer_id === BRAND_PEER_ID);

  const out: Slice[] = [];
  for (let i = 0; i < top3.length; i++) {
    const r = top3[i]!;
    const isFe = r.peer_id === BRAND_PEER_ID;
    const miles = r.primas_funerario_miles_bs;
    const pct = (miles / totalMilesBs) * 100;
    out.push({
      name: shortName(r.empresa_raw),
      peer_id: r.peer_id,
      value: valueForPie(miles, moneda, ves),
      pct,
      color: isFe ? CHART_LINE_STROKE_MARCA : PALETTE[i % PALETTE.length]!,
      highlight: isFe,
      segment: 'top3',
    });
  }

  if (feRow && !feInTop3) {
    const miles = feRow.primas_funerario_miles_bs;
    const pct = (miles / totalMilesBs) * 100;
    out.push({
      name: BRAND_DISPLAY_NAME,
      peer_id: BRAND_PEER_ID,
      value: valueForPie(miles, moneda, ves),
      pct,
      color: CHART_LINE_STROKE_MARCA,
      highlight: true,
      segment: 'fe_extra',
    });
  }

  const accounted = new Set(top3.map((r) => r.peer_id));
  if (feRow && !feInTop3) accounted.add(BRAND_PEER_ID);
  const restMiles = sorted
    .filter((r) => !accounted.has(r.peer_id))
    .reduce((s, r) => s + r.primas_funerario_miles_bs, 0);

  if (restMiles > 0) {
    const pct = (restMiles / totalMilesBs) * 100;
    out.push({
      name: 'Resto del mercado',
      peer_id: '__resto__',
      value: valueForPie(restMiles, moneda, ves),
      pct,
      color: '#cbd5e1',
      highlight: false,
      segment: 'resto',
    });
  }

  return out;
}

function PieTooltipBody(
  props: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: Slice }>;
    moneda: 'bs' | 'usd';
    ves: number | null;
  }
) {
  const { active, payload, moneda, ves } = props;
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const displayVal = p.value;
  const showUsd = moneda === 'usd' && ves != null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-bold text-slate-800">{p.name}</p>
      <p className="mt-0.5 whitespace-nowrap text-slate-600">
        Participación:{' '}
        <strong>
          {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 1 }).format(p.pct)}
          {'\u00A0'}%
        </strong>
      </p>
      <p className="text-slate-500">
        {showUsd ? (
          <>
            Prima funeraria:{' '}
            <strong>
              {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(displayVal)}
            </strong>{' '}
            millones USD
          </>
        ) : (
          <>
            Prima funeraria:{' '}
            <strong>
              {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(displayVal)}
            </strong>{' '}
            miles Bs.
          </>
        )}
      </p>
    </div>
  );
}

function YearPie({
  year,
  rows,
  tipoCambioDiciembre,
  moneda,
}: {
  year: number;
  rows: FunerarioRow[];
  tipoCambioDiciembre: TipoCambioDiciembre[];
  moneda: 'bs' | 'usd';
}) {
  const ves = vesForYear(tipoCambioDiciembre, year);
  const slices = useMemo(() => {
    const totalMilesBs = rows.reduce((s, r) => s + r.primas_funerario_miles_bs, 0);
    return buildSlices(rows, totalMilesBs, moneda, ves);
  }, [rows, moneda, ves]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const t = window.setTimeout(() => setReady(true), 50);
    return () => window.clearTimeout(t);
  }, [year, slices.length, moneda]);

  if (slices.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-sm text-slate-500">
        Sin datos {year}
      </div>
    );
  }

  const data = slices.map((s) => ({ ...s, fill: s.color }));

  return (
    <div className="rounded-xl border border-[#7823BD]/15 bg-white p-3 shadow-sm">
      <h4 className="text-center text-sm font-bold text-[#7823BD]">Participación · cierre {year}</h4>
      <p className="mt-0.5 text-center text-[10px] text-slate-500">
        {moneda === 'usd' ? '% y millones USD (tipo BCV diciembre)' : '% y miles Bs.'}
      </p>
      <div className="mt-2 h-[min(380px,88vw)] min-h-[320px] w-full overflow-visible md:min-h-[340px] [&_.recharts-surface]:overflow-visible">
        {ready ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 20, right: 36, bottom: 20, left: 36 }}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="38%"
                outerRadius="52%"
                paddingAngle={2}
                labelLine={false}
                label={PieOutsideLabel}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={`${year}-${entry.peer_id}-${i}`}
                    fill={entry.fill}
                    stroke={
                      entry.highlight
                        ? COLOR_BRAND_GOLD
                        : entry.segment === 'top3'
                          ? '#64748b'
                          : '#e2e8f0'
                    }
                    strokeWidth={entry.highlight ? 5 : entry.segment === 'top3' ? 3 : 1}
                  />
                ))}
              </Pie>
              <Tooltip
                content={(props) => (
                  <PieTooltipBody
                    active={props.active}
                    payload={props.payload as ReadonlyArray<{ payload?: Slice }> | undefined}
                    moneda={moneda}
                    ves={ves}
                  />
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">…</div>
        )}
      </div>
      <p className="mt-1 text-center text-[10px] text-slate-500">Top 3 · {BRAND_DISPLAY_NAME} · resto</p>
    </div>
  );
}

export function FunerarioParticipacionPies({
  data,
  tipoCambioDiciembre,
  moneda,
}: {
  data: { years: number[]; byYear: Record<string, FunerarioRow[]> };
  tipoCambioDiciembre: TipoCambioDiciembre[];
  moneda: 'bs' | 'usd';
}) {
  const years = data.years.length ? data.years : [2022, 2023, 2024];

  return (
    <section className="rounded-xl border border-[#7823BD]/15 bg-[#FBF9F9] p-4 shadow-sm">
      <h3 className="text-base font-bold text-[#7823BD]">Participación de mercado por año (ramo funerario)</h3>
      <p className="mt-1 text-xs text-slate-600">
        Top 3 por prima; <strong className="text-[#7823BD]">{BRAND_DISPLAY_NAME}</strong> resaltada (borde dorado). Resto
        del mercado agrupado. USD: tipo BCV de cierre de año.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {years.map((y) => (
          <YearPie
            key={y}
            year={y}
            rows={rowsForYear(data.byYear, y)}
            tipoCambioDiciembre={tipoCambioDiciembre}
            moneda={moneda}
          />
        ))}
      </div>
    </section>
  );
}
