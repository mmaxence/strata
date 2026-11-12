import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const read=file=>readFile(new URL('../'+file,import.meta.url),'utf8');
const pkg=JSON.parse(await read('package.json')),readme=await read('README.md'),types=await read('src/strata.d.ts');
assert.equal(pkg.name,'@strata-ui/core');assert.equal(pkg.version,'0.1.0-alpha.1');assert.equal(pkg.private,true);assert.deepEqual(pkg.sideEffects,['./src/strata.css']);assert(!pkg.dependencies);
const section=types.split('export interface SceneController {')[1].split('\n}')[0];
const methods=[...section.matchAll(/^\s+(\w+)\(/gm)].map(x=>x[1]);
for(const method of methods)assert(readme.includes(method+'('),'README omits '+method);
for(const member of ['state','stats','isPaused'])assert(readme.includes(member));
for(const file of ['README.md','agent-guide.md','src/strata.js','src/packing.js','src/dom-state.js','src/strata.css','src/strata.d.ts'])assert.equal(await read('site-dist/'+file),await read(file),file+' site copy stale');
for(const example of ['basic','workspace']){
 const rel='examples/'+example+'/';assert.equal(await read('site-dist/'+rel+'app.js'),await read(rel+'app.js'));
 const html=await read(rel+'index.html'),map=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
 for(const target of Object.values(map.imports))await stat(new URL(target,new URL('../'+rel+'index.html',import.meta.url)));
 assert(!/fonts\.googleapis|<img|<video/.test(html),'examples must remain media-free');
}
console.log(JSON.stringify({pass:true,version:pkg.version,controllerMethods:methods.length,readonlyMembers:3,sourceAndBuiltExamples:2,privateSafeguard:true}));
