import fs from 'node:fs/promises';
import path from 'node:path';
import { sourceRoot } from './source-root.mjs';
const sourceDirectory=await sourceRoot();
const routes=JSON.parse(await fs.readFile('dist/routes.json','utf8'));
const missing=new Map();
let assertions=0;
for(const route of routes){
 const file=path.join('dist',route,'index.html');
 const html=await fs.readFile(file,'utf8');
 const original=await fs.readFile(path.join(sourceDirectory,route,'index.html'),'utf8');
 if((html.match(/<h[1-6]\b/g)||[]).length < (original.replace(/<section\b[^>]*class=["']page-content comments-content["'][^>]*>[\s\S]*?<\/section>/gi,'').match(/<h[1-6]\b/g)||[]).length)throw new Error('Missing page headings: '+route);
 if(!html.includes('/replica.js'))throw new Error('Missing replica handler: '+route);
 if(/<script[^>]+src=["'][^"']*(contact-form-7|google.com\/recaptcha)/.test(html))throw new Error('Original form backend loaded: '+route);
 if(/<div id="comments"/.test(html))throw new Error('Source comments still included: '+route);
 for(const m of html.matchAll(/\b(?:src|href|poster)=["'](\/(?!\/)[^"']*)["']/g)){
  const url=m[1].split(/[?#]/)[0];
  if(!url||url==='/api/contact'||url==='/pages/')continue;
  let target=path.join('dist',decodeURIComponent(url));
  try{let s=await fs.stat(target);if(s.isDirectory())await fs.access(path.join(target,'index.html'));}
  catch{missing.set(url,(missing.get(url)||0)+1);}
 }
 assertions++;
}
await fs.writeFile('link-check.json',JSON.stringify({pagesChecked:assertions,missing:[...missing].map(([url,count])=>({url,count}))},null,2));
console.log(JSON.stringify({pagesChecked:assertions,missing:[...missing]},null,2));
if(missing.size)process.exitCode=1;
