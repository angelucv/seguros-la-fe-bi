/** Origen oficial de cifras mensuales (listados Apache). */
export const SUDEASEG_BASE = 'https://www.sudeaseg.gob.ve';

/** Subrutas bajo Cifras Mensuales (nombre de carpeta en el servidor). */
export const CIFRAS_SUBDIRS = [
  '5 Primas Netas Cobradas por Empresa',
  '3 Índices por Empresa',
  '1 Cuadro de Resultados',
  '2 Resumen por Empresa',
  '6 Series Históricas',
] as const;

/** Cifras anuales (Excel “Seguro en cifras”, PDFs, etc.). */
export const CIFRAS_ANUALES_URL = new URL(
  '/Descargas/Estadisticas/Cifras%20Anuales/',
  SUDEASEG_BASE
).toString();

export const DOWNLOAD_ROOT = new URL(
  '/Descargas/Estadisticas/Cifras%20Mensuales/',
  SUDEASEG_BASE
).toString();

export const CACHE_DIR = 'cache/downloads';

/** CSV de salida (compatible con `la-internacional-web` / BI). */
export const OUTPUT_PUBLIC = 'output/data/public';
