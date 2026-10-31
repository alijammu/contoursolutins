import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {obsoleteBusiness,trackingCode,decodedText,siteOrigin} from './site-policy.mjs';
export async function checkIsolation(directory){
  let checked=0;
  for(const entry of await fs.readdir(directory,{recursive:true,withFileTypes:true})){
    if(!entry.isFile())continue;
    const file=path.join(entry.parentPath,entry.name),relative=path.relative(directory,file);
    if(obsoleteBusiness.test(relative))throw new Error('Obsolete identifier in path: '+relative);
    const bytes=await fs.readFile(file),isText=/\.(?:html|css|js|json|svg|xml|txt)$/i.test(file);
    const text=isText?decodedText(bytes.toString('utf8')):bytes.toString('latin1');
    const legacy=isText?obsoleteBusiness:/\bh[.\s_-]*tech(?:[.\s_-]*supports?)?/i;
    if(legacy.test(text)||trackingCode.test(text))throw new Error('Obsolete business or tracking reference: '+relative);
    if(/\.html$/i.test(file))for(const m of text.matchAll(/<(?:script|img|iframe|link|source|video|audio)\b[^>]*\b(?:src|href|poster)=["']((?:https?:)?\/\/[^"']+)["']/gi)){
      const url=new URL(m[1],siteOrigin);
      if(url.origin!==siteOrigin)throw new Error('Foreign resource dependency: '+relative+' -> '+url.origin);
    }
    if(/\.css$/i.test(file)&&/url\(\s*["']?(?:https?:)?\/\//i.test(text))throw new Error('External CSS dependency: '+relative);
    checked++;
  }
  console.log('Isolation audit passed for '+checked+' files in '+directory+'.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await checkIsolation(process.argv[2]||'deploy/github-pages');
