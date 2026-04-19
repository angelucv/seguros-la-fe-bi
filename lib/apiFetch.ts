/**
 * `fetch` + `JSON.parse` con mensaje claro si el servidor devuelve HTML (p. ej. `index.html`)
 * porque la app se abrió con Vite solo en :5173 en lugar de Express (`npm run dev` en :3000).
 */
function withCacheBust(url: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_=${Date.now()}`;
}

export async function fetchApiJson<T>(input: string): Promise<T> {
  const r = await fetch(withCacheBust(input), {
    cache: 'no-store',
    headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
  });
  const text = await r.text();
  if (!text.trim() && !r.ok) {
    throw new Error(
      `Respuesta vacía (${r.status}). Suele indicar que el puerto está ocupado por otro programa: ` +
        `cierre procesos viejos, ejecute un solo \`npm run dev\`, o use \`$env:PORT='3010'; npm run dev\` y abra esa URL. ` +
        `Compruebe también DATA_DIR y la consola de tsx server.ts.`
    );
  }
  const t = text.trimStart();
  if (t.startsWith('<!') || t.startsWith('<!DOCTYPE') || t.toLowerCase().startsWith('<!doctype')) {
    throw new Error(
      'El servidor devolvió una página HTML en lugar de JSON. Arranque la aplicación con `npm run dev` ' +
        '(Express + Vite en un solo proceso) y abra la URL que indica la consola, por ejemplo http://localhost:3000. ' +
        'Si usa el servidor de Vite en el puerto 5173, ejecute también `tsx server.ts` en el puerto 3000 para que el proxy reenvíe `/api` al API.'
    );
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Respuesta no válida (${r.status}): ${text.slice(0, 120)}…`);
  }
  if (!r.ok && data && typeof data === 'object' && data !== null && 'error' in data) {
    throw new Error(String((data as { error: string }).error));
  }
  if (!r.ok) {
    throw new Error(`Error HTTP ${r.status}`);
  }
  const headerMark = r.headers.get('X-BI-API-Mark');
  if (headerMark && data && typeof data === 'object' && data !== null) {
    const o = data as Record<string, unknown>;
    if (o.serverMark == null) o.serverMark = headerMark;
  }
  return data as T;
}
