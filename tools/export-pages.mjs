import fs from 'node:fs/promises';
import path from 'node:path';
import { sourceRoot } from './source-root.mjs';

// Usage: npm run export:pages -- --base=/repository-name/
// Use --base=/ for an account site or a custom domain.
const argument = process.argv.find(value => value.startsWith('--base='));
const base = argument ? argument.slice(7) : '/';
if (!/^\/(?:[A-Za-z0-9_.-]+\/)*$/.test(base)) throw new Error('Base must be / or a repository path such as /my-site/.');
const destination = path.resolve('deploy/github-pages');
const manifest = JSON.parse(await fs.readFile(path.join(await sourceRoot(), 'manifest.json'), 'utf8'));
const routes = JSON.parse(await fs.readFile('dist/routes.json', 'utf8'));
const files = new Set([
  ...routes.map(route => route.slice(1) + 'index.html'),
  ...manifest.records.filter(record => record.status === 'downloaded' && record.kind === 'asset').map(record => record.file),
  'replica.js', 'replica.css'
]);
const assetDirectory = path.resolve('dist/assets');
try {
  for (const file of await fs.readdir(assetDirectory, { recursive: true, withFileTypes: true })) {
    if (file.isFile()) files.add(path.relative(path.resolve('dist'), path.join(file.parentPath, file.name)).replaceAll('\\', '/'));
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const prefix = value => value.startsWith('/') && !value.startsWith('//') ? base + value.slice(1) : value;
for (const file of files) {
  let bytes = await fs.readFile(path.join('dist', file));
  if (/\.(?:html|css|js)$/.test(file)) {
    let text = bytes.toString('utf8');
    if (base !== '/') {
      text = text.replace(/(["'`])(\/(?!\/)[^\s"'`<>]*)\1/g, (match, quote, url) => {
        if (url === '/api/contact') return match;
        return quote + prefix(url) + quote;
      });
      text = text.replace(/url\(\s*(\/(?!\/)[^\s)]+)\s*\)/g, (match, url) => 'url(' + prefix(url) + ')');
      text = text.replace(/\bsrcset=(["'])(.*?)\1/gs, (match, quote, entries) => 'srcset=' + quote + entries.split(',').map(entry => entry.replace(/^(\s*)(\/\S+)/, (item, spaces, url) => spaces + prefix(url))).join(',') + quote);
    }
    if (file.endsWith('.html')) {
      text = text.replace('</head>', '<script>window.REPLICA_HOSTING={static:true};</script>\n</head>');
    }
    if (file === 'replica.js') {
      text = text.replace("const response = await fetch('/api/contact',", "if (window.REPLICA_HOSTING?.static) throw new Error('Online submissions are not connected yet. Please contact us using the email shown on this page.');\n        const response = await fetch('/api/contact',");
    }
    bytes = Buffer.from(text);
  }
  const target = path.join(destination, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
}
await fs.writeFile(path.join(destination, '.nojekyll'), '');
// WordPress breadcrumbs include this prefix as a link even though it is not
// a separate content page. Preserve its homepage redirect on static hosting.
await fs.mkdir(path.join(destination,'pages'),{recursive:true});
await fs.writeFile(path.join(destination,'pages/index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${base}"><title>Home</title></head><body><a href="${base}">Continue to the homepage</a></body></html>`);
console.log(`GitHub Pages export: ${destination}\nBase URL path: ${base}\n${routes.length} pages; forms display an unavailable message until a hosted endpoint is configured.`);
