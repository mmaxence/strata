const scene=document.querySelector('.flight-scene');
const rocket=scene.querySelector('.flight-rocket');
const cards=[...scene.querySelectorAll('.flight-panel')];
const button=document.querySelector('#flight-pause');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const particles=Array.from({length:16},(_,i)=>{const particle=document.createElement('i');particle.className='reactor-particle';rocket.prepend(particle);return particle;});
// Blend the two depth layers only while crossing the glass plane.
const underpass=rocket.cloneNode(true);
underpass.innerHTML=underpass.innerHTML.replace(/id="(rocket-[^"]+)"/g,'id="$1-under"').replace(/url\(#(rocket-[^)]+)\)/g,'url(#$1-under)');
underpass.classList.add('flight-underpass');
underpass.style.zIndex='10';
scene.append(underpass);
const lowerParticles=[...underpass.querySelectorAll('.reactor-particle')];
let frame=0,last=0,time=0,visible=false,paused=false,geometry=[];
function measure(){
  const dashboard=scene.querySelector('.flight-dashboard');
  geometry=cards.map(card=>({x:dashboard.offsetLeft+card.offsetLeft+card.offsetWidth/2,y:dashboard.offsetTop+card.offsetTop+card.offsetHeight/2,w:card.offsetWidth,h:card.offsetHeight}));
}
function draw(delta=1000/60){
  const w=scene.clientWidth,h=scene.clientHeight;
  const t=time/14000*Math.PI*2;
  // Both depth crossings pass through the open horizontal corridor.
  const stacked=geometry[1]&&Math.abs((geometry[1].y-geometry[1].h/2)-(geometry[0].y-geometry[0].h/2))>10;
  const upper=geometry[stacked?1:0],lower=geometry[2];
  if(!upper||!lower)return;
  const corridor=(upper.y+upper.h/2+lower.y-lower.h/2)/2;
  const radius=Math.max(30,w/2-90);
  const vertical=Math.min(stacked?330:200,corridor-100,h-corridor-100);
  const x=w/2+radius*Math.sin(t);
  const y=corridor+vertical*Math.sin(2*t);
  const angle=Math.atan2(vertical*2*Math.cos(2*t),radius*Math.cos(t))*180/Math.PI;
  const depth=Math.sin(t);
  const above=depth>0;
  const bank=-11*Math.sin(t);
  const pitch=4*Math.sin(2*t);
  rocket.dataset.layer=above?'above':'below';
  rocket.style.zIndex='30';
  const crossing=Math.max(0,Math.min(1,(depth+.14)/.28));
  const blend=crossing*crossing*(3-2*crossing);
  rocket.style.opacity=String(blend);
  underpass.style.opacity=String(1-blend);
  rocket.style.transform=`translate(${x-rocket.offsetWidth/2}px,${y-rocket.offsetHeight/2}px) perspective(700px) rotateZ(${angle}deg) rotateX(${bank}deg) rotateY(${pitch}deg) scale(${1+.28*depth})`;
  underpass.style.transform=rocket.style.transform;
  particles.forEach((particle,i)=>{
    const age=(time/850+i/particles.length)%1;
    const spread=Math.sin(i*2.4)*age*12;
    particle.style.transform=`translate(${-age*64}px,${spread}px) scale(${1-age*.85})`;
    particle.style.opacity=reduced.matches?'0':String(Math.sin(Math.PI*age)*.8);
    lowerParticles[i].style.cssText=particle.style.cssText;
  });
  cards.forEach((card,i)=>{
    const r=geometry[i];if(!r)return;
    
    const proximity=Math.exp(-2.2*((x-r.x)**2/(r.w*r.w)+(y-r.y)**2/(r.h*r.h)));
    const lift=proximity*(depth<0?-depth:-.4*depth);
    card.style.setProperty('--shadow-x',`${x-r.x+r.w/2+12}px`);
    card.style.setProperty('--shadow-y',`${y-r.y+r.h/2+16+depth*8}px`);
    card.style.setProperty('--shadow-opacity',reduced.matches?'0':String(Math.max(0,depth)*.72));
    card.style.setProperty('--shadow-width',`${48+Math.max(0,depth)*24}px`);
    // Damped movement makes panels rise and land softly on each pass.
    const ease=1-Math.exp(-delta/360);
    const damp=(name,target)=>{
      const previous=parseFloat(card.style.getPropertyValue(name))||0;
      card.style.setProperty(name,(previous+(target-previous)*ease).toFixed(4));
    };
    damp('--lift',lift);
    damp('--tilt-x',Math.max(-1,Math.min(1,(y-r.y)/(r.h/2)))*lift*-.9);
    damp('--tilt-y',Math.max(-1,Math.min(1,(x-r.x)/(r.w/2)))*lift*.9);
  });
}
function tick(now){
  const delta=last?Math.min(now-last,40):0;
  time+=delta;last=now;draw(delta);frame=requestAnimationFrame(tick);
}
function sync(){
  cancelAnimationFrame(frame);frame=0;last=0;
  const running=!paused&&!reduced.matches&&!scene.hidden&&visible&&!document.hidden;
  button.textContent=reduced.matches?'Motion off':paused?'Resume flight':'Pause flight';
  button.disabled=reduced.matches;button.setAttribute('aria-pressed',String(paused));
  if(running){measure();frame=requestAnimationFrame(tick);}else if(reduced.matches){time=1000;draw();cards.forEach(card=>['--lift','--tilt-x','--tilt-y'].forEach(name=>card.style.setProperty(name,0)));}
}
button.addEventListener('click',()=>{paused=!paused;sync();});
new MutationObserver(sync).observe(scene,{attributes:true,attributeFilter:['hidden']});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(scene);
new ResizeObserver(()=>{measure();if(!frame)draw();}).observe(scene);
reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;last=0;});
window.addEventListener('pageshow',sync);
