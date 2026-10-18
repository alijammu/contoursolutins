import fs from 'node:fs/promises';
import path from 'node:path';
import { sourceRoot } from './source-root.mjs';
const sourceDirectory = await sourceRoot();
const manifest = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'manifest.json'), 'utf8'));
const branding = JSON.parse(await fs.readFile('branding.json', 'utf8'));
const good = manifest.records.filter(r => r.status === 'downloaded' && !['r/index.html','pages/index.html'].includes(r.file) && !/\.cur\/index\.html$/.test(r.file));
const replacements = good.filter(r => /^https?:\/\//.test(r.url)).sort((a,b) => b.url.length-a.url.length);
const built = [];
await fs.mkdir('dist', { recursive: true });
function localize(text) {
  // Some pages still point at the previous staging host, while the exact same
  // image is available among the production site's captured uploads.
  for (const failed of manifest.records.filter(r=>r.status==='failed' && r.url.includes('pegasosstudio.com'))) {
    const production = good.find(r=>r.kind==='asset' && r.file.startsWith('wp-content/uploads/') && path.basename(r.file)===path.basename(new URL(failed.url).pathname));
    if (production) text = text.split(failed.url).join('/'+production.file);
  }
  for (const r of replacements) {
    const local = r.kind === 'page' ? '/' + r.file.replace(/index\.html$/, '') : '/' + r.file;
    text = text.split(r.url).join(local);
    text = text.split(r.url.replaceAll('/', '\\/')).join(local.replaceAll('/', '\\/'));
  }
  text = text.replace(/https?:\/\/(?:www\.)?htechsupports\.com(?=[/"'\s<]|$)/g, '');
  return text;
}
for (const record of good) {
  let content = await fs.readFile(path.join(sourceDirectory, record.file));
  if (/\.html$|\.css$|\.js$/.test(record.file)) {
    let text = content.toString('utf8');
    if (record.kind === 'page') text = text.replace(/<section\b[^>]*class=["']page-content comments-content["'][^>]*>[\s\S]*?<\/section>/gi, '');
    text = localize(text);
    if (record.kind === 'page') {
      // Replace WordPress-only form transport with our local submission handler.
      text = text.replace(/<script\b[^>]*(?:src|id)=["'][^"']*(?:contact-form-7|swv-js|wpcf7-recaptcha|google-recaptcha|wp-emoji|googletagmanager|google-analytics)[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
      text = text.replace(/<script\b[^>]*type=["']module["'][^>]*>[\s\S]*?<\/script>/gi, '');
      text = text.replace(/<link\b[^>]*(?:wp-json|xmlrpc|\/feed\/|application\/(?:rss|json)|api\.w\.org)[^>]*>/gi, '');
      text = text.replace(/<fieldset class="hidden-fields-container">[\s\S]*?<\/fieldset>/g, '');
      text = text.replace(/<noscript>[\s\S]*?<\/noscript>/g, block => /grecaptcha/.test(block) ? '' : block);
      text = text.replace(/<span[^>]*class="wpcf7-form-control-wrap recaptcha"[\s\S]*?<\/span>\s*<\/span>/g, '');
      text = text.replace(/<form([^>]*class="wpcf7-form[^>]*)>/g, '<form$1 data-local-form="true">');
      text = text.replace(/novalidate="novalidate"/g, '');
      const pairs = {
        'sales@htechsupports.com': branding.email,
        'resources@htechsupports.com': branding.partnerEmail,
        'H-Tech Supports': branding.name,
        'htechsupports': branding.siteTitle,
        'HTS': branding.shortName,
        ...branding.textReplacements,
        ...branding.urlReplacements
      };
      const brandText = value => {
        value = value.replace(/(?:sales|resources)@htechsupports\.com|H-Tech Supports|htechsupports|\bHTS\b/g, match => pairs[match] ?? match);
        for (const [before, after] of Object.entries(branding.textReplacements)) value = value.split(before).join(after);
        return value;
      };
      // Change visible copy and accessible labels without corrupting source URLs
      // or identifiers used by the downloaded theme's scripts.
      text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<[^>]+>|[^<]+/gi, token => {
        if (/^<(?:script|style)\b/i.test(token)) return token;
        if (token.startsWith('<')) {
          return token.replace(/\b(alt|title|aria-label)=(["'])(.*?)\2/gi, (match, attr, quote, value) => attr+'='+quote+brandText(value)+quote)
            .replace(/mailto:sales@htechsupports\.com/g, 'mailto:'+branding.email)
            .replace(/mailto:resources@htechsupports\.com/g, 'mailto:'+branding.partnerEmail);
        }
        return brandText(token);
      });
      for (const [before, after] of Object.entries(branding.urlReplacements)) text = text.split(before).join(after);
      text = text.replace(/\/wp-content\/uploads\/2024\/04\/PNG\.png/g, branding.logo).replace(/\/wp-content\/uploads\/2024\/04\/white\.png/g, branding.lightLogo);
      text = text.replace(/\/wp-content\/uploads\/2024\/04\/cropped-PNG-\d+x\d+\.png/g, branding.favicon);
      text = text.replace('</head>', '<link rel="stylesheet" href="/replica.css">\n</head>');
      text = text.replace('</body>', '<script src="/replica.js" defer></script>\n</body>');
      built.push('/' + record.file.replace(/index\.html$/, ''));
    }
    content = Buffer.from(text);
  }
  const target = path.join('dist', record.file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
}
await fs.copyFile('src/replica.js', 'dist/replica.js');
await fs.copyFile('src/replica.css', 'dist/replica.css');
try { await fs.cp('src/assets', 'dist/assets', { recursive:true }); } catch(error) { if(error.code !== 'ENOENT') throw error; }
if (branding.primaryColor) await fs.appendFile('dist/replica.css', `\n:root{--replica-primary:${branding.primaryColor}}\n.tt_button,.primary-button,.wpcf7-submit{background-color:var(--replica-primary)!important}\na,.phb-simple-link{color:var(--replica-primary)}\n`);
await fs.writeFile('dist/routes.json', JSON.stringify(built, null, 2));
await fs.writeFile('capture-report.json', JSON.stringify({ source: manifest.origin, capturedAt: manifest.capturedAt, pages: built, assets: good.filter(r=>r.kind==='asset').length, unavailable: manifest.records.filter(r=>r.status==='failed'), limitations: ['Public frontend capture only; WordPress admin, PHP, database, and private hub are not included.', 'Contact and partner forms save to local data/submissions.jsonl when served with npm start.', 'Source blog comments are excluded from the working build.', 'Broken source images remain documented; external maps and social links may require internet.'] }, null, 2));
console.log(`Built ${built.length} pages and ${good.filter(r=>r.kind==='asset').length} assets in dist/`);
