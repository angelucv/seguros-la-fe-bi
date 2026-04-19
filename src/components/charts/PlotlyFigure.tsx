import { useEffect, useRef } from 'react';
import type { Data, Layout, Config } from 'plotly.js';
import type PlotlyType from 'plotly.js';
import { BRAND_PEER_ID } from '../../../lib/bi/config';

function transicionEntrada(data: Data[]): NonNullable<Layout['transition']> {
  const hasBar = data.some((d) => d.type === 'bar');
  const hasPie = data.some((d) => d.type === 'pie');
  if (hasBar) return { duration: 2000, easing: 'back-out' };
  if (hasPie) return { duration: 1950, easing: 'elastic-out' };
  return { duration: 1700, easing: 'elastic-out' };
}

/** Entre pasos de línea: suficientemente largo para que el ojo vea el movimiento. */
const LINE_STEP: NonNullable<Layout['transition']> = {
  duration: 52,
  easing: 'cubic-in-out',
};

const LINE_DESTACO: NonNullable<Layout['transition']> = {
  duration: 55,
  easing: 'cubic-out',
};

/** Donut: una sola transición larga (Plotly anima valores/porciones con claridad). */
const PIE_ENTRADA: NonNullable<Layout['transition']> = {
  duration: 2600,
  easing: 'cubic-out',
};

const ACTUALIZAR: NonNullable<Layout['transition']> = {
  duration: 950,
  easing: 'cubic-out',
};

