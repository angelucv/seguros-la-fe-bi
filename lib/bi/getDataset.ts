import { loadDataset, type LoadedDataset } from './dataset';

let cached: { dir: string; ds: LoadedDataset } | null = null;

export function getDataset(dataDir: string): LoadedDataset {
  if (cached?.dir === dataDir) return cached.ds;
  const ds = loadDataset(dataDir);
  cached = { dir: dataDir, ds };
  return ds;
}

export function clearDatasetCache() {
  cached = null;
}
