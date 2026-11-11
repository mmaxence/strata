import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const files=(await readdir(root+'/src')).filter(file=>file.endsWith('.js')||file.endsWith('.css')).sort();
const modules=await Promise.all(files.map(async file=>{const data=await readFile(root+'/src/'+file);return {file:'src/'+file,bytes:data.byteLength,gzipBytes:gzipSync(data,{level:9}).byteLength};}));
const report={version:JSON.parse(await readFile(root+'/package.json')).version,method:'Unminified shipped source modules. Gzip level 9, compressed individually; not a bundled or minified size.',runtimeDependencies:0,modules,totalBytes:modules.reduce((n,m)=>n+m.bytes,0),totalGzipBytes:modules.reduce((n,m)=>n+m.gzipBytes,0)};
await mkdir(root+'/performance',{recursive:true});await writeFile(root+'/performance/size.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.totalBytes} source bytes / ${report.totalGzipBytes} gzip bytes across ${modules.length} runtime JS/CSS files; 0 runtime dependencies.`);

// Keep landing-page measurements aligned with the report on every build.
const landingPath=root+'/demo/index.html';
const landing=await readFile(landingPath,'utf8');
const measured=landing.replace(/(<span data-runtime-gzip>)[^<]*(<\/span>)/,(_,open,close)=>open+(report.totalGzipBytes/1000).toFixed(1)+close).replace(/(<span data-runtime-bytes>)[^<]*(<\/span>)/,(_,open,close)=>open+report.totalGzipBytes.toLocaleString('en-US')+close);
if(measured!==landing)await writeFile(landingPath,measured);