type TraceLike = Data & {
  type?: string;
  orientation?: 'v' | 'h';
  x?: unknown;
  y?: unknown;
  values?: unknown;
  pull?: number[];
  value?: number;
  mode?: string;
  legendgroup?: string;
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Con 2 puntos el spline es casi una recta; necesitamos varios puntos para que la curva
 * se parezca al resultado final desde el primer fotograma visible.
 */
function puntosInicialesLinea(maxLen: number): number {
  if (maxLen <= 3) return maxLen;
  return Math.min(Math.max(12, 5), maxLen);
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function trazasInicialesAnimacion(data: Data[]): Data[] {
  return data.map((raw) => {
    const tr = raw as TraceLike;
    const t = tr.type;

    if (t === 'bar') {
      const horiz = tr.orientation === 'h';
      if (horiz && Array.isArray(tr.x)) {
        return {
          ...tr,
          x: tr.x.map((v) => (isFiniteNum(v) ? 0 : v)),
        } as Data;
      }
      if (Array.isArray(tr.y)) {
        return {
          ...tr,
          y: tr.y.map((v) => (isFiniteNum(v) ? 0 : v)),
        } as Data;
      }
    }

    if (t === 'scatter' && Array.isArray(tr.y)) {
      return {
        ...tr,
        y: tr.y.map((v) => (isFiniteNum(v) ? 0 : v)),
      } as Data;
    }

    if (t === 'pie' && Array.isArray(tr.values)) {
      const pull = Array.isArray(tr.pull) ? tr.pull.map(() => 0) : tr.pull;
      return {
        ...tr,
        values: tr.values.map((v) => (isFiniteNum(v as number) ? 0 : v)),
        ...(pull !== undefined ? { pull } : {}),
      } as Data;
    }

    return tr;
  });
}

function cortarTrazasScatter(tr: Data, n: number): Data {
  const t = tr as TraceLike;
  if (t.type !== 'scatter' || !Array.isArray((t as { x?: unknown }).x) || !Array.isArray(t.y)) {
    return tr;
  }
  const x = (t as { x: unknown[] }).x;
  const y = t.y as unknown[];
  const len = Math.max(0, Math.min(n, x.length, y.length));
  return { ...tr, x: x.slice(0, len), y: y.slice(0, len) } as Data;
}

function debeRevelarLineas(data: Data[]): boolean {
  if (!data.length) return false;
  return data.every((raw) => {
    const tr = raw as TraceLike;
    return (
      tr.type === 'scatter' &&
      typeof tr.mode === 'string' &&
      tr.mode.includes('line') &&
      Array.isArray(tr.y) &&
      tr.y.length > 3
    );
  });
}

function maxLongitudScatter(traces: Data[]): number {
  return Math.max(
    1,
    ...traces.map((tr) => {
      const t = tr as TraceLike;
      if (t.type === 'scatter' && Array.isArray((t as { x?: unknown[] }).x)) {
        return (t as { x: unknown[] }).x.length;
      }
      return 0;
    })
  );
}

function esPieUnico(data: Data[]): boolean {
  return data.length === 1 && (data[0] as TraceLike).type === 'pie';
}

/** Los traces `indicator` (tacómetros) no animan bien de 0→valor con `transition`; quedan en 0 % en pantalla. */
function esSoloIndicadores(data: Data[]): boolean {
  return data.length > 0 && data.every((d) => (d as TraceLike).type === 'indicator');
}

/** Tacómetros: interpolar `value` en varios frames (Plotly no anima el número con `layout.transition`). */
async function revelarIndicadores(
  Plotly: typeof PlotlyType,
  node: HTMLElement,
  data: Data[],
  layout: Partial<Layout> | undefined,
  mergedConfig: Partial<Config>,
  mergeLayoutBase: (l: Partial<Layout> | undefined, t: NonNullable<Layout['transition']>) => Partial<Layout>,
  cancelled: () => boolean
): Promise<void> {
  const STEPS = 26;
  const DUR_MS = 820;
  const dt = DUR_MS / STEPS;

  await Plotly.newPlot(
    node,
    data.map((tr) => {
      const t = tr as TraceLike & { value?: number; type?: string };
      if (t.type === 'indicator' && isFiniteNum(t.value)) {
        return { ...tr, value: 0 } as Data;
      }
      return tr;
    }),
    mergeLayoutBase(layout, { duration: 0, easing: 'linear' }),
    mergedConfig
  );
  await delay(32);
  if (cancelled()) return;

  for (let s = 1; s <= STEPS; s++) {
    if (cancelled()) return;
    const u = s / STEPS;
    const eased = 1 - (1 - u) ** 3;
    const traces = data.map((tr) => {
      const t = tr as TraceLike & { value?: number; type?: string };
      if (t.type === 'indicator' && isFiniteNum(t.value)) {
        const target = t.value as number;
        const v = s === STEPS ? target : target * eased;
        return { ...tr, value: v } as Data;
      }
      return tr;
    });
    await Plotly.react(node, traces, mergeLayoutBase(layout, { duration: 0, easing: 'linear' }), mergedConfig);
    await delay(dt);
  }
}

/** Donut: arranca en 0 y anima hasta valores finales en una sola transición larga. */
async function revelarPieEntrada(
  Plotly: typeof PlotlyType,
  node: HTMLElement,
  pieTrace: Data,
  layout: Partial<Layout> | undefined,
  mergedConfig: Partial<Config>,
  mergeLayoutBase: (l: Partial<Layout> | undefined, t: NonNullable<Layout['transition']>) => Partial<Layout>,
  cancelled: () => boolean
): Promise<void> {
  const t = pieTrace as TraceLike & { values: number[]; pull?: number[] };
  const n = t.values.length;
  const finalV = t.values.map((v) => (isFiniteNum(v) ? v : 0));
  const finalP =
    t.pull && t.pull.length === n ? t.pull.map((p) => (isFiniteNum(p) ? p : 0)) : finalV.map(() => 0);

  await Plotly.newPlot(
    node,
    [{ ...(pieTrace as object), values: finalV.map(() => 0), pull: finalP.map(() => 0) } as Data],
    mergeLayoutBase(layout, { duration: 0, easing: 'linear' }),
    mergedConfig
  );

  await delay(80);
  if (cancelled()) return;

  await Plotly.react(node, [pieTrace], mergeLayoutBase(layout, PIE_ENTRADA), mergedConfig);
}

async function revelarLineasScatter(
  Plotly: typeof PlotlyType,
  node: HTMLElement,
  data: Data[],
  layout: Partial<Layout> | undefined,
  mergedConfig: Partial<Config>,
  mergeLayoutBase: (l: Partial<Layout> | undefined, t: NonNullable<Layout['transition']>) => Partial<Layout>,
  cancelled: () => boolean
): Promise<void> {
  const otros = data.filter((tr) => (tr as TraceLike).legendgroup !== BRAND_PEER_ID);
  const marca = data.find((tr) => (tr as TraceLike).legendgroup === BRAND_PEER_ID);

  if (marca && otros.length > 0) {
    const maxO = maxLongitudScatter(otros);
    const startO = puntosInicialesLinea(maxO);
    const FRAMES = 34;
    const stepO = Math.max(1, Math.ceil((maxO - startO) / FRAMES));

    await Plotly.newPlot(
      node,
      otros.map((tr) => cortarTrazasScatter(tr, startO)),
      mergeLayoutBase(layout, { duration: 0, easing: 'linear' }),
      mergedConfig
    );

    for (let end = startO + stepO; end <= maxO + stepO; end += stepO) {
      if (cancelled()) return;
      const eff = Math.min(end, maxO);
      await Plotly.react(
        node,
        otros.map((tr) => cortarTrazasScatter(tr, eff)),
        mergeLayoutBase(layout, LINE_STEP),
        mergedConfig
      );
      if (eff >= maxO) break;
    }

    const otrosFull = otros.map((tr) => cortarTrazasScatter(tr, maxLongitudScatter([tr])));
    const maxI = maxLongitudScatter([marca]);
    const startI = puntosInicialesLinea(maxI);
    const stepI = Math.max(1, Math.ceil((maxI - startI) / FRAMES));

    await Plotly.react(
      node,
      [...otrosFull, cortarTrazasScatter(marca, startI)],
      mergeLayoutBase(layout, LINE_DESTACO),
      mergedConfig
    );

    for (let end = startI + stepI; end <= maxI + stepI; end += stepI) {
      if (cancelled()) return;
      const eff = Math.min(end, maxI);
      await Plotly.react(
        node,
        [...otrosFull, cortarTrazasScatter(marca, eff)],
        mergeLayoutBase(layout, LINE_STEP),
        mergedConfig
      );
      if (eff >= maxI) break;
    }
    return;
  }

  const maxLen = maxLongitudScatter(data);
  const startLen = puntosInicialesLinea(maxLen);
  const FRAMES = 34;
  const step = Math.max(1, Math.ceil((maxLen - startLen) / FRAMES));

  await Plotly.newPlot(
    node,
    data.map((tr) => cortarTrazasScatter(tr, startLen)),
    mergeLayoutBase(layout, { duration: 0, easing: 'linear' }),
    mergedConfig
  );

  for (let end = startLen + step; end <= maxLen + step; end += step) {
    if (cancelled()) return;
    const eff = Math.min(end, maxLen);
    await Plotly.react(
      node,
      data.map((tr) => cortarTrazasScatter(tr, eff)),
      mergeLayoutBase(layout, LINE_STEP),
      mergedConfig
    );
    if (eff >= maxLen) break;
  }
}

function mergeLayoutBase(layout: Partial<Layout> | undefined, transition: NonNullable<Layout['transition']>): Partial<Layout> {
  return {
    paper_bgcolor: '#F0F4FB',
    plot_bgcolor: 'rgba(255,255,255,0.97)',
    font: { family: 'Segoe UI, system-ui, sans-serif', size: 13, color: '#7823BD' },
    margin: { t: 48, r: 24, b: 48, l: 48 },
    transition,
    ...layout,
  };
}

function elTieneGrafico(el: HTMLElement): boolean {
  return Array.isArray((el as unknown as { data?: unknown }).data);
}

export function PlotlyFigure({
  data,
  layout,
  config,
  className = 'min-h-[280px] w-full',
  animateEntry = true,
  lineReveal = true,
  pieSectorReveal = true,
}: {
  data: Data[];
  layout?: Partial<Layout>;
  config?: Partial<Config>;
  className?: string;
  animateEntry?: boolean;
  lineReveal?: boolean;
  /** Si es false, el pie usa el mismo crecimiento 0→final que barras (sin transición larga única). */
  pieSectorReveal?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const yaEntradaAnimada = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || data.length === 0) return;
    let cancelled = false;

    void import('plotly.js-dist-min').then((mod) => {
      const Plotly = mod as unknown as typeof PlotlyType;
      if (cancelled || !ref.current) return;

      const mergedConfig: Partial<Config> = {
        responsive: true,
        displayModeBar: 'hover',
        ...config,
      };

      const run = async () => {
        const node = ref.current;
        if (cancelled || !node) return;

        try {
          if (animateEntry && !yaEntradaAnimada.current) {
            if (pieSectorReveal && esPieUnico(data)) {
              await revelarPieEntrada(
                Plotly,
                node,
                data[0]!,
                layout,
                mergedConfig,
                mergeLayoutBase,
                () => cancelled
              );
              if (!cancelled) yaEntradaAnimada.current = true;
              return;
            }

            if (lineReveal && debeRevelarLineas(data)) {
              await revelarLineasScatter(
                Plotly,
                node,
                data,
                layout,
                mergedConfig,
                mergeLayoutBase,
                () => cancelled
              );
              if (!cancelled) yaEntradaAnimada.current = true;
              return;
            }

            if (esSoloIndicadores(data)) {
              await revelarIndicadores(
                Plotly,
                node,
                data,
                layout,
                mergedConfig,
                mergeLayoutBase,
                () => cancelled
              );
              if (!cancelled) yaEntradaAnimada.current = true;
              return;
            }

            const inicial = trazasInicialesAnimacion(data);
            const entr = transicionEntrada(data);
            await Plotly.newPlot(node, inicial, mergeLayoutBase(layout, entr), mergedConfig);
            if (cancelled || !ref.current) return;
            await Plotly.react(ref.current, data, mergeLayoutBase(layout, entr), mergedConfig);
            if (!cancelled) yaEntradaAnimada.current = true;
            return;
          }

          if (elTieneGrafico(node)) {
            await Plotly.react(node, data, mergeLayoutBase(layout, ACTUALIZAR), mergedConfig);
          } else {
            await Plotly.newPlot(node, data, mergeLayoutBase(layout, ACTUALIZAR), mergedConfig);
          }
        } catch (e) {
          console.warn('[PlotlyFigure]', e);
          if (!cancelled && ref.current) {
            await Plotly.newPlot(ref.current, data, mergeLayoutBase(layout, ACTUALIZAR), mergedConfig);
          }
        }
      };

      void run();
    });

    return () => {
      cancelled = true;
      yaEntradaAnimada.current = false;
      void import('plotly.js-dist-min').then((mod) => {
        const Plotly = mod as unknown as typeof PlotlyType;
        if (el) {
          try {
            Plotly.purge(el);
          } catch {
            /* noop */
          }
        }
      });
    };
  }, [data, layout, config, animateEntry, lineReveal, pieSectorReveal]);

  return <div ref={ref} className={className} />;
}
