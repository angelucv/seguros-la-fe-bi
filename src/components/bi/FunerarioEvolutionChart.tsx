import { useMemo } from 'react';
import { useCompactViewport } from '../../lib/useCompactViewport';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BRAND_DISPLAY_NAME,
  BRAND_PEER_ID,
  CHART_LINE_STROKE_MARCA,
  COLOR_BRAND_GOLD,
  COLOR_BRAND_PRIMARY,
} from '../../../lib/bi/config';
import { milesBsNominalToUsdMillonesNullable } from '../../../lib/bi/fxEngine';

const PALETTE = ['#2563eb', '#0d9488', '#ea580c', '#64748b', '#be123c'];

export type FunerarioRow = {
  ranking_funerario: number;
  empresa_raw: string;
  peer_id: string;
  primas_funerario_miles_bs: number;
  primas_total_personas_miles_bs: number;
  pagina_pdf: string;
  year: number;
  archivo_fuente: string;
};

type FunerarioApi = {
  years: number[];
  byYear: Record<string, FunerarioRow[]>;
};

export type TipoCambioDiciembre = { year: number; ves_por_usd: number | null };

function fmtMilesShort(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')} mil`;
  return new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(n);
}

function fmtUsdMillonesShort(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 100) return `${n.toFixed(1).replace('.', ',')}`;
  if (Math.abs(n) >= 10) return `${n.toFixed(2).replace('.', ',')}`;
  return `${n.toFixed(3).replace('.', ',')}`;
}

function rowsForYear(api: FunerarioApi, year: number): FunerarioRow[] {
  return api.byYear[String(year)] ?? [];
}

function vesForYear(tc: TipoCambioDiciembre[], year: number): number | null {
  const hit = tc.find((t) => t.year === year);
  return hit?.ves_por_usd ?? null;
}

function valorSerie(
  milesBs: number,
  year: number,
  moneda: 'bs' | 'usd',
  tc: TipoCambioDiciembre[]
): number | null {
  if (moneda === 'bs') return milesBs;
  const ves = vesForYear(tc, year);
  return milesBsNominalToUsdMillonesNullable(milesBs, ves);
}

/**
 * Línea gruesa: Seguros La Fe. Hasta 5 líneas adicionales: empresas con mayor peso acumulado entre las que aparecen en el top 5 en algún año (excl. La Fe).
 */
