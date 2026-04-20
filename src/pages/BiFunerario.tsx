import { Fragment, useEffect, useMemo, useState } from 'react';
import { fetchApiJson } from '@/lib/apiFetch';
import { milesBsNominalToUsdMillonesNullable } from '@/lib/bi/fxEngine';
import { BRAND_DISPLAY_NAME, BRAND_PEER_ID } from '@/lib/bi/config';
import { cn } from '@/lib/utils';
import { FunerarioEvolutionChart } from '../components/bi/FunerarioEvolutionChart';
import { FunerarioParticipacionPies } from '../components/bi/FunerarioParticipacionPies';
import { ExecLead, ExecMobileStrip } from '../components/bi/ExecutiveCopy';
import { partitionLaFeFirst } from '@/lib/bi/brandRows';

type FunerarioRow = {
  ranking_funerario: number;
  empresa_raw: string;
  peer_id: string;
  primas_funerario_miles_bs: number;
  primas_total_personas_miles_bs: number;
  pagina_pdf: string;
  year: number;
  archivo_fuente: string;
};

type TipoCambioDiciembreRow = {
  year: number;
  ves_por_usd: number | null;
};

type FunerarioApi = {
  years: number[];
  byYear: Record<string, FunerarioRow[]>;
  tipoCambioDiciembre?: TipoCambioDiciembreRow[];
  sourceFile: string;
  dataDir: string;
  generatedAt: string;
  error?: string;
};

function rowsForYear(api: FunerarioApi, year: number): FunerarioRow[] {
  return api.byYear[String(year)] ?? [];
}

/** Tabla: lectura clara sin exceso de decimales. */
function fmtMilesTabla(n: number): string {
  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(n);
}

