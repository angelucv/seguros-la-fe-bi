import type { Response } from 'express';

const replacer = (_k: string, v: unknown): unknown => {
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'number' && !Number.isFinite(v)) return null;
  return v;
};

/**
 * Siempre envía un cuerpo JSON no vacío. Evita `JSON.stringify(undefined)` → `undefined` → `res.send(undefined)` (cuerpo vacío).
 */
export function sendJson(res: Response, status: number, payload: unknown): void {
  const safePayload = payload === undefined ? {} : payload;
  let body: string;
  try {
    const s = JSON.stringify(safePayload, replacer);
    body = s === undefined ? '{}' : s;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    body = JSON.stringify(
      { error: 'No se pudo serializar la respuesta', detail: detail.slice(0, 4000) },
      replacer
    );
    res
      .status(500)
      .setHeader('Content-Type', 'application/json; charset=utf-8')
      .setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.end(body);
    return;
  }

  if (!body || body.length === 0) {
    body = '{}';
  }

  try {
    if (res.headersSent) return;
    res
      .status(status)
      .setHeader('Content-Type', 'application/json; charset=utf-8')
      .setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.end(body, 'utf8');
  } catch (e) {
    console.error('[sendJson] fallo al enviar respuesta', e);
    try {
      if (!res.headersSent) {
        res
          .status(500)
          .setHeader('Content-Type', 'application/json; charset=utf-8')
          .setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.end('{"error":"Error al enviar respuesta"}', 'utf8');
      }
    } catch {
      /* noop */
    }
  }
}
