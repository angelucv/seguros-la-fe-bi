import fs from 'node:fs';
import { PDFParse } from 'pdf-parse';

const year = process.argv[2] ?? '2022';
const buf = fs.readFileSync(`cache/seguros-en-cifra-${year}.pdf`);
const parser = new PDFParse({ data: new Uint8Array(buf) });
const text = await parser.getText();
for (const p of text.pages) {
  const t = p.text;
  if (/Cuadro\s*N[º°]?\s*5\s*[-–]?\s*A/i.test(t) && /Funerario/i.test(t)) {
    console.log('--- page', p.num, '---');
    console.log(t);
  }
}
await parser.destroy();
