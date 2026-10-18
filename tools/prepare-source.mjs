import fs from 'node:fs/promises';
import path from 'node:path';

const manifest = JSON.parse(await fs.readFile('archive/manifest.json', 'utf8'));
const records = manifest.records.filter(record => !['r/index.html', 'pages/index.html'].includes(record.file) && !/\.cur\/index\.html$/.test(record.file));
for (const record of records) {
  if (record.status !== 'downloaded') continue;
  let bytes = await fs.readFile(path.join('archive', record.file));
  if (record.kind === 'page') {
    const html = bytes.toString('utf8').replace(/<section\b[^>]*class=["']page-content comments-content["'][^>]*>[\s\S]*?<\/section>/gi, '');
    bytes = Buffer.from(html);
  }
  const target = path.join('site-source', record.file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
  record.bytes = bytes.length;
}
await fs.writeFile('site-source/manifest.json', JSON.stringify({ ...manifest, records, note: 'Public frontend source; blog comment sections removed. Original downloads remain in the local archive.' }, null, 2));
console.log('Prepared rebuildable site-source/ without the original blog comments.');
