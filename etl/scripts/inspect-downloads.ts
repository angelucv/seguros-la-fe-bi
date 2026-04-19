import XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { parseResultadoXlsx } from '../src/parsers/resultado.js';
import { parsePrimasXlsx } from '../src/parsers/primas.js';
import { mergePncPrimasEnResultado } from '../src/transform/run.js';

const paths = {
  resultado: 'c:/Users/Angel/Downloads/1_Cuadro_de_Resultados_Mar.xlsx',
  primas: 'c:/Users/Angel/Downloads/5_Primas_Mar.xlsx',
  indices: 'c:/Users/Angel/Downloads/3_Indice_por_Empresa_Mar.xlsx',
};

function dumpMatrixPreview(filePath: string, maxRows = 22) {
  const buf = readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sh = wb.SheetNames[0]!;
  const matrix = XLSX.utils.sheet_to_json(wb.Sheets[sh]!, { header: 1, defval: '' }) as unknown[][];
  console.log('\n--- RAW first sheet:', sh, '---');
  for (let r = 0; r < Math.min(matrix.length, maxRows); r++) {
    console.log(String(r).padStart(3), JSON.stringify(matrix[r]));
  }
}

for (const [k, p] of Object.entries(paths)) {
  try {
    console.log('\n########', k, p);
    const buf = readFileSync(p);
    const wb = XLSX.read(buf, { type: 'buffer' });
    console.log('Sheets:', wb.SheetNames.join(' | '));
    dumpMatrixPreview(p, 22);
  } catch (e) {
    console.log('ERROR', k, (e as Error).message);
  }
}

const peer = 'fe c a seguros';
const rbuf = readFileSync(paths.resultado);
const parsedR = parseResultadoXlsx(paths.resultado, rbuf);
const pbuf = readFileSync(paths.primas);
const parsedP = parsePrimasXlsx(paths.primas, pbuf);
const merged = mergePncPrimasEnResultado(parsedP, parsedR);
const feR = merged.filter((x) => x.peer_id === peer || /fe c\.a/i.test(x.empresa_raw));
console.log('\n=== resultado + PNC desde primas (La Fe) ===', feR.length);
console.log(JSON.stringify(feR, null, 2));

const feP = parsedP.filter((x) => x.peer_id === peer || /fe c\.a/i.test(x.empresa_raw));
console.log('\n=== parsePrimasXlsx La Fe rows ===', feP.length);
console.log(JSON.stringify(feP, null, 2));
