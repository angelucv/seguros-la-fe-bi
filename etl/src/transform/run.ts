import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT_PUBLIC } from '../config.js';
import { parsePrimasXlsx, type PrimaOut } from '../parsers/primas.js';
import { parseIndicesXlsx, type IndiceOut } from '../parsers/indices.js';
import { parseResultadoXlsx, type ResultadoOut } from '../parsers/resultado.js';

export function mergePncPrimasEnResultado(primas: PrimaOut[], resultado: ResultadoOut[]): ResultadoOut[] {
  const byPeerFecha = new Map<string, number>();
  for (const p of primas) {
    byPeerFecha.set(`${p.peer_id}|${p.fecha_periodo}`, p.primas_miles_bs);
  }
  return resultado.map((r) => {
    let pnc = r.pnc_miles_bs;
    if (pnc == null) {
      const hit = byPeerFecha.get(`${r.peer_id}|${r.fecha_periodo}`);
      if (hit != null) pnc = hit;
    }
    let pct = r.pct_saldo_sobre_pnc;
    const saldo = r.saldo_operaciones_miles_bs;
    if (pnc != null && Math.abs(pnc) > 1e-12 && saldo != null) {
      pct = (100 * saldo) / pnc;
    }
    return { ...r, pnc_miles_bs: pnc, pct_saldo_sobre_pnc: pct };
  });
}
import { writeSemicolonCsv } from '../writer/semicolonCsv.js';
import {
  buildCuadro29FromIndicesDecember,
  buildCuadro31aPrimasYoY,
  maxYearWithDecemberIndices,
  maxYearWithDecemberPrimas,
} from './derivedTables.js';

const CACHE = 'cache/downloads';

function walkXlsx(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walkXlsx(p));
    else if (name.toLowerCase().endsWith('.xlsx')) out.push(p);
  }
  return out;
}

function classify(file: string): 'primas' | 'indices' | 'resultado' | 'skip' {
  const b = path.basename(file);
  const lower = b.toLowerCase();
  if (
    /primas-netas|5_primas|primas netas cobradas|primas-\d{4}/i.test(b) ||
    (/^primas/i.test(lower) && !/indice/i.test(lower))
  ) {
    return 'primas';
  }
  if (/indice|indices-por-empresa|3_indice/i.test(lower)) return 'indices';
  if (
    /resumen-por-empresa|resumen-de-empresa|series-historicas|seguro en cifras|descargables.*cifras/i.test(lower)
  ) {
    return 'skip';
  }
  if (
    /cuadros?-de-resultados|cuadro-de-resultados|cuadros-de-resultado/i.test(b) ||
    /cuadro[_ -]de[_ -]resultados/i.test(lower) ||
    /^res-\d/i.test(lower) ||
    /dic cuadro|nov cuadro/i.test(lower)
  ) {
    return 'resultado';
  }
  return 'skip';
}

