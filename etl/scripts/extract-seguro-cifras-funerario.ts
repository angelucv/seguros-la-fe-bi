/**
 * Uso: npx tsx scripts/extract-seguro-cifras-funerario.ts [2022|2023]
 * Requiere PDF en cache/seguros-en-cifra-YYYY.pdf
 */
import fs from 'node:fs';
import path from 'node:path';
import { extractFunerarioCuadro5aFromPdf, rankFunerarioRows } from '../src/parsers/seguroCifrasPdfCuadro5aFunerario.js';
import { writeSemicolonCsv } from '../src/writer/semicolonCsv.js';
import { OUTPUT_PUBLIC } from '../src/config.js';

const year = Number(process.argv[2] ?? '2022');
if (!Number.isFinite(year)) {
  console.error('Año inválido');
  process.exit(1);
}

const base = path.join(process.cwd(), 'cache', `seguros-en-cifra-${year}.pdf`);
if (!fs.existsSync(base)) {
  console.error('No existe', base);
  process.exit(1);
}

const buf = fs.readFileSync(base);
const { rows, paginasUsadas } = await extractFunerarioCuadro5aFromPdf(buf, path.basename(base));
const ranked = rankFunerarioRows(rows);

const outDir = path.join(process.cwd(), OUTPUT_PUBLIC);
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `seguro_cifras_funerario_cuadro5a_${year}.csv`);

writeSemicolonCsv(
  outFile,
  [
    'ranking_funerario',
    'empresa_raw',
    'peer_id',
    'primas_funerario_miles_bs',
    'primas_total_personas_miles_bs',
    'pagina_pdf',
    'year',
    'archivo_fuente',
  ],
  ranked.map((r) => ({
    ranking_funerario: r.ranking_funerario,
    empresa_raw: r.empresa_raw,
    peer_id: r.peer_id,
    primas_funerario_miles_bs: r.primas_funerario_miles_bs,
    primas_total_personas_miles_bs: r.primas_total_personas_miles_bs,
    pagina_pdf: r.pagina_pdf,
    year,
    archivo_fuente: path.basename(base),
  })) as unknown as Record<string, unknown>[]
);

const fe = ranked.find((r) => r.peer_id === 'fe c a seguros');
console.log(`[extract] ${year} filas: ${ranked.length} | páginas PDF: ${paginasUsadas.join(', ')}`);
console.log(`[extract] Salida: ${outFile}`);
if (fe) {
  console.log(
    `[extract] La Fe — ranking funerario #${fe.ranking_funerario} | primas funerario (miles Bs.): ${fe.primas_funerario_miles_bs}`
  );
}
