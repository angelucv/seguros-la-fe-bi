/** Extrae enlaces de un listado Apache (HTML). */
export function parseApacheLinks(html: string, baseUrl: string): { files: string[]; dirs: string[] } {
  const files: string[] = [];
  const dirs: string[] = [];
  const re = /<a\s+href="([^"]+)">/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1]!;
    if (href.startsWith('?')) continue;
    if (href === '../' || href.includes('Parent Directory')) continue;
    const abs = new URL(href, baseUrl).toString();
    if (href.endsWith('/')) dirs.push(abs);
    else if (/\.xlsx?$/i.test(href)) files.push(abs);
  }
  return { files, dirs };
}

export async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.text();
}

export async function fetchBuffer(url: string): Promise<Buffer> {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  const ab = await r.arrayBuffer();
  return Buffer.from(ab);
}
