import {createScene} from '../src/strata.js';
import {measureScene} from '../performance/measure.js';
export function mountBenchmark(root){
 const button=root.querySelector('[data-bench-run]'),cancel=root.querySelector('[data-bench-cancel]'),status=root.querySelector('[data-bench-status]'),panel=root.querySelector('[data-bench-panel]'),stage=root.querySelector('.inline-bench-scene'),results=root.querySelector('[data-bench-results]');
 let scene,abort;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 async function run(){
  if(abort)return;
  if(reduced.matches){status.textContent='Reduced motion is on. The runtime keeps spatial motion still; turn it off to run this motion benchmark.';return;}
  if(root.clientWidth<650){status.textContent='Open this section in a wider window to benchmark the six-card spatial scene. Compact layouts stay flat.';return;}
  panel.hidden=false;results.hidden=true;button.disabled=true;cancel.hidden=false;
  stage.scrollIntoView({block:'center',behavior:'instant'});
  if(!scene){
   stage.querySelector('.camera').innerHTML=Array.from({length:6},(_,i)=>`<article class="surface" data-surface="benchmark-${i}" data-x="${(i%3-1)*270}" data-y="${i<3?-120:120}"><div data-visual><small>STRATA / 0${i+1}</small><div class="inline-bench-swatch"></div><strong>Real HTML</strong><span>Six panels. One moving path.</span></div></article>`).join('');
   scene=createScene(stage,{observeVisibility:false});scene.pause();
  }
  abort=new AbortController();
  try{
   const report=await measureScene(scene,{signal:abort.signal,onProgress:text=>status.textContent=text});
   const {baseline,active,intervals}=report;
   const ceiling=Math.max(active.maxMs,baseline.medianMs*2,1),height=90,width=720;
   const y=v=>height-v/ceiling*(height-8);
   const points=intervals.map((v,i)=>`${(i/(intervals.length-1)*width).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
   results.innerHTML=`<div class="inline-bench-numbers"><div><span>Idle median</span><strong>${baseline.medianMs.toFixed(2)}<small>ms</small></strong></div><div><span>Moving median</span><strong>${active.medianMs.toFixed(2)}<small>ms</small></strong></div><div><span>Moving p95</span><strong>${active.p95Ms.toFixed(2)}<small>ms</small></strong></div></div><figure><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="180 frame intervals. Median ${active.medianMs.toFixed(2)} milliseconds; 95th percentile ${active.p95Ms.toFixed(2)} milliseconds; maximum ${active.maxMs.toFixed(2)} milliseconds."><line x1="0" x2="${width}" y1="${y(baseline.medianMs)}" y2="${y(baseline.medianMs)}" stroke="#899ca0" stroke-dasharray="4 5"/><polyline points="${points}" fill="none" stroke="#d1e8ae" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><figcaption><span>180 frames · dashed line: idle median</span><span>${active.over1_5xBaseline} above 1.5× baseline · peak ${active.maxMs.toFixed(2)} ms</span></figcaption></figure><p class="inline-bench-footnote">p95: 95% of intervals were at or below this value. Browser scheduling, not input latency. This device, this run.</p>`;
   results.hidden=false;status.textContent='Complete. Scene paused.';button.textContent='Run again';
  }catch(error){status.textContent=error.message;}finally{abort=null;button.disabled=false;cancel.hidden=true;}
 }
 const stop=()=>abort?.abort();
 button.onclick=run;cancel.onclick=stop;
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 reduced.addEventListener('change',()=>{if(reduced.matches)stop();});
 new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();}).observe(stage);
 window.addEventListener('pagehide',event=>{stop();if(!event.persisted)scene?.destroy();});
 return {run};
}
