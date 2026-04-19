/**
 * Clave estable por nombre de empresa (alineado con `lib/bi/empresa.ts` del BI).
 * Unifica variantes de Seguros La Fe.
 */
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
  if ((n.includes('fe c.a') || n.includes('fe c a')) && n.includes('seguros')) return 'fe c a seguros';
  /** Evitar confundir «la fecha» del pie de cuadro con «La Fe». */
  if (
    n.includes('seguros') &&
    (n.includes('la fé') || (/\bla fe\b/.test(n) && !/\bla fecha\b/.test(n)))
  ) {
    return 'fe c a seguros';
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
