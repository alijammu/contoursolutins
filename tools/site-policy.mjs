import fs from 'node:fs/promises';
import path from 'node:path';

export const siteOrigin = 'https://consorttechnologies.com';
export const obsoleteBusiness = /\bh[.\s_-]*tech(?:[.\s_-]*supports?)?|\bHTS\b/i;
export const trackingCode = /googletagmanager\.com|google-analytics\.com|\bgtag\s*\(|\bdataLayer\b|G-YCVDRTMNRH/i;
export const contentPolicy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'none'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'";

export function decodedText(value) {
  for (let i = 0; i < 3; i++) {
    value = value.replace(/\\\//g, '/').replace(/\\u([a-f0-9]{4})|\\x([a-f0-9]{2})/gi, (_, a, b) => String.fromCharCode(parseInt(a || b, 16)))
      .replace(/&#(?:x([a-f0-9]+)|(\d+));?/gi, (_, hex, dec) => String.fromCodePoint(parseInt(hex || dec, hex ? 16 : 10))).replace(/&amp;/g, '&');
    try { value = decodeURIComponent(value); } catch { value = value.replace(/%([a-f0-9]{2})/gi, (_, code) => String.fromCharCode(parseInt(code, 16))); }
  }
  return value;
}

export async function resetOutput(directory) {
  const workspace = path.resolve('.');
  const target = path.resolve(directory);
  if (!['dist', 'deploy/github-pages'].includes(directory) || !target.startsWith(workspace + path.sep)) throw new Error('Unsafe output directory: ' + target);
  try { if ((await fs.lstat(target)).isSymbolicLink()) throw new Error('Output must not be a symlink: ' + target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
}
