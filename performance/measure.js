const percentile=(values,q)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*q))];
export async function measureScene(scene,{onProgress=()=>{},signal}={}){
 const check=()=>{if(signal?.aborted)throw new Error('Measurement stopped.');if(document.hidden)throw new Error('Keep this tab visible and run again.');};
 async function sample(count){
  const values=[];let last;
  for(let i=0;i<=count;i++){
   check();
   const now=await new Promise((resolve,reject)=>{
    const abort=()=>{cancelAnimationFrame(frame);reject(new Error('Measurement stopped.'));};
    const frame=requestAnimationFrame(time=>{signal?.removeEventListener('abort',abort);resolve(time);});
    signal?.addEventListener('abort',abort,{once:true});
   });
   check();if(last!==undefined)values.push(now-last);last=now;
  }
  return values;
 }
 try{
  scene.reset();scene.pause();onProgress('Measuring the idle baseline…');
  const baseline=await sample(60),budget=percentile(baseline,.5);
  scene.setPath('belt',{diameter:700,axis:12,speed:1});scene.resume();
  onProgress('Warming up six moving cards…');await sample(30);
  onProgress('Measuring 180 animation frames…');const intervals=await sample(180);
  const report={timestamp:new Date().toISOString(),panels:6,viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},baseline:{samples:60,medianMs:budget,p95Ms:percentile(baseline,.95)},active:{samples:180,medianMs:percentile(intervals,.5),p95Ms:percentile(intervals,.95),maxMs:Math.max(...intervals),over1_5xBaseline:intervals.filter(v=>v>budget*1.5).length},controller:scene.stats,intervals};
  scene.pause();report.pausedController=scene.stats;return report;
 }finally{scene.pause();}
}
