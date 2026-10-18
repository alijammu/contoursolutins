import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.mp4':'video/mp4','.pdf':'application/pdf'};
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/contact' && req.method === 'POST') {
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) { res.writeHead(403); res.end(); return; }
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 65536) { res.writeHead(413); res.end(); return; } }
      let payload;
      try { payload = JSON.parse(body); } catch { res.writeHead(400); res.end('Invalid JSON'); return; }
      if (!payload.fields || typeof payload.fields !== 'object' || Array.isArray(payload.fields) || !Object.keys(payload.fields).length) { res.writeHead(400); res.end('Fields required'); return; }
      await fs.mkdir('data',{recursive:true});
      await fs.appendFile('data/submissions.jsonl',JSON.stringify({receivedAt:new Date().toISOString(),page:String(payload.page || ''),fields:payload.fields})+'\n');
      res.writeHead(201,{'Content-Type':'application/json'}); res.end('{"saved":true}'); return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const filePath = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (filePath !== root && !filePath.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
    let file = filePath;
    const stat = await fs.stat(file);
    if (stat.isDirectory()) file = path.join(file,'index.html');
    const bytes = await fs.readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404,{'Content-Type':'text/plain'});res.end('This public resource was not available in the source capture.'); }
}).listen(port,'127.0.0.1',() => console.log(`Local replica: http://localhost:${port}`));
