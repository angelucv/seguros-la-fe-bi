import { useEffect, useMemo, useState } from 'react';
import { fetchApiJson } from '@/lib/apiFetch';
import { cn } from '@/lib/utils';
import { BRAND_DISPLAY_NAME, BRAND_PEER_ID } from '../../../lib/bi/config';

export type ResultadoPayload = {
  etiquetaCorte: string;
  notaRank: string;
  disp: {
    ranking_boletin: number;
    peer_id: string;
    empresa_raw: string;
    rt_bruto_miles_bs: number | null;
    reaseguro_cedido_miles_bs: number | null;
    rt_neto_miles_bs: number | null;
    gestion_general_miles_bs: number | null;
    saldo_operaciones_miles_bs: number | null;
    pnc_miles_bs: number | null;
    pct_saldo_sobre_pnc: number | null;
  }[];
  /** Lo sigue enviando la API; ya no se usa en la UI. */
  chart?: { labels: string[]; values: number[]; colors: string[]; text: string[] };
};

type DispRow = ResultadoPayload['disp'][number];

function fmtMiles(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const neg = n < 0;
  const v = Math.abs(n);
  const [intp, frac] = v.toFixed(2).split('.');
  const intWith = intp!.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + `${intWith},${frac}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(2).replace('.', ',');
}

/** Etiqueta legible tipo «Marzo 2026» a partir de ISO (fecha de corte del cuadro). */
function mesAnioCorte(iso: string): string {
  if (!iso || iso.length < 7) return iso;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const s = d.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function MilesCell({ value }: { value: number | null }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="text-slate-400">—</span>;
  }
  const neg = value < 0;
  const s = fmtMiles(value);
  return <span className={`tabular-nums ${neg ? 'font-medium text-red-700' : ''}`}>{s}</span>;
}

function PctCell({ value }: { value: number | null }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="text-slate-400">—</span>;
  }
  const neg = value < 0;
  const s = fmtPct(value);
  return <span className={`tabular-nums ${neg ? 'font-medium text-red-700' : ''}`}>{s}</span>;
}

/** Resalta Seguros La Fe por `peer_id` o por nombre comercial típico. */
function isMarcaLaFe(r: DispRow): boolean {
  if (r.peer_id === BRAND_PEER_ID) return true;
  const n = r.empresa_raw.toLowerCase();
  return (n.includes('la fe') || n.includes('la fé')) && n.includes('seguros');
}

function rowClasses(marca: boolean, zebra: boolean): { rowBg: string; stickyBg: string } {
  if (marca) {
    return {
      rowBg:
        'bg-gradient-to-r from-[#FFC857]/40 via-[#FFC857]/22 to-violet-50/80 ring-1 ring-inset ring-[#7823BD]/35 shadow-[inset_4px_0_0_0_#7823BD]',
      stickyBg:
        'bg-gradient-to-r from-[#FFC857]/45 via-[#FFC857]/28 to-violet-50/85 ring-1 ring-inset ring-[#7823BD]/35 shadow-[inset_4px_0_0_0_#7823BD]',
    };
  }
  const rowBg = zebra ? 'bg-slate-50' : 'bg-white';
  const stickyBg = zebra ? 'bg-slate-50' : 'bg-white';
  return { rowBg, stickyBg };
}

export function ResultadoTecnicoSection({
  title,
  fechRef,
  cortes,
  defaultCorte,
  initial,
  rankingScope = 'top5',
}: {
  title: string;
  fechRef: string;
  cortes: { value: string; label: string }[];
  defaultCorte: string;
  initial: ResultadoPayload | null;
  /** `bandaPnc`: filas del ranking #15–#30 (+ marca si aplica), coherente con el dashboard de Inicio. */
  rankingScope?: 'top5' | 'bandaPnc';
}) {
  const [ts, setTs] = useState(defaultCorte);
  const [payload, setPayload] = useState<ResultadoPayload | null>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTs(defaultCorte);
    setPayload(initial);
  }, [defaultCorte, initial]);

  async function applyCorte(nextTs: string) {
    setTs(nextTs);
    if (nextTs === defaultCorte && initial) {
      setPayload(initial);
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams({ fechRef, ts: nextTs });
      if (rankingScope === 'bandaPnc') q.set('scope', 'bandaPnc');
      const j = await fetchApiJson<ResultadoPayload>(`/api/bi/resultado?${q}`);
      if (j?.disp) setPayload(j);
    } catch {
      /* mantiene payload anterior */
    } finally {
      setLoading(false);
    }
  }

  const rankingPorPct = useMemo(() => {
    if (!payload?.disp.length) return [];
    return [...payload.disp]
      .filter((r) => r.pct_saldo_sobre_pnc != null && Number.isFinite(r.pct_saldo_sobre_pnc))
      .sort((a, b) => {
        const va = a.pct_saldo_sobre_pnc ?? -Infinity;
        const vb = b.pct_saldo_sobre_pnc ?? -Infinity;
        if (vb !== va) return vb - va;
        return a.empresa_raw.localeCompare(b.empresa_raw, 'es');
      });
  }, [payload?.disp]);

  const maxPctSaldo = useMemo(() => {
    if (!rankingPorPct.length) return 1;
    const m = Math.max(
      ...rankingPorPct.map((r) => Math.abs(r.pct_saldo_sobre_pnc ?? 0)),
      1e-6
    );
    return m * 1.08;
  }, [rankingPorPct]);

  /** Valor del indicador para Seguros La Fe en este corte (tabla / barras). */
  const pctSaldoLaFe = useMemo(() => {
    for (const r of rankingPorPct) {
      if (isMarcaLaFe(r)) return r.pct_saldo_sobre_pnc ?? null;
    }
    if (!payload?.disp) return null;
    const r = payload.disp.find((row) => isMarcaLaFe(row));
    return r?.pct_saldo_sobre_pnc != null && Number.isFinite(r.pct_saldo_sobre_pnc) ? r.pct_saldo_sobre_pnc : null;
  }, [rankingPorPct, payload?.disp]);

  if (!payload) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        No hay información de resultado técnico disponible para mostrar en este momento.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <h3 className="text-base font-bold text-[#7823BD]">{title}</h3>
      <div className="rounded-2xl border-2 border-[#7823BD]/25 bg-gradient-to-br from-[#7823BD]/8 to-white px-4 py-4 shadow-sm sm:px-5">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Cierre del cuadro de resultados
        </p>
        <p className="mt-1 text-center text-2xl font-bold tracking-tight text-[#7823BD] sm:text-3xl">
          {mesAnioCorte(ts)}
        </p>
        <p className="mt-2 text-center text-xs text-slate-600">
          {rankingScope === 'bandaPnc'
            ? 'Las tablas muestran el mismo grupo de aseguradoras: tramo intermedio por volumen de prima neta, más Seguros La Fe para seguimiento.'
            : 'Las tablas muestran el mismo grupo: las aseguradoras con mayor prima neta en este cierre.'}
        </p>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Cambiar periodo de cierre
        <select
          className="mt-1 w-full max-w-xl rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={ts}
          onChange={(e) => void applyCorte(e.target.value)}
          disabled={loading}
        >
          {cortes.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      {payload.notaRank ? (
        <p className="text-xs leading-relaxed text-slate-500">{payload.notaRank}</p>
      ) : null}

      {/* Tabla 1: hasta Saldo de operaciones */}
      <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white shadow-md ring-1 ring-slate-200/60">
        <div className="border-b border-slate-200/80 px-4 pb-3 pt-4 sm:px-5">
          <h4 className="text-sm font-bold text-[#7823BD]">Resultado técnico (miles de Bs.)</h4>
          <p className="mt-1 text-xs text-slate-500">
            Componentes del cuadro hasta <strong>saldo de operaciones</strong>.
          </p>
        </div>
        <div className="overflow-x-auto p-3 sm:p-4 sm:pt-2">
          <table className="w-full min-w-[min(100%,520px)] border-separate border-spacing-0 text-xs text-slate-800">
            <thead className="text-white">
              <tr>
                <th className="sticky top-0 left-0 z-[45] w-11 min-w-[2.75rem] whitespace-nowrap bg-[#7823BD] px-2 py-2.5 text-left text-[11px] font-semibold shadow-[2px_0_8px_-4px_rgba(0,0,0,0.35)] sm:px-2.5">
                  # PNC
                </th>
                <th className="sticky top-0 left-11 z-[45] min-w-[9rem] max-w-[14rem] bg-[#7823BD] px-2 py-2.5 text-left text-[11px] font-semibold shadow-[2px_0_8px_-4px_rgba(0,0,0,0.35)] sm:min-w-[11rem] sm:px-2.5">
                  Empresa
                </th>
                <th className="sticky top-0 z-40 bg-[#7823BD] px-2 py-2.5 text-right text-[11px] font-semibold shadow-[0_1px_0_0_rgba(255,255,255,0.15)] sm:px-2.5">
                  RT neto
                </th>
                <th className="sticky top-0 z-40 bg-[#7823BD] px-2 py-2.5 text-right text-[11px] font-semibold shadow-[0_1px_0_0_rgba(255,255,255,0.15)] sm:px-2.5">
                  Gest. gral.
                </th>
                <th className="sticky top-0 z-40 bg-[#7823BD] px-2 py-2.5 text-right text-[11px] font-semibold shadow-[0_1px_0_0_rgba(255,255,255,0.15)] sm:px-2.5">
                  Saldo op.
                </th>
              </tr>
            </thead>
            <tbody>
              {payload.disp.map((r, idx) => {
                const marca = isMarcaLaFe(r);
                const zebra = idx % 2 === 1;
                const { rowBg, stickyBg } = rowClasses(marca, zebra);
                return (
                  <tr key={`t1-${r.ranking_boletin}-${r.peer_id}`} className="border-b border-slate-100">
                    <td
                      className={`sticky left-0 z-10 w-11 min-w-[2.75rem] whitespace-nowrap border-b border-slate-100 px-2 py-2 font-mono tabular-nums shadow-[2px_0_8px_-4px_rgba(15,23,42,0.12)] sm:px-2.5 ${stickyBg}`}
                    >
                      {r.ranking_boletin}
                    </td>
                    <td
                      className={`sticky left-11 z-10 max-w-[14rem] border-b border-slate-100 px-2 py-2 shadow-[2px_0_8px_-4px_rgba(15,23,42,0.1)] sm:px-2.5 ${stickyBg}`}
                      title={r.empresa_raw}
                    >
                      <span
                        className={`block max-w-[12rem] truncate sm:max-w-[14rem] ${marca ? 'font-semibold text-[#7823BD]' : ''}`}
                      >
                        {r.empresa_raw}
                      </span>
                    </td>
                    <td className={`border-b border-slate-100 px-2 py-2 text-right font-mono sm:px-2.5 ${rowBg}`}>
                      <MilesCell value={r.rt_neto_miles_bs} />
                    </td>
                    <td className={`border-b border-slate-100 px-2 py-2 text-right font-mono sm:px-2.5 ${rowBg}`}>
                      <MilesCell value={r.gestion_general_miles_bs} />
                    </td>
                    <td className={`border-b border-slate-100 px-2 py-2 text-right font-mono sm:px-2.5 ${rowBg}`}>
                      <MilesCell value={r.saldo_operaciones_miles_bs} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Leyenda</p>
          <dl className="mt-2 grid gap-2 text-[11px] text-slate-600 sm:grid-cols-3">
            <div>
              <dt className="font-mono font-semibold text-[#7823BD]">RT neto</dt>
              <dd>Resultado técnico neto (miles de Bs.).</dd>
            </div>
            <div>
              <dt className="font-mono font-semibold text-[#7823BD]">Gest. gral.</dt>
              <dd>Gestión general.</dd>
            </div>
            <div>
              <dt className="font-mono font-semibold text-[#7823BD]">Saldo op.</dt>
              <dd>Saldo de operaciones.</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Tabla 2: Saldo op., PNC, % Saldo/PNC */}
      <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white shadow-md ring-1 ring-slate-200/60">
        <div className="border-b border-slate-200/80 px-4 pb-3 pt-4 sm:px-5">
          <h4 className="text-sm font-bold text-[#7823BD]">Saldo, PNC y ratio</h4>
          <p className="mt-1 text-xs text-slate-500">
            Saldo de operaciones, primas netas cobradas y porcentaje <strong>% Saldo / PNC</strong> del mismo corte.
          </p>
        </div>
        <div className="overflow-x-auto p-3 sm:p-4 sm:pt-2">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 text-xs text-slate-800">
            <thead className="text-white">
              <tr>
                <th className="sticky top-0 left-0 z-[45] w-11 min-w-[2.75rem] whitespace-nowrap bg-[#7823BD] px-2 py-2.5 text-left text-[11px] font-semibold shadow-[2px_0_8px_-4px_rgba(0,0,0,0.35)] sm:px-2.5">
                  # PNC
                </th>
                <th className="sticky top-0 left-11 z-[45] min-w-[9rem] max-w-[14rem] bg-[#7823BD] px-2 py-2.5 text-left text-[11px] font-semibold shadow-[2px_0_8px_-4px_rgba(0,0,0,0.35)] sm:min-w-[11rem] sm:px-2.5">
                  Empresa
                </th>
                <th className="sticky top-0 z-40 bg-[#7823BD] px-2 py-2.5 text-right text-[11px] font-semibold shadow-[0_1px_0_0_rgba(255,255,255,0.15)] sm:px-2.5">
                  Saldo op.
                </th>
                <th className="sticky top-0 z-40 bg-[#7823BD] px-2 py-2.5 text-right text-[11px] font-semibold shadow-[0_1px_0_0_rgba(255,255,255,0.15)] sm:px-2.5">
                  PNC
                </th>
                <th className="sticky top-0 z-40 bg-[#7823BD] px-2 py-2.5 text-right text-[11px] font-semibold shadow-[0_1px_0_0_rgba(255,255,255,0.15)] sm:px-2.5">
                  % Saldo/PNC
                </th>
              </tr>
            </thead>
            <tbody>
              {payload.disp.map((r, idx) => {
                const marca = isMarcaLaFe(r);
                const zebra = idx % 2 === 1;
                const { rowBg, stickyBg } = rowClasses(marca, zebra);
                return (
                  <tr key={`t2-${r.ranking_boletin}-${r.peer_id}`} className="border-b border-slate-100">
                    <td
                      className={`sticky left-0 z-10 w-11 min-w-[2.75rem] whitespace-nowrap border-b border-slate-100 px-2 py-2 font-mono tabular-nums shadow-[2px_0_8px_-4px_rgba(15,23,42,0.12)] sm:px-2.5 ${stickyBg}`}
                    >
                      {r.ranking_boletin}
                    </td>
                    <td
                      className={`sticky left-11 z-10 max-w-[14rem] border-b border-slate-100 px-2 py-2 shadow-[2px_0_8px_-4px_rgba(15,23,42,0.1)] sm:px-2.5 ${stickyBg}`}
                      title={r.empresa_raw}
                    >
                      <span
                        className={`block max-w-[12rem] truncate sm:max-w-[14rem] ${marca ? 'font-semibold text-[#7823BD]' : ''}`}
                      >
                        {r.empresa_raw}
                      </span>
                    </td>
                    <td className={`border-b border-slate-100 px-2 py-2 text-right font-mono sm:px-2.5 ${rowBg}`}>
                      <MilesCell value={r.saldo_operaciones_miles_bs} />
                    </td>
                    <td className={`border-b border-slate-100 px-2 py-2 text-right font-mono sm:px-2.5 ${rowBg}`}>
                      <MilesCell value={r.pnc_miles_bs} />
                    </td>
                    <td className={`border-b border-slate-100 px-2 py-2 text-right font-mono sm:px-2.5 ${rowBg}`}>
                      <PctCell value={r.pct_saldo_sobre_pnc} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Leyenda</p>
          <dl className="mt-2 grid gap-2 text-[11px] text-slate-600 sm:grid-cols-3">
            <div>
              <dt className="font-mono font-semibold text-[#7823BD]">Saldo op.</dt>
              <dd>Saldo de operaciones (miles de Bs.).</dd>
            </div>
            <div>
              <dt className="font-mono font-semibold text-[#7823BD]">PNC</dt>
              <dd>Primas netas cobradas (miles de Bs.).</dd>
            </div>
            <div>
              <dt className="font-mono font-semibold text-[#7823BD]">% Saldo/PNC</dt>
              <dd>Saldo de operaciones sobre PNC en el mismo corte.</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Comparativa visual % Saldo/PNC */}
      {rankingPorPct.length > 0 && (
        <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-4 shadow-md ring-1 ring-slate-100 sm:px-5">
          <h4 className="text-center text-base font-bold text-[#7823BD]">Comparativa de % Saldo / PNC</h4>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600 sm:text-[13px]">
            <p>
              En esencia es un <strong>margen sobre ventas</strong> del negocio asegurador:{' '}
              <strong>(saldo de operaciones ÷ PNC) × 100</strong> en el mismo corte —una{' '}
              <strong>rentabilidad o margen técnico</strong> que indica cuánto resultado técnico (saldo) se obtiene por cada
              unidad monetaria de <strong>primas netas cobradas</strong>. Refleja el <strong>core</strong> (emitir pólizas y
              cubrir siniestros hasta ese saldo), no el resultado de inversiones financieras ni otros rubros fuera del
              técnico.
            </p>
            <p>
              <strong className="text-slate-800">Por qué no comparar solo el saldo en bolívares.</strong> El monto absoluto
              favorece siempre a quien más prima cobra. <strong>Dividir entre la PNC</strong> quita ese sesgo de tamaño: se
              mide <strong>eficiencia relativa</strong>, no volumen. Las barras ordenan ese % entre las mismas empresas que
              las tablas (franja de prima comparable).
            </p>
            {pctSaldoLaFe != null && Number.isFinite(pctSaldoLaFe) ? (
              <div className="rounded-lg border border-[#7823BD]/20 bg-[#7823BD]/5 px-3 py-2.5 text-center">
                <p>
                  <strong className="text-[#7823BD]">{BRAND_DISPLAY_NAME}</strong> en este cierre:{' '}
                  <span className="font-mono text-base font-bold tabular-nums text-slate-900">
                    {fmtPct(pctSaldoLaFe)}%
                  </span>{' '}
                  de saldo de operaciones sobre PNC.
                </p>
                <p className="mt-2 text-[11px] leading-snug text-slate-700">
                  {pctSaldoLaFe >= 0 ? (
                    <>
                      Por cada <strong>100</strong> unidades monetarias que <strong>{BRAND_DISPLAY_NAME}</strong> ingresa por
                      concepto de <strong>primas netas cobradas (PNC)</strong>, le quedan{' '}
                      <strong className="font-mono tabular-nums text-slate-900">{fmtPct(pctSaldoLaFe)}</strong> unidades de{' '}
                      <strong>ganancia operativa limpia</strong> en términos de <strong>saldo de operaciones</strong> del mismo
                      cierre (resultado técnico; sin inversiones financieras).
                    </>
                  ) : (
                    <>
                      Por cada <strong>100</strong> unidades monetarias de <strong>PNC</strong>, el <strong>saldo de operaciones</strong>{' '}
                      del mismo cierre es de <strong className="font-mono tabular-nums text-slate-900">{fmtPct(pctSaldoLaFe)}</strong>{' '}
                      unidades (margen técnico negativo en este periodo).
                    </>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-center text-slate-500">
                No hay dato de {BRAND_DISPLAY_NAME} en este grupo para el indicador.
              </p>
            )}
          </div>
          <div className="mt-5 space-y-3">
            {rankingPorPct.map((r) => {
              const marca = isMarcaLaFe(r);
              const pct = r.pct_saldo_sobre_pnc ?? 0;
              const w = Math.min(100, (Math.abs(pct) / maxPctSaldo) * 100);
              return (
                <div
                  key={`bar-${r.peer_id}`}
                  className={cn(
                    'rounded-xl border border-transparent px-2 py-2 sm:px-3',
                    marca && 'border-[#FFC857] bg-[#FFC857]/10 ring-1 ring-[#FFC857]/50'
                  )}
                >
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                    <div
                      className="max-w-[min(100%,14rem)] truncate text-xs font-medium text-slate-800 sm:w-[13rem] sm:max-w-[13rem] sm:shrink-0"
                      title={r.empresa_raw}
                    >
                      {r.empresa_raw}
                      {marca ? (
                        <span className="ml-1.5 rounded bg-[#FFC857]/50 px-1.5 py-0.5 text-[10px] font-bold text-[#7823BD]">
                          {BRAND_DISPLAY_NAME}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div className="h-8 min-w-0 flex-1 overflow-hidden rounded-lg bg-slate-100">
                        <div
                          className={cn(
                            'h-full rounded-lg transition-[width] duration-500',
                            marca
                              ? 'bg-gradient-to-r from-[#FFC857] via-amber-400 to-[#7823BD]/90'
                              : 'bg-[#7823BD]/85'
                          )}
                          style={{ width: `${w}%` }}
                        />
                      </div>
                      <span className="w-[4.25rem] shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-slate-800">
                        {fmtPct(pct)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
