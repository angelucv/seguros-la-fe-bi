import fs from 'fs';
import path from 'path';
import { parseSemicolonCsv, num } from './csv';
import { empresaPeerId } from './empresa';
import { PERIODO_BI_MAX_FECHA, PERIODO_BI_MIN_FECHA } from './config';
import { inferAnuarioReferenceYear, periodoPrimasDesdeHasta } from './datasetMeta';
import { mapPrimasFromCsv } from './primaEngine';
import type { BcvRow, Indicador29Row, IndiceBoletinRow, PrimaRow, ResultadoRow } from './types';
import { loadBcvFromRecords } from './fxEngine';

export interface LoadedDataset {
  dataDir: string;
  primas: PrimaRow[];
  bcv: BcvRow[];
  indicesMes: IndiceBoletinRow[] | null;
  indicesHist: IndiceBoletinRow[] | null;
  indicadores29: Indicador29Row[];
  resultado: ResultadoRow[] | null;
  /** Rango cubierto por `primas_netas_mensual_largo.csv` (todas las empresas). */
  periodoPrimas: { minFecha: string; maxFecha: string };
  /** Año de referencia del cuadro 29 / anuario en leyendas. */
  anuarioReferenceYear: number;
}

function readIfExists(p: string): string | null {
  try {
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}

/** Cuadro 29: archivo genérico, por año, o legado fijo 2023. */
function findCuadro29Path(dataDir: string): string | null {
  const generic = path.join(dataDir, 'cuadro_29_indicadores_financieros_por_empresa.csv');
  if (fs.existsSync(generic)) return generic;
  const legacy = path.join(dataDir, 'cuadro_29_indicadores_financieros_2023_por_empresa.csv');
  if (fs.existsSync(legacy)) return legacy;
  let best: string | null = null;
  let bestY = -1;
  try {
    for (const f of fs.readdirSync(dataDir)) {
      const m = /^cuadro_29_indicadores_financieros_(\d{4})_por_empresa\.csv$/.exec(f);
      if (m) {
        const y = Number(m[1]);
        if (y > bestY) {
          bestY = y;
          best = path.join(dataDir, f);
        }
      }
    }
  } catch {
    return null;
  }
  return best;
}

function mapIndices(records: Record<string, string>[]): IndiceBoletinRow[] {
  const out: IndiceBoletinRow[] = [];
  for (const r of records) {
    const name = r.NOMBRE_EMPRESA ?? '';
    if (!name) continue;
    out.push({
      NOMBRE_EMPRESA: name,
      peer_id: empresaPeerId(name),
      year: Number(r.year),
      month: Number(r.month),
      archivo_fuente: r.archivo_fuente,
      SINI_PAG_VS_PRIM_PCT: num(String(r.SINI_PAG_VS_PRIM_PCT ?? '')),
      RESERVAS_VS_PRIM_PCT: num(String(r.RESERVAS_VS_PRIM_PCT ?? '')),
      SINI_INC_VS_PRIM_DEV_PCT: num(String(r.SINI_INC_VS_PRIM_DEV_PCT ?? '')),
      COMISION_VS_PRIM_PCT: num(String(r.COMISION_VS_PRIM_PCT ?? '')),
      GAST_ADQ_VS_PRIM_PCT: num(String(r.GAST_ADQ_VS_PRIM_PCT ?? '')),
      GAST_ADM_VS_PRIM_PCT: num(String(r.GAST_ADM_VS_PRIM_PCT ?? '')),
      COSTO_REAS_VS_PRIM_DEV_PCT: num(String(r.COSTO_REAS_VS_PRIM_DEV_PCT ?? '')),
      TASA_COMBINADA_PCT: num(String(r.TASA_COMBINADA_PCT ?? '')),
      INDICE_COB_RESERVAS: num(String(r.INDICE_COB_RESERVAS ?? '')),
    });
  }
  return out;
}

function mapIndicadores29(records: Record<string, string>[]): Indicador29Row[] {
  const out: Indicador29Row[] = [];
  for (const r of records) {
    const name = (r.NOMBRE_EMPRESA ?? r['"NOMBRE_EMPRESA"'] ?? '').replace(/^"|"$/g, '');
    if (!name || /valor del mercado/i.test(name)) continue;
    out.push({
      NOMBRE_EMPRESA: name,
      peer_id: empresaPeerId(name),
      PCT_SINIESTRALIDAD_PAGADA: num(r.PCT_SINIESTRALIDAD_PAGADA ?? r['"PCT_SINIESTRALIDAD_PAGADA"']),
      PCT_COMISION_GASTOS_ADQUISICION: num(r.PCT_COMISION_GASTOS_ADQUISICION ?? r['"PCT_COMISION_GASTOS_ADQUISICION"']),
      PCT_GASTOS_ADMINISTRACION: num(r.PCT_GASTOS_ADMINISTRACION ?? r['"PCT_GASTOS_ADMINISTRACION"']),
      GASTOS_COBERTURA_RESERVAS: num(r.GASTOS_COBERTURA_RESERVAS ?? r['"GASTOS_COBERTURA_RESERVAS"']),
      INDICE_UTILIDAD_PATRIMONIO: num(r.INDICE_UTILIDAD_PATRIMONIO ?? r['"INDICE_UTILIDAD_PATRIMONIO"']),
    });
  }
  return out;
}

function mapResultado(records: Record<string, string>[]): ResultadoRow[] {
  const out: ResultadoRow[] = [];
  for (const r of records) {
    const raw = r.empresa_raw ?? '';
    const pid = (r.peer_id && String(r.peer_id).trim()) ? String(r.peer_id) : empresaPeerId(raw);
    out.push({
      ranking: r.ranking ? Number(r.ranking) : null,
      empresa_raw: raw,
      peer_id: pid,
      pnc_miles_bs: num(r.pnc_miles_bs),
      rt_bruto_miles_bs: num(r.rt_bruto_miles_bs),
      reaseguro_cedido_miles_bs: num(r.reaseguro_cedido_miles_bs),
      rt_neto_miles_bs: num(r.rt_neto_miles_bs),
      gestion_general_miles_bs: num(r.gestion_general_miles_bs),
      saldo_operaciones_miles_bs: num(r.saldo_operaciones_miles_bs),
      pct_saldo_sobre_pnc: num(r.pct_saldo_sobre_pnc),
      year: Number(r.year),
      month: Number(r.month),
      fecha_periodo: String(r.fecha_periodo).slice(0, 10),
    });
  }
  return out;
}

export function loadDataset(dataDir: string): LoadedDataset {
  const primasTxt = readIfExists(path.join(dataDir, 'primas_netas_mensual_largo.csv'));
  if (!primasTxt) throw new Error(`Falta primas_netas_mensual_largo.csv en ${dataDir}`);
  const primas = mapPrimasFromCsv(parseSemicolonCsv(primasTxt));

  const bcvTxt = readIfExists(path.join(dataDir, 'bcv_ves_por_usd_mensual.csv'));
  if (!bcvTxt) throw new Error(`Falta bcv_ves_por_usd_mensual.csv en ${dataDir}`);
  const bcv = loadBcvFromRecords(parseSemicolonCsv(bcvTxt));

  let indicesMes: IndiceBoletinRow[] | null = null;
  const idxTxt = readIfExists(path.join(dataDir, 'indices_por_empresa_mes_actual.csv'));
  if (idxTxt) indicesMes = mapIndices(parseSemicolonCsv(idxTxt));

  let indicesHist: IndiceBoletinRow[] | null = null;
  const idxHTxt = readIfExists(path.join(dataDir, 'indices_por_empresa_historico_largo.csv'));
  if (idxHTxt) indicesHist = mapIndices(parseSemicolonCsv(idxHTxt));

  const ind29Path = findCuadro29Path(dataDir);
  const ind29Txt = ind29Path ? readIfExists(ind29Path) : null;
  const indicadores29 = ind29Txt ? mapIndicadores29(parseSemicolonCsv(ind29Txt)) : [];

  let resultado: ResultadoRow[] | null = null;
  const resTxt = readIfExists(path.join(dataDir, 'resultado_tecnico_saldo_mensual.csv'));
  if (resTxt) resultado = mapResultado(parseSemicolonCsv(resTxt));

  const primasVentana = primas.filter(
    (r) => r.fecha_periodo >= PERIODO_BI_MIN_FECHA && r.fecha_periodo <= PERIODO_BI_MAX_FECHA
  );
  const periodoPrimas = periodoPrimasDesdeHasta(primasVentana.length ? primasVentana : primas);
  const anuarioReferenceYear = inferAnuarioReferenceYear(primas, ind29Path, dataDir);

  return {
    dataDir,
    primas,
    bcv,
    indicesMes,
    indicesHist,
    indicadores29,
    resultado,
    periodoPrimas,
    anuarioReferenceYear,
  };
}
