import {createHeroLayers} from './hero-layers.js';
const hero=document.querySelector('.strata-hero');
const stage=hero.querySelector('.hero-stage');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const chapters=[{name:'Interface',mode:'interface',duration:2200},{name:'Layers',mode:'layers',duration:10500}];
let index=0,paused=false,inspecting=false,inView=true,disposed=false,progress=null;
const ui=createHeroLayers(stage,value=>{inspecting=value;sync();});
function sync(){
 if(disposed)return;
 const stopped=paused||inspecting||reduced.matches||!inView||document.hidden;
 hero.dataset.motion=stopped?'paused':'running';
 document.querySelector('.family-header').dataset.motion=reduced.matches||document.hidden?'paused':'running';
 const button=document.querySelector('#hero-motion');button.textContent=reduced.matches?'Motion off':paused?'Play':'Pause';button.disabled=reduced.matches;button.setAttribute('aria-pressed',String(paused||reduced.matches));
 if(stopped)progress?.pause();else progress?.play();
 ui.sync(stopped,Number(progress?.currentTime)||0);
}
function show(next){
 progress?.cancel();index=next;inspecting=false;
 const chapter=chapters[index];hero.dataset.chapter=chapter.mode;
 ui.start(chapter.mode,chapter.duration);
 hero.querySelectorAll('[data-reel]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.reel)===index)));
 progress=hero.querySelector('.reel-progress i').animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:chapter.duration,fill:'forwards'});
 progress.finished.then(()=>{if(!disposed)show((index+1)%chapters.length);}).catch(()=>{});sync();
}
hero.querySelectorAll('[data-reel]').forEach(button=>button.onclick=()=>show(Number(button.dataset.reel)));
document.querySelector('#hero-motion').onclick=()=>{paused=!paused;sync();};
const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();});observer.observe(stage);
reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
show(0);
window.addEventListener('pagehide',event=>{if(event.persisted){inView=false;sync();}else{disposed=true;observer.disconnect();progress?.cancel();ui.destroy();}});
window.addEventListener('pageshow',event=>{if(event.persisted){inView=true;sync();}});
