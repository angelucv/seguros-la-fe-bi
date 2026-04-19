import { DOWNLOAD_ROOT } from './config.js';

/** URL del listado Apache de una carpeta bajo Cifras Mensuales (un solo segmento). */
export function cifrasSectionUrl(folderName: string): string {
  const base = DOWNLOAD_ROOT.endsWith('/') ? DOWNLOAD_ROOT : `${DOWNLOAD_ROOT}/`;
  return `${base}${encodeURIComponent(folderName)}/`;
}
