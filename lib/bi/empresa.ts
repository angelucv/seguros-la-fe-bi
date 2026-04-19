import type { PrimaRow } from './types';
import { BRAND_DISPLAY_NAME, BRAND_PEER_ID } from './config';

/** Clave estable por nombre de empresa (alineada con `etl/src/empresaPeerId.ts`). */
export function empresaPeerId(name: string): string {
  let n = String(name).toLowerCase();
  n = n.replace(/[,.]/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  n = n
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u');
  if ((n.includes('fe c.a') || n.includes('fe c a')) && n.includes('seguros')) return BRAND_PEER_ID;
  if (
    n.includes('seguros') &&
    (n.includes('la fé') || (/\bla fe\b/.test(n) && !/\bla fecha\b/.test(n)))
  ) {
    return BRAND_PEER_ID;
  }
  if (n.includes('internacional') && n.includes('seguros')) return 'La Internacional';
  const brands = [
    'mercantil',
    'caracas',
    'piramide',
    'mapfre',
    'oceanica',
    'oceánica',
    'hispana',
    'constitucion',
    'banesco',
  ] as const;
  for (const b of brands) {
    if (n.includes(b)) return b === 'oceánica' ? 'oceanica' : b;
  }
  if (n.includes('real') && n.includes('seguros')) return 'real seguros';
  if (n.includes('miranda')) return 'miranda';
  if (n.includes('piramide') || name.toLowerCase().includes('pirámide')) return 'piramide';
  return n.slice(0, 36);
}

export function etiquetaDisplay(df: PrimaRow[], peerId: string): string {
  const sub = df.filter((r) => r.peer_id === peerId).sort((a, b) => a.fecha_periodo.localeCompare(b.fecha_periodo));
  if (sub.length === 0) return peerId;
  let raw = String(sub[sub.length - 1]!.empresa_raw);
  raw = raw.replace(/\s+/g, ' ').trim();
  if (peerId === BRAND_PEER_ID) return BRAND_DISPLAY_NAME;
  if (peerId === 'La Internacional') return 'La Internacional';
  if (raw.length > 42) return raw.slice(0, 39) + '…';
  return raw;
}

export function etiquetaBarraCorta(df: PrimaRow[], peerId: string): string {
  if (peerId === BRAND_PEER_ID) return 'La Fe';
  if (peerId === 'La Internacional') return 'La Internacional';
  if (peerId === 'mercantil') return 'Mercantil';
  if (peerId === 'caracas') return 'Caracas';
  const s = etiquetaDisplay(df, peerId);
  return s.length > 18 ? s.slice(0, 18) + '…' : s;
}
