import {createScene} from '../src/strata.js';
import {measureScene} from './measure.js';
const stage=document.getElementById('bench'),button=document.getElementById('run'),status=document.getElementById('status'),output=document.getElementById('results');
stage.querySelector('.camera').innerHTML=Array.from({length:6},(_,i)=>`<article class="surface" data-surface="card-${i}" data-x="${(i%3-1)*270}" data-y="${i<3?-120:120}"><div data-visual><p class="eyebrow">Study ${String(i+1).padStart(2,'0')}</p><div class="swatch"></div><h3>Real HTML</h3><p>Six panels. One moving path.</p></div></article>`).join('');
let scene=createScene(stage,{observeVisibility:false}),running=false;let measurementAbort=null;
scene.pause();
try{const response=await fetch('./size.json');if(!response.ok)throw Error('Size report missing');const sizes=await response.json();document.getElementById('size').textContent=(sizes.totalGzipBytes/1024).toFixed(1)+' KiB';}catch{document.getElementById('size').textContent='Run build';}
button.onclick=async()=>{
 if(running)return;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){status.textContent='Reduced motion is enabled. The runtime intentionally keeps this scene still.';return;}
 if(stage.clientWidth<650){status.textContent='Use a viewport wider than 700px to measure spatial motion. Compact layouts intentionally stay flat.';return;}
 running=true;measurementAbort=new AbortController();button.disabled=true;output.replaceChildren();stage.scrollIntoView({block:'center',behavior:'instant'});
 try{
  const report=await measureScene(scene,{signal:measurementAbort.signal,onProgress:text=>status.textContent=text});const budget=report.baseline.medianMs;
  output.innerHTML=`<div class="metrics"><div class="card"><span class="caption">Idle median</span><span class="value">${budget.toFixed(2)} ms</span></div><div class="card"><span class="caption">Active median</span><span class="value">${report.active.medianMs.toFixed(2)} ms</span></div><div class="card"><span class="caption">Active p95</span><span class="value">${report.active.p95Ms.toFixed(2)} ms</span></div><div class="card"><span class="caption">Intervals > 1.5× idle median</span><span class="value">${report.active.over1_5xBaseline} / 180</span></div></div>`;
  document.getElementById('raw').textContent=JSON.stringify(report,null,2);status.textContent='Complete. Scene paused; results describe this run only.';
 }catch(error){scene.pause();status.textContent=error.message;}finally{running=false;measurementAbort=null;button.disabled=false;}
};
addEventListener('pagehide',event=>{if(event.persisted)scene.pause();else scene.destroy();});

addEventListener('visibilitychange',()=>{if(running&&document.hidden)measurementAbort?.abort();});
