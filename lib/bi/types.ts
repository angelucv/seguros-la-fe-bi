export interface PrimaRow {
  ranking: number | null;
  empresa_raw: string;
  peer_id: string;
  primas_miles_bs: number;
  pct_participacion: number | null;
  year: number;
  month: number;
  fecha_periodo: string;
}

export interface BcvRow {
  year: number;
  month: number;
  ves_por_usd: number;
}

export interface IndiceBoletinRow {
  NOMBRE_EMPRESA: string;
  peer_id: string;
  year: number;
  month: number;
  archivo_fuente?: string;
  SINI_PAG_VS_PRIM_PCT: number | null;
  RESERVAS_VS_PRIM_PCT: number | null;
  SINI_INC_VS_PRIM_DEV_PCT: number | null;
  COMISION_VS_PRIM_PCT: number | null;
  GAST_ADQ_VS_PRIM_PCT: number | null;
  GAST_ADM_VS_PRIM_PCT: number | null;
  COSTO_REAS_VS_PRIM_DEV_PCT: number | null;
  TASA_COMBINADA_PCT: number | null;
  INDICE_COB_RESERVAS: number | null;
}

export interface ResultadoRow {
  ranking: number | null;
  empresa_raw: string;
  peer_id: string;
  pnc_miles_bs: number | null;
  rt_bruto_miles_bs: number | null;
  reaseguro_cedido_miles_bs: number | null;
  rt_neto_miles_bs: number | null;
  gestion_general_miles_bs: number | null;
  saldo_operaciones_miles_bs: number | null;
  pct_saldo_sobre_pnc: number | null;
  year: number;
  month: number;
  fecha_periodo: string;
}

export interface Indicador29Row {
  NOMBRE_EMPRESA: string;
  peer_id: string;
  PCT_SINIESTRALIDAD_PAGADA: number | null;
  PCT_COMISION_GASTOS_ADQUISICION: number | null;
  PCT_GASTOS_ADMINISTRACION: number | null;
  GASTOS_COBERTURA_RESERVAS: number | null;
  INDICE_UTILIDAD_PATRIMONIO: number | null;
}
