import {cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),out=root+'/site-dist';
const siteURL=(process.env.SITE_URL||'https://mmaxence.github.io/strata/').replace(/\/?$/, '/');
execFileSync(process.execPath,[root+'/scripts/measure-size.mjs'],{stdio:'inherit'});
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['demo','src','documentation','performance','examples','audit','research','README.md','LICENSE','ASSETS.md','llms.txt','agent-guide.md','overview.html','AGENTS.md'])await cp(root+'/'+name,out+'/'+name,{recursive:true});
await mkdir(out+'/test',{recursive:true});
for(const name of ['browser.html','browser.mjs'])await cp(root+'/test/'+name,out+'/test/'+name);
await writeFile(out+'/index.html',(await readFile(root+'/demo/index.html','utf8')).replace('<head>','<head><base href="./demo/">').replaceAll('href="#workspace"','href="../#workspace"'));
await writeFile(out+'/.nojekyll','');
await writeFile(out+'/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['','overview.html','documentation/','performance/','research/','examples/basic/','examples/workspace/'].map(p=>`<url><loc>${siteURL}${p}</loc></url>`).join('')+'</urlset>\n');

for(const [file,path] of [['index.html',''],['demo/index.html',''],['overview.html','overview.html'],['documentation/index.html','documentation/'],['performance/index.html','performance/'],['research/index.html','research/'],['examples/basic/index.html','examples/basic/'],['examples/workspace/index.html','examples/workspace/']]) {
 const page=await readFile(out+'/'+file,'utf8');
 const title=page.match(/<title>([^<]+)<\/title>/)?.[1]||'Strata';
 const description=page.match(/<meta name="description" content="([^"]+)"/)?.[1]||'Spatial interfaces built from real HTML.';
 const url=siteURL+path;
 const meta=`<meta name="robots" content="index,follow,max-image-preview:large"><link rel="alternate" type="text/plain" href="${siteURL}llms.txt" title="Agent resource index"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}"><meta property="og:image" content="${siteURL}demo/assets/orbit.jpg"><meta name="twitter:card" content="summary_large_image">`;
 const schema=file==='index.html'?'<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'SoftwareSourceCode',name:'Strata',description:'Dependency-free spatial interfaces built from real HTML panels.',version:'0.1.0-alpha.1',license:'https://opensource.org/license/mit',programmingLanguage:'JavaScript',runtimePlatform:'Web browser',codeRepository:'https://github.com/mmaxence/strata',isAccessibleForFree:true,url:siteURL,author:{'@type':'Person',name:'Maxence Mauduit',url:'https://mmaxence.me/'}})+'</script>':'';
 await writeFile(out+'/'+file,page.replace('</head>',meta+schema+'</head>'));
}
await writeFile(out+'/robots.txt',`# Project-local copy; origin-wide rules belong at /robots.txt.
User-agent: *
Allow: /
Sitemap: ${siteURL}sitemap.xml
`);
const fullReference=await Promise.all(['README.md','agent-guide.md','src/strata.d.ts'].map(async file=>`\n\n# ${file}\n\n${await readFile(root+'/'+file,'utf8')}`));
await writeFile(out+'/llms-full.txt',`# Strata — complete integration reference\n\nCanonical site: ${siteURL}\nSource: https://github.com/mmaxence/strata\n\n`+fullReference.join('\n'));
execFileSync(process.execPath,[root+'/scripts/check-site.mjs',out],{stdio:'inherit'});
console.log('Built site-dist. Publication is a separate, manual release step.');
