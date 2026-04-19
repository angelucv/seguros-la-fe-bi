import fs from 'node:fs/promises';
import path from 'node:path';
import { CACHE_DIR } from '../config.js';
import { fetchBuffer, fetchText, parseApacheLinks } from './apacheIndex.js';

export interface CrawlOptions {
  maxDepth?: number;
  onFile?: (url: string, localPath: string) => void;
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

function safeFileNameFromUrl(url: string): string {
  const u = new URL(url);
  const base = decodeURIComponent(path.basename(u.pathname));
  return base || 'file.bin';
}

function folderNameFromDirUrl(dirUrl: string): string {
  const u = new URL(dirUrl);
  const parts = u.pathname.split('/').filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] || 'sub');
}

/**
 * Descarga recursiva: índice Apache → .xlsx y subcarpetas (p. ej. `Año 2025/`).
 */
export async function crawlDownload(startUrl: string, relDir: string, options: CrawlOptions = {}): Promise<string[]> {
  const maxDepth = options.maxDepth ?? 2;
  const saved: string[] = [];

  async function walk(url: string, rel: string, depth: number) {
    if (depth > maxDepth) return;
    const html = await fetchText(url);
    const { files, dirs } = parseApacheLinks(html, url);
    const baseLocal = path.join(CACHE_DIR, rel);
    await ensureDir(baseLocal);

    for (const f of files) {
      const name = safeFileNameFromUrl(f);
      const localPath = path.join(baseLocal, name);
      const buf = await fetchBuffer(f);
      await fs.writeFile(localPath, buf);
      saved.push(localPath);
      options.onFile?.(f, localPath);
    }

    for (const d of dirs) {
      const sub = path.join(rel, folderNameFromDirUrl(d));
      await walk(d, sub, depth + 1);
    }
  }

  await walk(startUrl, relDir, 0);
  return saved;
}
