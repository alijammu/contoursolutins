import fs from 'node:fs/promises';
import path from 'node:path';
const origin = 'https://htechsupports.com';
const root = path.resolve('archive');
const records = new Map();
const pending = [];
const failures = [];
const decode = s => s.replace(/&amp;|&#0*38;/g, '&').replace(/\\\//g, '/');
const extensions = /\.(?:css|js|png|jpe?g|gif|svg|webp|avif|ico|cur|woff2?|ttf|eot|otf|mp4|webm|pdf)$/i;
function enqueue(raw, base = origin + '/', kind) {
  raw = decode(raw.trim());
  if (!raw || /^(?:data:|mailto:|tel:|javascript:|#)/i.test(raw)) return;
  let url;
  try { url = new URL(raw, base); } catch { return; }
  if (!/^https?:$/.test(url.protocol)) return;
  url.hash = '';
  const asset = extensions.test(url.pathname);
  const own = url.hostname === 'htechsupports.com' || url.hostname === 'www.htechsupports.com';
  if (/[$+{}]|document\.location/.test(raw)) return;
  if (!own && !asset && url.hostname !== 'fonts.googleapis.com') return;
  if (own && /\/(?:wp-json|wp-admin|feed|comments)|xmlrpc|wp-login/.test(url.pathname)) return;
  if (!asset && own && !(/^\/$|^\/pages\/[^/]+\/$|^\/(?:blog-2?|resources|author\/[^/]+|category\/[^/]+|tag\/[^/]+)\/$|^\/[^/.]+\/$/.test(url.pathname))) return;
  if (!asset && own && /wp-content|wp-includes/.test(url.pathname)) return;
  if (!asset && own && url.search && !url.searchParams.has('page_id')) return;
  if (own) url.hostname = 'htechsupports.com';
  // Version parameters refer to the same public file.
  if (asset) url.search = '';
  const key = url.href;
  if (records.has(key)) return;
  let file;
  if (own) file = decodeURIComponent(url.pathname).replace(/^\//, '');
  else file = 'external/' + url.hostname + url.pathname;
  if (url.hostname === 'fonts.googleapis.com') file = 'external/fonts/' + Buffer.from(url.search).toString('hex') + '.css';
  if (!asset && own) file = file.replace(/\/$/, '') + '/index.html';
  file = file.replace(/^\//, '');
  if (file.includes('..')) return;
  const record = { url: key, file, kind: kind || (asset ? 'asset' : own ? 'page' : 'asset'), status: 'pending' };
  records.set(key, record);
  pending.push(record);
}
function discover(text, base) {
  text = text.replace(/<section\b[^>]*class=["']page-content comments-content["'][^>]*>[\s\S]*?<\/section>/gi, '');
  for (const match of text.matchAll(/(?:https?:)?\/\/[^\s"'<>\\)]+/g)) enqueue(match[0], base);
  for (const match of text.matchAll(/\b(?:href|src|poster|data-src)\s*=\s*["']([^"']+)["']/gi)) enqueue(match[1], base);
  for (const match of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)) enqueue(match[1], base);
  for (const match of text.matchAll(/@import\s+["']([^"']+)["']/gi)) enqueue(match[1], base);
  for (const match of text.matchAll(/\bsrcset=["']([^"']+)["']/gi)) for (const entry of match[1].split(',')) enqueue(entry.trim().split(/\s+/)[0], base);
}
await fs.mkdir(root, { recursive: true });
try {
  const previous = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
  for (const record of previous.records) {
    if (record.status === 'downloaded') { records.set(record.url, record); }
  }
} catch {}
enqueue(origin + '/');
const home = await fs.readFile('reference-home.html', 'utf8');
discover(home, origin + '/');
for (const record of [...records.values()]) {
  if (/\.html$|\.css$/.test(record.file)) discover(await fs.readFile(path.join(root, record.file), 'utf8'), record.url);
}
let completed = 0;
while (pending.length) {
  const batch = pending.splice(0, 8);
  await Promise.all(batch.map(async record => {
    try {
      const response = await fetch(record.url, { signal: AbortSignal.timeout(45000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-reference-capture)' } });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const bytes = Buffer.from(await response.arrayBuffer());
      record.contentType = response.headers.get('content-type');
      record.bytes = bytes.length;
      record.status = 'downloaded';
      const target = path.join(root, record.file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, bytes);
      if (/text\/html|text\/css|javascript/.test(record.contentType || '') || /\.(css|js)$/.test(record.file)) discover(bytes.toString('utf8'), record.url);
    } catch (error) {
      record.status = 'failed';
      record.error = error.message;
      failures.push(record);
    }
    completed++;
  }));
  console.log(`Captured ${completed}; queued ${pending.length}; unavailable ${failures.length}`);
  await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify({ capturedAt: new Date().toISOString(), origin, records: [...records.values()] }, null, 2));
  if (records.size > 2200) throw new Error('Capture limit reached; inspect manifest before continuing.');
}
console.log(JSON.stringify({ pages: [...records.values()].filter(r => r.kind === 'page' && r.status === 'downloaded').length, assets: [...records.values()].filter(r => r.kind === 'asset' && r.status === 'downloaded').length, failures: failures.map(r => ({ url: r.url, error: r.error })) }, null, 2));
