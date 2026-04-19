import fs from 'node:fs';
import path from 'node:path';

function esc(s: string): string {
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function writeSemicolonCsv(
  outPath: string,
  headers: string[],
  rows: Record<string, unknown>[]
) {
  const lines: string[] = [headers.join(';')];
  for (const row of rows) {
    lines.push(headers.map((h) => esc(String(row[h] ?? ''))).join(';'));
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
}
