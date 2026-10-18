import fs from 'node:fs/promises';

export async function sourceRoot() {
  if (process.env.SITE_SOURCE_DIR) return process.env.SITE_SOURCE_DIR;
  try { await fs.access('site-source/manifest.json'); return 'site-source'; }
  catch { return 'archive'; }
}
