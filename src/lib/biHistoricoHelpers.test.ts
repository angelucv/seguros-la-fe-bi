import { describe, expect, it } from 'vitest';
import { BRAND_PEER_ID } from '@/lib/bi/config';
import {
  alignCredixLineSeriesByDate,
  applyPeerToggle,
  filterAndOrderSeries,
  MAX_CHART_EMPRESAS,
  MIN_CHART_EMPRESAS,
  normalizeHistoricoPayload,
  pickInitialPeerSelection,
  takePeersByRanking,
  type CredixLineSeries,
  type ChartCatalogRow,
} from './biHistoricoHelpers';

const cat: ChartCatalogRow[] = [
  { peer_id: 'a', name: 'A', ranking: 1 },
  { peer_id: 'b', name: 'B', ranking: 2 },
  { peer_id: 'c', name: 'C', ranking: 3 },
];

function serie(peer: string): CredixLineSeries {
  return {
    peer_id: peer,
    name: peer,
    color: '#000',
    x: ['2024-01-01'],
    y: [1],
  };
}

describe('applyPeerToggle', () => {
  it('no elimina el último cuando ya hay el mínimo', () => {
    expect(applyPeerToggle(['solo'], 'solo')).toEqual(['solo']);
  });

  it('no añade más allá del máximo', () => {
    const five = ['a', 'b', 'c', 'd', 'e'];
    expect(applyPeerToggle(five, 'x')).toEqual(five);
  });

  it('añade y quita respetando límites', () => {
    expect(applyPeerToggle(['a'], 'b')).toEqual(['a', 'b']);
    expect(applyPeerToggle(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('takePeersByRanking', () => {
  it('ordena por ranking y limita', () => {
    expect(takePeersByRanking(['c', 'a', 'b'], cat, 2)).toEqual(['a', 'b']);
  });

  it('prioriza peer aunque el ranking lo deje fuera del top', () => {
    const big: ChartCatalogRow[] = [
      { peer_id: 'a', name: 'A', ranking: 1 },
      { peer_id: 'b', name: 'B', ranking: 2 },
      { peer_id: 'c', name: 'C', ranking: 3 },
      { peer_id: 'd', name: 'D', ranking: 4 },
      { peer_id: 'e', name: 'E', ranking: 5 },
      { peer_id: 'marca', name: 'Marca', ranking: 27 },
    ];
    const pool = ['a', 'b', 'c', 'd', 'e', 'marca'];
    expect(takePeersByRanking(pool, big, 5, 'marca')).toEqual(['marca', 'a', 'b', 'c', 'd']);
  });
});

describe('pickInitialPeerSelection', () => {
  it('usa defaultChartPeerIds si hay catálogo', () => {
    const h = normalizeHistoricoPayload({
      chartCatalog: cat,
      defaultChartPeerIds: ['c', 'a'],
      seriesFlujoUsd: [serie('a'), serie('c')],
      seriesFlujoBs: [],
      seriesPart: [],
    });
    expect(pickInitialPeerSelection(h)).toEqual(['a', 'c']);
  });

  it('prioriza Seguros La Fe, Altamira y Previsora cuando están en catálogo y con serie', () => {
    const h = normalizeHistoricoPayload({
      chartCatalog: [
        { peer_id: BRAND_PEER_ID, name: 'Fe C.A., Seguros', ranking: 15 },
        { peer_id: 'alt', name: 'Altamira C.A., Seguros', ranking: 2 },
        { peer_id: 'prev', name: 'Previsora Venezolana C.A.', ranking: 5 },
      ],
      defaultChartPeerIds: [],
      seriesFlujoUsd: [serie(BRAND_PEER_ID), serie('alt'), serie('prev')],
      seriesFlujoBs: [],
      seriesPart: [serie(BRAND_PEER_ID), serie('alt'), serie('prev')],
    });
    expect(pickInitialPeerSelection(h)).toEqual([BRAND_PEER_ID, 'alt', 'prev']);
  });
});

describe('filterAndOrderSeries', () => {
  it('filtra y ordena por ranking del catálogo', () => {
    const series = [serie('c'), serie('a')];
    const out = filterAndOrderSeries(series, new Set(['c', 'a']), cat);
    expect(out.map((s) => s.peer_id)).toEqual(['a', 'c']);
  });
});

describe('alignCredixLineSeriesByDate', () => {
  it('une fechas y rellena huecos por mes', () => {
    const a: CredixLineSeries = {
      peer_id: 'a',
      name: 'A',
      color: '#111',
      x: ['2020-01-31', '2020-02-29'],
      y: [1, 2],
    };
    const b: CredixLineSeries = {
      peer_id: 'b',
      name: 'B',
      color: '#222',
      x: ['2020-02-29', '2020-03-31'],
      y: [10, 20],
    };
    const out = alignCredixLineSeriesByDate([a, b]);
    expect(out[0]!.x).toEqual(['2020-01-31', '2020-02-29', '2020-03-31']);
    expect(out[0]!.y).toEqual([1, 2, null]);
    expect(out[1]!.y).toEqual([null, 10, 20]);
  });
});

describe('normalizeHistoricoPayload', () => {
  it('respeta límites 1–5 en selección implícita vía catálogo', () => {
    const big = Array.from({ length: 10 }, (_, i) => ({
      peer_id: `p${i}`,
      name: `P${i}`,
      ranking: i + 1,
    }));
    const series = big.slice(0, 7).map((b) => serie(b.peer_id));
    const h = normalizeHistoricoPayload({
      chartCatalog: big,
      defaultChartPeerIds: big.map((b) => b.peer_id),
      seriesFlujoUsd: series,
      seriesFlujoBs: [],
      seriesPart: series,
    });
    const sel = pickInitialPeerSelection(h);
    expect(sel.length).toBe(MAX_CHART_EMPRESAS);
    expect(sel.length).toBeGreaterThanOrEqual(MIN_CHART_EMPRESAS);
  });
});
