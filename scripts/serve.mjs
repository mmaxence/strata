import http from 'node:http';
import {readFile, realpath} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const port=Number(process.env.PORT||4414);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.xml':'application/xml; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=resolve(root,'.'+(pathname==='/'?'/demo/index.html':pathname));
  if(pathname.endsWith('/')&&pathname!=='/')file=resolve(file,'index.html');
  file=await realpath(file);
  if(!file.startsWith(root+sep)||file.split(sep).some(part=>part.startsWith('.')))throw Error('Not found');
  const data=await readFile(file);
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use.`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Strata: http://127.0.0.1:${port}/demo/index.html`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit()));