function priority(file: string): number {
  let s = 0;
  const norm = file.split(path.sep).join('/');
  if (/\/Año 20\d\d\//i.test(norm)) s += 100;
  if (/_(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)\b/i.test(file)) s += 40;
  if (/^dic |^nov |dic%20|nov%20/i.test(path.basename(file))) s += 5;
  return s;
}

function dedupePrimas(rows: (PrimaOut & { _p: number })[]): PrimaOut[] {
  const map = new Map<string, PrimaOut & { _p: number }>();
  for (const r of rows) {
    const k = `${r.peer_id}|${r.fecha_periodo}`;
    const prev = map.get(k);
    if (!prev || r._p > prev._p) map.set(k, r);
  }
  return [...map.values()].map(({ _p, ...rest }) => rest);
}

function dedupeIndices(rows: (IndiceOut & { _p: number })[]): IndiceOut[] {
  const map = new Map<string, IndiceOut & { _p: number }>();
  for (const r of rows) {
    const k = `${r.peer_id}|${r.year}-${r.month}`;
    const prev = map.get(k);
    if (!prev || r._p > prev._p) map.set(k, r);
  }
  return [...map.values()].map(({ _p, ...rest }) => rest);
}

function dedupeResultado(rows: (ResultadoOut & { _p: number })[]): ResultadoOut[] {
  const map = new Map<string, ResultadoOut & { _p: number }>();
  for (const r of rows) {
    const k = `${r.peer_id}|${r.fecha_periodo}`;
    const prev = map.get(k);
    if (!prev || r._p > prev._p) map.set(k, r);
  }
  return [...map.values()].map(({ _p, ...rest }) => rest);
}

export async function runTransform(cacheDir = CACHE): Promise<void> {
  const files = walkXlsx(cacheDir);
  const primasAcc: (PrimaOut & { _p: number })[] = [];
  const indicesAcc: (IndiceOut & { _p: number })[] = [];
  const resultadoAcc: (ResultadoOut & { _p: number })[] = [];

  for (const file of files) {
    const kind = classify(file);
    if (kind === 'skip') continue;
    const buf = fs.readFileSync(file);
    const p = priority(file);
    try {
      if (kind === 'primas') {
        for (const row of parsePrimasXlsx(file, buf)) primasAcc.push({ ...row, _p: p });
      } else if (kind === 'indices') {
        for (const row of parseIndicesXlsx(file, buf)) indicesAcc.push({ ...row, _p: p });
      } else {
        for (const row of parseResultadoXlsx(file, buf)) resultadoAcc.push({ ...row, _p: p });
      }
    } catch (e) {
      console.warn(`[transform] omitido ${file}:`, (e as Error).message);
    }
  }

  const primas = dedupePrimas(primasAcc).sort((a, b) => {
    const d = a.fecha_periodo.localeCompare(b.fecha_periodo);
    return d !== 0 ? d : a.peer_id.localeCompare(b.peer_id);
  });

  const indices = dedupeIndices(indicesAcc).sort((a, b) => {
    const d = a.year - b.year;
    return d !== 0 ? d : a.month - b.month || a.peer_id.localeCompare(b.peer_id);
  });

  let resultado = dedupeResultado(resultadoAcc).sort((a, b) => {
    const d = a.fecha_periodo.localeCompare(b.fecha_periodo);
    return d !== 0 ? d : a.peer_id.localeCompare(b.peer_id);
  });
  resultado = mergePncPrimasEnResultado(primas, resultado);

  const outDir = OUTPUT_PUBLIC;
  writeSemicolonCsv(path.join(outDir, 'primas_netas_mensual_largo.csv'), [
    'ranking',
    'empresa_raw',
    'primas_miles_bs',
    'pct_participacion',
    'year',
    'month',
    'fecha_periodo',
    'archivo_fuente',
    'hoja_mes',
    'empresa_norm',
  ], primas.map((r) => ({
    ranking: r.ranking,
    empresa_raw: r.empresa_raw,
    primas_miles_bs: r.primas_miles_bs,
    pct_participacion: r.pct_participacion,
    year: r.year,
    month: r.month,
    fecha_periodo: r.fecha_periodo,
    archivo_fuente: r.archivo_fuente,
    hoja_mes: r.hoja_mes,
    empresa_norm: r.empresa_norm,
  })));

  writeSemicolonCsv(path.join(outDir, 'indices_por_empresa_historico_largo.csv'), [
    'NOMBRE_EMPRESA',
    'year',
    'month',
    'SINI_PAG_VS_PRIM_PCT',
    'RESERVAS_VS_PRIM_PCT',
    'SINI_INC_VS_PRIM_DEV_PCT',
    'COMISION_VS_PRIM_PCT',
    'GAST_ADQ_VS_PRIM_PCT',
    'GAST_ADM_VS_PRIM_PCT',
    'COSTO_REAS_VS_PRIM_DEV_PCT',
    'TASA_COMBINADA_PCT',
    'INDICE_COB_RESERVAS',
    'archivo_fuente',
    'hoja',
  ], indices as unknown as Record<string, unknown>[]);

  const ult = indices.length
    ? indices.reduce((m, r) => (r.year > m.year || (r.year === m.year && r.month > m.month) ? r : m), indices[0]!)
    : null;
  const indicesMes = ult
    ? indices.filter((r) => r.year === ult.year && r.month === ult.month)
    : [];
  writeSemicolonCsv(path.join(outDir, 'indices_por_empresa_mes_actual.csv'), [
    'NOMBRE_EMPRESA',
    'year',
    'month',
    'SINI_PAG_VS_PRIM_PCT',
    'RESERVAS_VS_PRIM_PCT',
    'SINI_INC_VS_PRIM_DEV_PCT',
    'COMISION_VS_PRIM_PCT',
    'GAST_ADQ_VS_PRIM_PCT',
    'GAST_ADM_VS_PRIM_PCT',
    'COSTO_REAS_VS_PRIM_DEV_PCT',
    'TASA_COMBINADA_PCT',
    'INDICE_COB_RESERVAS',
    'archivo_fuente',
    'hoja',
  ], indicesMes as unknown as Record<string, unknown>[]);

  writeSemicolonCsv(path.join(outDir, 'resultado_tecnico_saldo_mensual.csv'), [
    'ranking',
    'empresa_raw',
    'peer_id',
    'pnc_miles_bs',
    'rt_bruto_miles_bs',
    'reaseguro_cedido_miles_bs',
    'rt_neto_miles_bs',
    'gestion_general_miles_bs',
    'saldo_operaciones_miles_bs',
    'pct_saldo_sobre_pnc',
    'year',
    'month',
    'fecha_periodo',
    'archivo_fuente',
  ], resultado as unknown as Record<string, unknown>[]);

  const bcvSrc = path.join(process.cwd(), 'templates', 'bcv_ves_por_usd_mensual.csv');
  const bcvDst = path.join(outDir, 'bcv_ves_por_usd_mensual.csv');
  if (fs.existsSync(bcvSrc)) {
    fs.mkdirSync(path.dirname(bcvDst), { recursive: true });
    fs.copyFileSync(bcvSrc, bcvDst);
  }

  const y29 = maxYearWithDecemberIndices(indices);
  if (y29 != null) {
    const cu29 = buildCuadro29FromIndicesDecember(indices, y29);
    const h29 = [
      'NOMBRE_EMPRESA',
      'PCT_SINIESTRALIDAD_PAGADA',
      'PCT_COMISION_GASTOS_ADQUISICION',
      'PCT_GASTOS_ADMINISTRACION',
      'GASTOS_COBERTURA_RESERVAS',
      'INDICE_UTILIDAD_PATRIMONIO',
    ];
    writeSemicolonCsv(path.join(outDir, 'cuadro_29_indicadores_financieros_por_empresa.csv'), h29, cu29);
    writeSemicolonCsv(
      path.join(outDir, `cuadro_29_indicadores_financieros_${y29}_por_empresa.csv`),
      h29,
      cu29
    );
  }

  const yP = maxYearWithDecemberPrimas(primas);
  if (yP != null && yP > 2000) {
    const yOld = yP - 1;
    const hasOld = primas.some((r) => r.year === yOld && r.month === 12);
    if (hasOld) {
      const m31 = buildCuadro31aPrimasYoY(primas, yP, yOld);
      const h31 = ['NOMBRE_EMPRESA', `PRIMAS_${yOld}`, `PRIMAS_${yP}`, 'CRECIMIENTO_PORC'];
      writeSemicolonCsv(
        path.join(outDir, `cuadro_31A_primas_netas_cobradas_${yP}_vs_${yOld}.csv`),
        h31,
        m31 as unknown as Record<string, unknown>[]
      );
    }
  }

  console.log(
    `[transform] primas ${primas.length} | indices ${indices.length} | resultado ${resultado.length} | cuadro29 año ${y29 ?? '—'} -> ${outDir}`
  );
}
