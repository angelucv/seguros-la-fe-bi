/**
 * Extrae primas del ramo **Funerarios** (Cuadro 5-A, seguros de personas, seguro directo)
 * desde el PDF anual «Seguro en cifras» de SUDEASEG.
 */
import { PDFParse } from 'pdf-parse';
import { empresaPeerId } from '../empresaPeerId.js';

export type FunerarioCuadro5aRow = {
  empresa_raw: string;
  peer_id: string;
  primas_funerario_miles_bs: number;
  primas_total_personas_miles_bs: number;
  pagina_pdf: number;
};

/** Miles de Bs.: punto como separador de miles en estos cuadros (p. ej. 1.219.310). */
export function parseMilesBsToken(raw: string): number {
  const s = String(raw).replace(/\s/g, '');
  if (!s || s === '-') return NaN;
  return Number(s.replace(/\./g, '').replace(',', '.'));
}

function splitEmpresaYNumeros(line: string): { empresa: string; nums: string[] } | null {
  let r = line.trim();
  const nums: string[] = [];
  while (r.length > 0) {
    const m = r.match(/(-?[\d.,]+)\s*$/);
    if (!m) break;
    nums.unshift(m[1]!);
    r = r.slice(0, m.index).trim();
  }
  if (nums.length < 4 || !r) return null;
  return { empresa: r.replace(/\s+/g, ' ').trim(), nums };
}

function parseDataLine(line: string): { empresa: string; fun: number; tot: number } | null {
  const t = line.trim();
  if (!t || /^TOTAL\b/i.test(t)) return null;
  if (!/Seguros|C\.A\.|S\.A\.|C\.N\.A\.|Mundial/i.test(t)) return null;

  let work = t;
  const lead = work.match(/^(-?[\d.,]+)\s+(.+)$/);
  if (lead && /^-?[\d.,]+$/.test(lead[1]!) && /Seguros|C\.A\.|S\.A\.|de Seguros|Mundial/i.test(lead[2]!)) {
    work = lead[2]!.trim();
  }

  const split = splitEmpresaYNumeros(work);
  if (!split) return null;

  const { nums } = split;
  let { empresa } = split;
  if (empresa.length < 4) return null;

  let fun: number;
  let tot: number;
  if (nums.length >= 5) {
    fun = parseMilesBsToken(nums[nums.length - 2]!);
    tot = parseMilesBsToken(nums[nums.length - 1]!);
  } else if (nums.length === 4) {
    fun = parseMilesBsToken(nums[2]!);
    tot = parseMilesBsToken(nums[3]!);
  } else {
    return null;
  }
  if (!Number.isFinite(fun) || !Number.isFinite(tot)) return null;
  return { empresa, fun, tot };
}

export async function extractFunerarioCuadro5aFromPdf(
  pdfBuffer: Buffer,
  archivoFuente: string
): Promise<{ rows: FunerarioCuadro5aRow[]; paginasUsadas: number[] }> {
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  const text = await parser.getText();
  const rows: FunerarioCuadro5aRow[] = [];
  const paginasUsadas: number[] = [];

  for (const p of text.pages) {
    const pageText = p.text;
    const esCabeceraCuadro5a =
      /Cuadro\s*N[°º]?\s*5\s*[-–]?\s*A/i.test(pageText) &&
      /PRIMAS\s+NETAS\s+COBRADAS\s+POR\s+RAMO/i.test(pageText) &&
      /SEGUROS\s+DE\s+PERSONAS/i.test(pageText) &&
      /Funerario/i.test(pageText);

    /** Algunos PDF parten el cuadro en varias páginas: la continuación solo trae encabezados de columnas. */
    const esContinuacion5a =
      /Funerarios\s+Total/i.test(pageText) &&
      /Hospitalización/i.test(pageText) &&
      /Nombre\s+Empresa/i.test(pageText);

    if (!esCabeceraCuadro5a && !esContinuacion5a) continue;

    paginasUsadas.push(p.num);
    const lines = pageText.split(/\r?\n/);
    for (const line of lines) {
      if (/^TOTAL\b/i.test(line.trim())) break;

      const parsed = parseDataLine(line);
      if (!parsed) continue;
      rows.push({
        empresa_raw: parsed.empresa,
        peer_id: empresaPeerId(parsed.empresa),
        primas_funerario_miles_bs: parsed.fun,
        primas_total_personas_miles_bs: parsed.tot,
        pagina_pdf: p.num,
      });
    }
  }

  await parser.destroy();

  /** Primera aparición por empresa (páginas en orden); evita que una continuación con otro desglose de columnas pise cifras correctas. */
  const dedupe = new Map<string, FunerarioCuadro5aRow>();
  for (const r of rows) {
    if (!dedupe.has(r.empresa_raw)) dedupe.set(r.empresa_raw, r);
  }
  const unique = [...dedupe.values()].sort((a, b) => b.primas_funerario_miles_bs - a.primas_funerario_miles_bs);

  return { rows: unique, paginasUsadas: [...new Set(paginasUsadas)] };
}

export function rankFunerarioRows(
  rows: FunerarioCuadro5aRow[]
): (FunerarioCuadro5aRow & { ranking_funerario: number })[] {
  const sorted = [...rows].sort((a, b) => b.primas_funerario_miles_bs - a.primas_funerario_miles_bs);
  return sorted.map((r, i) => ({ ...r, ranking_funerario: i + 1 }));
}
