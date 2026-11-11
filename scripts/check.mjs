import {readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
async function walk(dir){const result=[];for(const item of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+item.name;if(item.isDirectory())result.push(...await walk(path));else result.push(path);}return result;}
for(const dir of ['src','demo','scripts','test','performance','examples'])for(const file of await walk(root+'/'+dir))if(/\.(m?js)$/.test(file))execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
const pkg=JSON.parse(await readFile(root+'/package.json'));if(pkg.dependencies&&Object.keys(pkg.dependencies).length)throw Error('Unexpected runtime dependencies');
for(const file of [pkg.exports['.'].import,pkg.exports['.'].types,pkg.exports['./style.css'],'LICENSE'])await readFile(resolve(root,file));
console.log('PASS syntax, package export targets and zero runtime dependencies');
