/** Identificador estable de la aseguradora en datos SUDEASEG (peer_id). */
export const BRAND_PEER_ID = 'fe c a seguros';

/** Nombre corto para UI. */
export const BRAND_DISPLAY_NAME = 'Seguros La Fe';

export const APP_NAME = 'Seguros La Fe · información financiera y mercado';
export const APP_NAME_SHORT = 'Seguros La Fe · mercado y sector';

/** Rango de ranking (primas YTD) para comparar con empresas del mismo segmento (boletín SUDEASEG). */
export const RANK_COMPARATIVA_MIN = 15;
export const RANK_COMPARATIVA_MAX = 30;

/** Donut, primas mensuales e índices del boletín (BI sectorial): empresas en la banda de comparativa. */
export const SECTOR_COMPARATIVA_MAX_EMPRESAS = 3;

/** Ventana de fechas que el BI declara cubierta (primas / metadatos); no recorta filas del CSV en el motor. */
export const PERIODO_BI_MIN_FECHA = '2023-01-31';
export const PERIODO_BI_MAX_FECHA = '2026-03-31';

/** Primer mes (prefijo YYYY-MM) en gráficos de BI Histórico; no se muestran años anteriores ni en el brush. */
export const CHART_HISTORICO_MIN_MES_PREFIJO = '2023-01';

/** @deprecated Usar `LoadedDataset.anuarioReferenceYear` (inferido del cuadro 29 o del máximo año en primas). */
export const DATA_YEAR_FALLBACK = 2023;

/** Colores de marca (seguroslafe.com: morado + acentos). */
export const COLOR_BRAND_PRIMARY = '#7823BD';
export const COLOR_BRAND_NAVY = '#0f2e5f';
export const COLOR_BRAND_ACCENT = '#FFFFFF';
export const COLOR_BRAND_GOLD = '#FFC857';

/**
 * Trazo de la serie Seguros La Fe en gráficos (morado oscuro; evita lectura “dorada” en pantalla).
 * El primario `#7823BD` sigue en UI general / chips.
 */
export const CHART_LINE_STROKE_MARCA = '#4C1D95';
export const COLOR_PEER_MARCA = CHART_LINE_STROKE_MARCA;
export const CHART_STROKE_MARCA = CHART_LINE_STROKE_MARCA;

/** @deprecated usar COLOR_PEER_MARCA */
export const COLOR_PEER_LA_INTERNACIONAL = COLOR_PEER_MARCA;
/** @deprecated usar CHART_STROKE_MARCA */
export const CHART_STROKE_LA_INTERNACIONAL = CHART_STROKE_MARCA;

export const COLOR_MUTED = '#4D4D4D';

export const PEER_LINE_COLORS: Record<string, string> = {
  [BRAND_PEER_ID]: CHART_LINE_STROKE_MARCA,
  mercantil: '#B8323C',
  caracas: '#1E3A5F',
  oceanica: '#2E7D6B',
  mapfre: '#5C4D7A',
  piramide: '#B85C14',
  hispana: '#2A8F7A',
  constitucion: '#A84248',
  banesco: '#3D5A99',
  miranda: '#4A6FA5',
  'real seguros': '#C75B28',
};

export function colorLineaPeer(peerId: string, fallbackIndex: number): string {
  if (peerId in PEER_LINE_COLORS) return PEER_LINE_COLORS[peerId]!;
  const fallbacks = ['#5C6B7A', '#3D8B7A', '#B07D6A', '#2C3E50', '#7B8794', '#5A7CA6', '#8B7355'];
  return fallbacks[fallbackIndex % fallbacks.length]!;
}

export const INDICES_METRICAS: { code: keyof IndiceMetricCodes; label: string }[] = [
  { code: 'SINI_PAG_VS_PRIM_PCT', label: 'Siniestros pagados / primas netas (1)' },
  { code: 'RESERVAS_VS_PRIM_PCT', label: 'Reservas técnicas / primas netas (2)' },
  { code: 'SINI_INC_VS_PRIM_DEV_PCT', label: 'Siniestros incurridos / prima devengada (3)' },
  { code: 'COMISION_VS_PRIM_PCT', label: 'Comisiones / primas netas (4)' },
  { code: 'GAST_ADQ_VS_PRIM_PCT', label: 'Gastos adquisición / primas netas (5)' },
  { code: 'GAST_ADM_VS_PRIM_PCT', label: 'Gastos administración / primas netas (6)' },
  { code: 'COSTO_REAS_VS_PRIM_DEV_PCT', label: 'Costo reaseguro / prima devengada (7)' },
  { code: 'TASA_COMBINADA_PCT', label: 'Tasa combinada (8)' },
  { code: 'INDICE_COB_RESERVAS', label: 'Índice cobertura reservas (9)' },
];

export type IndiceMetricCodes = Pick<
  import('./types').IndiceBoletinRow,
  | 'SINI_PAG_VS_PRIM_PCT'
  | 'RESERVAS_VS_PRIM_PCT'
  | 'SINI_INC_VS_PRIM_DEV_PCT'
  | 'COMISION_VS_PRIM_PCT'
  | 'GAST_ADQ_VS_PRIM_PCT'
  | 'GAST_ADM_VS_PRIM_PCT'
  | 'COSTO_REAS_VS_PRIM_DEV_PCT'
  | 'TASA_COMBINADA_PCT'
  | 'INDICE_COB_RESERVAS'
>;

export const INDICES_SUBPLOT_TITLES = [
  '(1) Siniestros pag./primas',
  '(2) Reservas/primas',
  '(3) Siniestros inc./prima dev.',
  '(4) Comisiones/primas',
  '(5) Gastos adq./primas',
  '(6) Gastos adm./primas',
  '(7) Reaseguro/prima dev.',
  '(8) Tasa combinada',
  '(9) Cobertura reservas',
];
