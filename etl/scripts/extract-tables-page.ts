import fs from 'node:fs';
import { PDFParse } from 'pdf-parse';

const year = process.argv[2] ?? '2022';
const pageNum = Number(process.argv[3] ?? '18');
const buf = fs.readFileSync(`cache/seguros-en-cifra-${year}.pdf`);
const parser = new PDFParse({ data: new Uint8Array(buf) });
const tables = await parser.getTable({ partial: [pageNum] });
console.log(JSON.stringify(tables, null, 2).slice(0, 15000));
await parser.destroy();
