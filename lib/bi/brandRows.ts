import { BRAND_PEER_ID } from './config';

/** Identifica fila de la marca por `peer_id` SUDEASEG o por nombre comercial. */
export function isLaFeRow(peerId: string | null | undefined, empresa?: string | null): boolean {
  if (peerId && peerId === BRAND_PEER_ID) return true;
  const n = (empresa ?? '').toLowerCase();
  if (!n) return false;
  return (/\bla fe\b/i.test(n) || n.includes('la fé')) && n.includes('seguro');
}

export function partitionLaFeFirst<T>(rows: T[], isMarca: (row: T) => boolean): { marca: T | null; rest: T[] } {
  const idx = rows.findIndex(isMarca);
  if (idx === -1) return { marca: null, rest: [...rows] };
  const marca = rows[idx]!;
  const rest = rows.filter((_, i) => i !== idx);
  return { marca, rest };
}
