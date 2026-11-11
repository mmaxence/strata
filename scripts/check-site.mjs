import {readdir,readFile,stat} from 'node:fs/promises';
import {resolve,relative,dirname,extname} from 'node:path';
const root=resolve(process.argv[2]||new URL('../site-dist',import.meta.url).pathname);
async function walk(dir){const files=[];for(const item of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,item.name);if(item.isDirectory())files.push(...await walk(path));else files.push(path);}return files;}
let checked=0;
for(const file of await walk(root)){
 if(extname(file)!=='.html')continue;
 const html=await readFile(file,'utf8');const base=html.match(/<base\s+href="([^"]+)"/i)?.[1];
 const origin=new URL(base||'./',new URL('file://'+file));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)throw Error('Duplicate id in '+relative(root,file));
 for(const match of html.replace(/<base[^>]*>/gi,'').matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const value=match[1];if(/^(?:[a-z]+:|\/\/)/i.test(value)||value.startsWith('#'))continue;
  const target=new URL(value,origin);if(target.protocol!=='file:')continue;
  let path=decodeURIComponent(target.pathname);if(!path.startsWith(root+'/'))throw Error('Link escapes site: '+value);
  let info;try{info=await stat(path);if(info.isDirectory()){path=resolve(path,'index.html');await stat(path);}}catch{throw Error(relative(root,file)+' has missing resource '+value);}
  checked++;
 }
}
console.log(`PASS ${checked} local HTML resource references and unique IDs in site-dist`);
