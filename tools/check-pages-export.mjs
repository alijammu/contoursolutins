import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('deploy/github-pages');
const base=process.argv[2] || '/';
const routes=JSON.parse(await fs.readFile('dist/routes.json','utf8'));
let count=0;
for(const route of routes){
 const html=await fs.readFile(path.join(root,route,'index.html'),'utf8');
 if(!html.includes('window.REPLICA_HOSTING={static:true}'))throw new Error('Static form setting missing: '+route);
 for(const match of html.matchAll(/\b(?:href|src|poster)=["'](\/(?!\/)[^"']*)["']/g)){
  const url=match[1].split(/[?#]/)[0];
  if(!url.startsWith(base))throw new Error('Unprefixed reference: '+url);
  let target=path.join(root,decodeURIComponent(url.slice(base.length)));
  const stat=await fs.stat(target);
  if(stat.isDirectory())await fs.access(path.join(target,'index.html'));
  count++;
 }
}
await fs.access(path.join(root,'.nojekyll'));
const js=await fs.readFile(path.join(root,'replica.js'),'utf8');
if(!js.includes('Online submissions are not connected yet'))throw new Error('Missing form status message');
console.log(`Verified ${routes.length} exported pages and ${count} page/asset references for ${base}`);
