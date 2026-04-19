import fs from 'node:fs';
import { PDFParse } from 'pdf-parse';

const buf = fs.readFileSync('cache/seguros-en-cifra-2022.pdf');
const parser = new PDFParse({ data: new Uint8Array(buf) });
const text = await parser.getText();
console.log('pages', text.pages?.length ?? text.total);
const full = text.text ?? '';
const idx = full.toLowerCase().indexOf('funerario');
console.log('first funerario at char', idx);
console.log(full.slice(Math.max(0, idx - 200), idx + 2500));
await parser.destroy();
