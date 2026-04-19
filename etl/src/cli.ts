import path from 'node:path';
import { CIFRAS_SUBDIRS, CACHE_DIR, CIFRAS_ANUALES_URL } from './config.js';
import { crawlDownload } from './download/crawl.js';
import { cifrasSectionUrl } from './paths.js';
import { runTransform } from './transform/run.js';

const cmd = process.argv[2] || 'help';

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function cmdDownload() {
  for (const folder of CIFRAS_SUBDIRS) {
    const url = cifrasSectionUrl(folder);
    const rel = slug(folder);
    console.log(`[download] ${url}`);
    const saved = await crawlDownload(url, rel, { maxDepth: 2 });
    console.log(`[download] ${folder}: ${saved.length} archivos`);
  }
  console.log(`[download] ${CIFRAS_ANUALES_URL}`);
  const anual = await crawlDownload(CIFRAS_ANUALES_URL, 'cifras-anuales', { maxDepth: 2 });
  console.log(`[download] Cifras Anuales: ${anual.length} archivos`);
  console.log(`[download] caché en ${CACHE_DIR}/`);
}

async function main() {
  if (cmd === 'download') await cmdDownload();
  else if (cmd === 'transform') await runTransform();
  else if (cmd === 'all') {
    await cmdDownload();
    await runTransform();
  } else {
    console.log(`Uso: npm run download | npm run transform | npm run all
  download   — Descarga .xlsx desde SUDEASEG (Cifras Mensuales + Cifras Anuales).
  transform  — Lee ${CACHE_DIR}/ y escribe CSV en output/data/public/
  all        — Ambos pasos.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