export function FunerarioEvolutionChart({
  data,
  tipoCambioDiciembre,
  moneda,
}: {
  data: FunerarioApi;
  tipoCambioDiciembre: TipoCambioDiciembre[];
  moneda: 'bs' | 'usd';
}) {
  const compact = useCompactViewport();
  const years = data.years.length ? data.years : [2022, 2023, 2024];

  const { chartRows, lineDefs } = useMemo(() => {
    const peerLabel = new Map<string, string>();
    const sumByPeer = new Map<string, number>();
    const inTop5AnyYear = new Set<string>();

    for (const y of years) {
      const rows = [...rowsForYear(data, y)].sort(
        (a, b) => b.primas_funerario_miles_bs - a.primas_funerario_miles_bs
      );
      for (const r of rows) {
        peerLabel.set(r.peer_id, r.empresa_raw);
      }
      for (const r of rows.slice(0, 5)) {
        inTop5AnyYear.add(r.peer_id);
        const prev = sumByPeer.get(r.peer_id) ?? 0;
        sumByPeer.set(r.peer_id, prev + r.primas_funerario_miles_bs);
      }
    }

    inTop5AnyYear.delete(BRAND_PEER_ID);
    const otherPeers = [...inTop5AnyYear].sort((a, b) => (sumByPeer.get(b) ?? 0) - (sumByPeer.get(a) ?? 0)).slice(0, 5);

    const keys = {
      fe: '__fe',
      others: otherPeers.map((p, i) => ({ peer: p, key: `__p${i}`, color: PALETTE[i % PALETTE.length]! })),
    };

    const chartRows = years.map((y) => {
      const row: Record<string, string | number | null> = { year: y };
      const list = rowsForYear(data, y);
      const byPeer = new Map(list.map((r) => [r.peer_id, r.primas_funerario_miles_bs]));
      const fe = byPeer.get(BRAND_PEER_ID);
      const feBs = fe != null && Number.isFinite(fe) ? fe : null;
      row[keys.fe] = feBs == null ? null : valorSerie(feBs, y, moneda, tipoCambioDiciembre);
      for (const { peer, key } of keys.others) {
        const v = byPeer.get(peer);
        const bs = v != null && Number.isFinite(v) ? v : null;
        row[key] = bs == null ? null : valorSerie(bs, y, moneda, tipoCambioDiciembre);
      }
      return row;
    });

    const lineDefs: { key: string; label: string; color: string; width: number }[] = [
      { key: keys.fe, label: BRAND_DISPLAY_NAME, color: CHART_LINE_STROKE_MARCA, width: 3 },
      ...keys.others.map((o) => ({
        key: o.key,
        label: peerLabel.get(o.peer) ?? o.peer,
        color: o.color,
        width: 2,
      })),
    ];

    return { chartRows, lineDefs };
  }, [data, years, moneda, tipoCambioDiciembre]);

  /** Eje Y lineal en USD: techo cercano al máximo mostrado (poco margen) para no desperdiciar altura del gráfico. */
  const yDomainUsd = useMemo((): [number, number] | null => {
    if (moneda !== 'usd') return null;
    const nums: number[] = [];
    for (const row of chartRows) {
      for (const d of lineDefs) {
        const v = row[d.key];
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) nums.push(v);
      }
    }
    if (nums.length === 0) return null;
    const hi = Math.max(...nums);
    return [0, hi * 1.08];
  }, [chartRows, lineDefs, moneda]);

  if (chartRows.length === 0) {
    return <p className="text-sm text-slate-500">Sin datos para el gráfico.</p>;
  }

  const ejeUsd = moneda === 'usd';

  return (
    <div className="rounded-xl border border-[#7823BD]/15 bg-[#FBF9F9] p-4 shadow-sm">
      <h3 className="text-base font-bold text-[#7823BD]">Evolución del ramo funerario (top 5 por año + {BRAND_DISPLAY_NAME})</h3>
      <p className="mt-1 text-xs text-slate-600">
        Línea destacada: <strong className="text-[#7823BD]">{BRAND_DISPLAY_NAME}</strong>. Las demás líneas corresponden a las
        empresas que más veces aparecen entre el top 5 por prima funeraria en los años mostrados (hasta cinco, excluyendo la
        marca).
        {ejeUsd ? (
          <>
            {' '}
            Escala en <strong>millones USD</strong> (tipo de cambio oficial BCV al cierre de diciembre de cada año; misma
            metodología que el BI histórico). El eje Y está <strong>acotado</strong> al máximo de las series mostradas (margen
            ~8&nbsp;%) para que el trazo no quede aplastado abajo.
          </>
        ) : (
          <> Escala en miles de bolívares nominales (eje lineal).</>
        )}
      </p>
      <div className="mt-4 h-[min(380px,55vh)] min-h-[240px] w-full sm:min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartRows}
            margin={{
              top: 8,
              right: compact ? 8 : 12,
              left: compact ? 2 : 4,
              bottom: compact ? 28 : 4,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: compact ? 10 : 11 }}
              tickFormatter={(v) => String(v)}
              label={
                compact
                  ? undefined
                  : { value: 'Año de cierre', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#64748b' }
              }
            />
            <YAxis
              domain={ejeUsd && yDomainUsd ? yDomainUsd : [0, 'auto']}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) =>
                ejeUsd ? fmtUsdMillonesShort(Number(v)) : fmtMilesShort(Number(v))
              }
              width={ejeUsd ? 52 : 56}
              label={{
                value: ejeUsd ? 'Millones USD' : 'Miles Bs. nominales',
                angle: -90,
                position: 'insideLeft',
                fontSize: 11,
                fill: '#64748b',
              }}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: `1px solid ${COLOR_BRAND_PRIMARY}33` }}
              formatter={(value: number | string) => {
                const n = typeof value === 'number' ? value : Number(value);
                if (!Number.isFinite(n)) return '—';
                if (ejeUsd) {
                  return `${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n)} millones USD`;
                }
                return `${new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(n)} miles Bs.`;
              }}
              labelFormatter={(y) => `Cierre ${y}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => <span className="text-slate-800">{value}</span>}
            />
            {lineDefs.map((d) => (
              <Line
                key={d.key}
                type="monotone"
                dataKey={d.key}
                name={d.label}
                stroke={d.key === '__fe' ? CHART_LINE_STROKE_MARCA : d.color}
                strokeWidth={d.width}
                dot={{ r: d.key === '__fe' ? 6 : 4, fill: d.key === '__fe' ? COLOR_BRAND_GOLD : d.color }}
                activeDot={{ r: d.key === '__fe' ? 8 : 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {compact ? (
        <p className="mt-1 text-center text-[10px] text-slate-500">Eje horizontal: año de cierre del cuadro.</p>
      ) : null}
    </div>
  );
}
