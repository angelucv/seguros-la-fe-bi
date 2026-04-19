import fs from 'node:fs';
import { PDFParse } from 'pdf-parse';

const buf = fs.readFileSync('cache/seguros-en-cifra-2023.pdf');
const parser = new PDFParse({ data: new Uint8Array(buf) });
const text = await parser.getText();
const p = text.pages.find((x) => x.num === 30);
console.log(p?.text.slice(0, 2000));
await parser.destroy();