function fmtUsdTabla(n: number): string {
  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

function fmtPctTabla(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(n)}\u00A0%`;
}

function vesPorAno(tc: TipoCambioDiciembreRow[], year: number): number | null {
  return tc.find((t) => t.year === year)?.ves_por_usd ?? null;
}

type FunerarioMatrix = {
  years: number[];
  totals: Record<number, number>;
  peers: string[];
  cell: Map<
    string,
    { label: string; byYear: Record<number, { prima: number; rank: number; pct: number } | undefined> }
  >;
};

function FunerarioAnioCeldas({
  y,
  c,
  mostrarUsd,
  tipo,
}: {
  y: number;
  c: { prima: number; rank: number; pct: number } | undefined;
  mostrarUsd: boolean;
  tipo: TipoCambioDiciembreRow[];
}) {
  const ves = vesPorAno(tipo, y);
  const usd = c && mostrarUsd ? milesBsNominalToUsdMillonesNullable(c.prima, ves) : null;
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center">
      <p className="text-[10px] font-semibold text-slate-500">{y}</p>
      <p className="mt-0.5 font-mono text-[12px] text-slate-900">
        {!c ? '—' : mostrarUsd ? (usd != null ? `${fmtUsdTabla(usd)} USD` : '—') : `${fmtMilesTabla(c.prima)} m.Bs.`}
      </p>
      <p className="text-[10px] text-slate-600">{c ? fmtPctTabla(c.pct) : '—'}</p>
      {c ? <p className="text-[9px] text-slate-400">Rank #{c.rank}</p> : null}
    </div>
  );
}

function FunerarioDetalleMovil({
  matrix,
  tipo,
  mostrarUsd,
}: {
  matrix: FunerarioMatrix;
  tipo: TipoCambioDiciembreRow[];
  mostrarUsd: boolean;
}) {
  const { marca: pidMarca, rest } = partitionLaFeFirst(matrix.peers, (p) => p === BRAND_PEER_ID);
  const entryMarca = pidMarca ? matrix.cell.get(pidMarca) : undefined;
  return (
    <div className="space-y-3 md:hidden">
      {pidMarca && entryMarca ? (
        <div className="rounded-2xl border-2 border-[#7823BD]/40 bg-gradient-to-br from-[#FFC857]/30 via-white to-violet-50/50 p-4 shadow-lg ring-1 ring-[#7823BD]/15">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#7823BD]">{BRAND_DISPLAY_NAME}</p>
          <p className="mt-1 text-center text-[11px] text-slate-500">Prima funeraria y participación por año</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {matrix.years.map((y) => (
              <FunerarioAnioCeldas key={y} y={y} c={entryMarca.byYear[y]} mostrarUsd={mostrarUsd} tipo={tipo} />
            ))}
          </div>
        </div>
      ) : null}
      {rest.map((peerId) => {
        const entry = matrix.cell.get(peerId)!;
        return (
          <div key={peerId} className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[12px] font-semibold leading-snug text-slate-800">{entry.label}</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {matrix.years.map((y) => (
                <FunerarioAnioCeldas key={y} y={y} c={entry.byYear[y]} mostrarUsd={mostrarUsd} tipo={tipo} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BiFunerario() {
  const [data, setData] = useState<FunerarioApi | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [moneda, setMoneda] = useState<'bs' | 'usd'>('usd');

  useEffect(() => {
    fetchApiJson<FunerarioApi>('/api/bi/funerario')
      .then(setData)
      .catch((e: unknown) => setErr(String(e)));
  }, []);

  const matrix = useMemo(() => {
    if (!data || data.error) return null;
    const years = data.years.length ? data.years : [2022, 2023, 2024];
    const totals: Record<number, number> = {};
    const cell = new Map<
      string,
      { label: string; byYear: Record<number, { prima: number; rank: number; pct: number } | undefined> }
    >();

    for (const y of years) {
      const rows = rowsForYear(data, y);
      const sum = rows.reduce((s, r) => s + r.primas_funerario_miles_bs, 0);
      totals[y] = sum;
      for (const r of rows) {
        const pct = sum > 0 ? (r.primas_funerario_miles_bs / sum) * 100 : 0;
        let entry = cell.get(r.peer_id);
        if (!entry) {
          entry = { label: r.empresa_raw, byYear: {} };
          cell.set(r.peer_id, entry);
        }
        entry.byYear[y] = {
          prima: r.primas_funerario_miles_bs,
          rank: r.ranking_funerario,
          pct,
        };
      }
    }

    for (const peerId of cell.keys()) {
      const withData = years.filter((y) => cell.get(peerId)?.byYear[y] != null);
      const yLatest = withData.length ? Math.max(...withData) : null;
      if (yLatest != null) {
        const row = rowsForYear(data, yLatest).find((r) => r.peer_id === peerId);
        if (row) cell.get(peerId)!.label = row.empresa_raw;
      }
    }

    const peers = [...cell.keys()].sort((a, b) => {
      if (a === BRAND_PEER_ID) return -1;
      if (b === BRAND_PEER_ID) return 1;
      const sumA = years.reduce((s, y) => s + (cell.get(a)?.byYear[y]?.prima ?? 0), 0);
      const sumB = years.reduce((s, y) => s + (cell.get(b)?.byYear[y]?.prima ?? 0), 0);
      return sumB - sumA;
    });

    return { years, totals, peers, cell };
  }, [data]);

  const years = data?.years.length ? data.years : [2022, 2023, 2024];
  const tipo = data?.tipoCambioDiciembre ?? [];
  const tcCompleto = useMemo(
    () => years.every((y) => tipo.some((t) => t.year === y && t.ves_por_usd != null)),
    [years, tipo]
  );

  const mostrarUsd = moneda === 'usd' && tcCompleto;

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!data) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="h-6 w-48 rounded bg-slate-200" />
        <div className="h-40 rounded bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <ExecMobileStrip>
        Ramo funerario · Cuadro 5-A SUDEASEG · Bs. o USD (TC BCV diciembre)
      </ExecMobileStrip>
      <header className="space-y-2">
        <h2 className="text-base font-semibold text-[#7823BD] sm:text-lg">BI Funerario</h2>
        <ExecLead
          shortMobile={
            <>
              Primas del ramo <strong>Funerarios</strong> (Cuadro 5-A, SUDEASEG). <strong>Bs.</strong> o <strong>USD</strong> con
              BCV a cierre de diciembre. El % de participación es el mismo en ambas monedas.
            </>
          }
        >
          <p className="text-sm leading-relaxed text-slate-600">
            Primas netas cobradas en el ramo <strong>Funerarios</strong> (seguros de personas, seguro directo), según el{' '}
            <strong>Cuadro 5-A</strong> de las publicaciones «Seguro en cifras» (SUDEASEG). Puede ver los importes en{' '}
            <strong>miles de bolívares nominales</strong> o convertidos a <strong>dólares estadounidenses</strong> con el tipo de
            cambio oficial del BCV al <strong>cierre de diciembre</strong> de cada año (misma serie que el resto del tablero). El
            porcentaje no cambia al pasar a USD (es la participación sobre el total funerario del cuadro).
          </p>
        </ExecLead>
        {tipo.length > 0 && (
          <>
            <p className="hidden text-xs text-slate-600 md:block">
              <span className="font-medium text-slate-700">Tipo de cambio BCV (VES por USD, cierre dic.): </span>
              {tipo
                .filter((t) => years.includes(t.year))
                .map((t) =>
                  t.ves_por_usd != null
                    ? `${t.year}: ${new Intl.NumberFormat('es-VE', { maximumFractionDigits: 4 }).format(t.ves_por_usd)}`
                    : `${t.year}: —`
                )
                .join(' · ')}
            </p>
            <p className="text-xs text-slate-600 md:hidden">
              <span className="font-medium text-slate-700">TC BCV (dic., VES/USD): </span>
              {tipo
                .filter((t) => years.includes(t.year))
                .map((t) =>
                  t.ves_por_usd != null
                    ? `${t.year}: ${new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(t.ves_por_usd)}`
                    : `${t.year}: —`
                )
                .join(' · ')}
            </p>
          </>
        )}
        {data.error ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">{data.error}</p>
        ) : null}
      </header>

      {!data.error && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <span className="font-semibold text-slate-700">Unidades:</span>
          <label className="inline-flex cursor-pointer items-center gap-2 text-slate-800">
            <input
              type="radio"
              name="fun-moneda"
              className="accent-[#7823BD]"
              checked={mostrarUsd}
              disabled={!tcCompleto}
              onChange={() => tcCompleto && setMoneda('usd')}
            />
            Millones USD (TC BCV dic.)
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-slate-800">
            <input
              type="radio"
              name="fun-moneda"
              className="accent-[#7823BD]"
              checked={!mostrarUsd}
              onChange={() => setMoneda('bs')}
            />
            Miles Bs. nominales
          </label>
          {!tcCompleto && (
            <span className="text-xs text-amber-800">
              Falta tipo de cambio de cierre de diciembre para algún año; solo se muestran bolívares.
            </span>
          )}
        </div>
      )}

      {!data.error && (
        <FunerarioEvolutionChart
          data={{ years: matrix?.years ?? years, byYear: data.byYear }}
          tipoCambioDiciembre={tipo}
          moneda={mostrarUsd ? 'usd' : 'bs'}
        />
      )}

      {!data.error && (
        <FunerarioParticipacionPies
          data={{ years: matrix?.years ?? years, byYear: data.byYear }}
          tipoCambioDiciembre={tipo}
          moneda={mostrarUsd ? 'usd' : 'bs'}
        />
      )}

      {!data.error && matrix && (
        <section className="space-y-3">
          <h3 className="text-base font-bold text-[#7823BD]">
            Detalle por empresa ({mostrarUsd ? 'millones USD y %' : 'miles Bs. y %'} sobre total funerario)
          </h3>
          <p className="text-[10px] leading-snug text-slate-500 md:hidden">
            Vista móvil: primero <strong>{BRAND_DISPLAY_NAME}</strong>, después el resto de empresas. En escritorio, tabla
            completa con desplazamiento horizontal.
          </p>
          <FunerarioDetalleMovil matrix={matrix} tipo={tipo} mostrarUsd={mostrarUsd} />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total ramo funerario (cuadro)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {matrix.years.map((y) => {
                const totalMiles = matrix.totals[y] ?? 0;
                const ves = vesPorAno(tipo, y);
                const totalUsd = mostrarUsd ? milesBsNominalToUsdMillonesNullable(totalMiles, ves) : null;
                return (
                  <span
                    key={y}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] text-slate-700 shadow-sm"
                  >
                    <strong>{y}:</strong>
                    {mostrarUsd ? (
                      totalUsd != null ? (
                        <span className="font-mono">{fmtUsdTabla(totalUsd)} M USD</span>
                      ) : (
                        '—'
                      )
                    ) : (
                      <span className="font-mono">{fmtMilesTabla(totalMiles)} m.Bs.</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="hidden md:block">
            <div className="bi-table-scroll rounded-xl border border-slate-200 shadow-sm">
            <table className="w-max min-w-[720px] max-w-none border-collapse text-left text-xs">
              <caption className="caption-bottom px-2 pb-2 pt-3 text-left text-[11px] text-slate-500">
                Cada año: prima del ramo funerarios y participación sobre la suma de primas funerarias del cuadro en ese
                cierre.
                {mostrarUsd ? ' Los importes en USD usan el tipo de cambio de diciembre de ese año.' : ''}
              </caption>
              <thead className="bg-slate-100">
                <tr>
                  <th
                    className="max-md:relative max-md:left-auto max-md:z-auto max-md:shadow-none md:sticky md:left-0 md:z-10 md:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] border-b border-slate-200 bg-slate-100 px-2 py-2"
                    rowSpan={2}
                  >
                    Empresa
                  </th>
                  {matrix.years.map((y) => (
                    <th key={y} className="border-b border-slate-200 px-2 py-2 text-center" colSpan={2}>
                      {y}
                    </th>
                  ))}
                </tr>
                <tr>
                  {matrix.years.map((y) => (
                    <Fragment key={`${y}-sub`}>
                      <th className="border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-right font-normal text-slate-600">
                        {mostrarUsd ? 'Millones USD' : 'Miles Bs.'}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-right font-normal text-slate-600">
                        % total
                      </th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.peers.map((peerId) => {
                  const entry = matrix.cell.get(peerId)!;
                  const marca = peerId === BRAND_PEER_ID;
                  return (
                    <tr
                      key={peerId}
                      className={cn(
                        marca
                          ? 'bg-[#FFC857]/15 font-medium ring-1 ring-inset ring-[#7823BD]/20'
                          : 'odd:bg-white even:bg-slate-50'
                      )}
                    >
                      <td className="max-md:relative max-md:left-auto max-md:z-0 max-md:shadow-none md:sticky md:left-0 md:z-[1] border-b border-slate-100 bg-inherit px-2 py-1.5 align-top md:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]">
                        <span className="block min-w-0 max-w-[10rem] break-words leading-snug md:max-w-none">
                          {marca ? (
                            <span className="font-semibold text-[#7823BD]">{BRAND_DISPLAY_NAME}</span>
                          ) : (
                            entry.label
                          )}
                        </span>
                      </td>
                      {matrix.years.map((y) => {
                        const c = entry.byYear[y];
                        const ves = vesPorAno(tipo, y);
                        const usd =
                          c && mostrarUsd ? milesBsNominalToUsdMillonesNullable(c.prima, ves) : null;
                        return (
                          <Fragment key={`${peerId}-${y}`}>
                            <td className="border-b border-slate-100 px-2 py-1.5 text-right font-mono tabular-nums">
                              {!c
                                ? '—'
                                : mostrarUsd
                                  ? usd != null
                                    ? fmtUsdTabla(usd)
                                    : '—'
                                  : fmtMilesTabla(c.prima)}
                            </td>
                            <td className="whitespace-nowrap border-b border-slate-100 px-2 py-1.5 text-right font-mono tabular-nums text-slate-700">
                              {c ? fmtPctTabla(c.pct) : '—'}
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-semibold text-slate-800">
                  <td className="max-md:relative max-md:left-auto max-md:z-0 max-md:shadow-none md:sticky md:left-0 md:z-[1] border-t border-slate-200 bg-slate-100 px-2 py-2 md:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]">
                    Total (cuadro)
                  </td>
                  {matrix.years.map((y) => {
                    const totalMiles = matrix.totals[y] ?? 0;
                    const ves = vesPorAno(tipo, y);
                    const totalUsd = mostrarUsd ? milesBsNominalToUsdMillonesNullable(totalMiles, ves) : null;
                    return (
                      <td key={`tot-${y}`} className="border-t border-slate-200 px-2 py-2 text-right font-mono" colSpan={2}>
                        {mostrarUsd ? (
                          totalUsd != null ? (
                            <>{fmtUsdTabla(totalUsd)} millones USD</>
                          ) : (
                            '—'
                          )
                        ) : (
                          <>{fmtMilesTabla(totalMiles)} miles Bs.</>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        </section>
      )}

      <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-[#7823BD]">Nota metodológica</summary>
        <p className="mt-2 text-xs leading-relaxed">
          Prima funeraria sobre el total del ramo en cada año. USD: bolívares nominales al tipo BCV de diciembre de ese año.
          Fuentes: publicaciones estadísticas SUDEASEG (series y anuario).
        </p>
      </details>
    </div>
  );
}
