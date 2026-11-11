// One interface, reused across every hero arrangement.
export function createHeroLayers(stage,onInspect){
 const host=document.createElement('div');host.className='hero-ui-demo';
 const fit=document.createElement('div');fit.className='hero-ui-fit';
 const board=document.querySelector('.explosion-board').cloneNode(true);
 board.className='hero-ui-board';board.removeAttribute('data-surface');board.querySelector('.sr-only')?.remove();
 board.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
 board.querySelectorAll('[data-focus]').forEach(node=>node.removeAttribute('data-focus'));
 board.querySelectorAll('button').forEach(button=>{const label=document.createElement('span');label.className='explosion-action';label.innerHTML=button.innerHTML;button.replaceWith(label);});
 board.querySelector('.explosion-header h4').textContent='A space for ideas';
 board.querySelector('.explosion-header small').textContent='STUDIO / WORKSPACE';
 board.querySelector('.explosion-chart').innerHTML=`<span class="explosion-label">04 / REFERENCE ORBIT</span><div class="nested-module-head"><strong>References</strong><small>Drag to explore</small></div><div class="nested-orbit">${['Form','Light','Type'].map((name,i)=>`<div class="nested-reference"><img src="assets/orbit.jpg" alt="" style="filter:hue-rotate(${i*95}deg)"><span>${name}</span></div>`).join('')}</div><p class="nested-caption">Three directions. One shared space.</p>`;
 board.querySelector('.explosion-metrics').innerHTML=`<span class="explosion-label">05 / WORKING STACK</span><div class="nested-module-head"><strong>Working stack</strong></div><div class="nested-stack">${['Brief','Notes','Review'].map((name,i)=>`<div class="nested-document"><small>0${i+1} / STUDIO</small><strong>${name}</strong><i></i><i></i><i></i><span>${['Shape the idea','Make it clearer','Ready to share'][i]}</span></div>`).join('')}</div>`;
 board.querySelector('.explosion-footer').innerHTML='<span class="explosion-label">06 / NEXT STEP</span><div><small>YOUR NEXT CHAPTER</small><strong>Bring the ideas together.</strong></div><span class="explosion-action">New draft +</span>';
 fit.append(board);host.append(fit);stage.prepend(host);
 const layers=[...board.querySelectorAll('.explosion-layer')],base=board.querySelector('.explosion-base');
 const nodes=[board,base,...layers];
 let cardReader=null;
 let animations=[],focusAnimations=[],selected=null,returning=false,saved=[],durationNow=0,drag=null,suppressClick=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const read=node=>{const s=getComputedStyle(node);return node===board?{transform:s.transform}:{transform:s.transform,opacity:s.opacity};};
 const ease='cubic-bezier(.22,1,.36,1)';
 const orbitMotion=[...board.querySelectorAll('.nested-reference')].map((card,i)=>card.animate(Array.from({length:65},(_,n)=>{
  const a=n/64*Math.PI*2+i*Math.PI*2/3;
  return {offset:n/64,transform:`translate3d(calc(${Math.sin(a)*78}px * var(--hero-orbit-reach,1)),calc(${Math.cos(a)*13}px * var(--hero-orbit-reach,1)),calc(${Math.cos(a)*35}px * var(--hero-orbit-depth,1))) rotateY(${-Math.sin(a)*15}deg)`};
 }),{duration:9000,iterations:Infinity}));
 const stackMotion=[...board.querySelectorAll('.nested-document')].map((card,i)=>card.animate([
  {offset:0,transform:'translate3d(0px,0px,24px) rotate(-3deg)'},
  {offset:.2,transform:'translate3d(0px,0px,24px) rotate(-3deg)',easing:ease},
  {offset:.32,transform:'translate3d(-35px,14px,30px) rotate(-10deg)',easing:ease},
  {offset:.42,transform:'translate3d(8px,-8px,-16px) rotate(5deg)'},
  {offset:.68,transform:'translate3d(4px,-4px,0px) rotate(1deg)'},
  {offset:1,transform:'translate3d(0px,0px,24px) rotate(-3deg)'}
 ],{duration:9000,iterations:Infinity,delay:-i*3000}));
 const nestedMotion=[...orbitMotion,...stackMotion];
 function pose(mode,i){return mode==='interface'?'translateZ(0px)':`translateZ(${layers[i].style.getPropertyValue('--z')}px)`;}
 function start(mode,duration){
  if(cardReader){cardReader.source.style.visibility='';cardReader.element.remove();cardReader=null;host.dataset.cardReading='false';}
  durationNow=duration;
  const before=nodes.map(read);
  const orbitStyle=getComputedStyle(board);
  const reach=orbitStyle.getPropertyValue('--hero-orbit-reach')||'1';
  const orbitDepth=orbitStyle.getPropertyValue('--hero-orbit-depth')||'1';
  const documents=[...board.querySelectorAll('.nested-document')];
  const documentPositions=documents.map(card=>getComputedStyle(card).translate);
  animations.forEach(a=>a.cancel());focusAnimations.forEach(a=>a.cancel());focusAnimations=[];
  selected=null;returning=false;host.dataset.inspecting='false';
  layers.forEach(layer=>{layer.dataset.selected='false';layer.setAttribute('aria-pressed','false');});
  const options={duration,fill:'both'};
  const boardPose=mode==='interface'?'rotateX(5deg) rotateZ(-2deg)':'rotateX(40deg) rotateZ(-20deg)';
  const settle=(from,to)=>mode==='interface'?[{...from,offset:0},{...from,offset:.08,easing:ease},{...to,offset:.32},{...to,offset:1}]:[{...from,offset:0,easing:ease},{...to,offset:.14},{...to,offset:1}];
  animations=[board.animate(settle(before[0],{transform:boardPose}),options),base.animate(settle(before[1],{opacity:['orbit','focus'].includes(mode)?.06:1}),options)];
  layers.forEach((layer,i)=>{
   let frames=settle(before[i+2],{transform:pose(mode,i),opacity:mode==='focus'&&i!==3?.5:1});
   animations.push(layer.animate(frames,options));
  });
  const expanded=mode==='layers';
  const reachTarget=expanded?'1.65':'1',depthTarget=expanded?'2.1':'1';
  const innerStart=expanded?.07:0,innerEnd=expanded?.24:.15;
  animations.push(board.animate([
   {offset:0,'--hero-orbit-reach':reach,'--hero-orbit-depth':orbitDepth},
   {offset:innerStart,'--hero-orbit-reach':reach,'--hero-orbit-depth':orbitDepth,easing:ease},
   {offset:innerEnd,'--hero-orbit-reach':reachTarget,'--hero-orbit-depth':depthTarget},
   {offset:1,'--hero-orbit-reach':reachTarget,'--hero-orbit-depth':depthTarget}
  ],options));
  documents.forEach((card,i)=>{
   const spread=expanded?`${(i-1)*46}px ${i*12-18}px ${55+i*38}px`:'0px 0px 0px';
   const delay=expanded?.07+i*.02:0;
   animations.push(card.animate([
    {offset:0,translate:documentPositions[i]},
    {offset:delay,translate:documentPositions[i],easing:ease},
    {offset:expanded?.23+i*.02:.14,translate:spread},
    {offset:1,translate:spread}
   ],options));
  });
  board.querySelectorAll('.explosion-label').forEach(label=>label.style.opacity=mode==='layers'?'.7':'0');
  animations.forEach(a=>a.pause());
 }
 function sync(stopped,time){nestedMotion.forEach(a=>stopped?a.pause():a.play());if(reduced.matches)time=durationNow*.4;animations.forEach(a=>{a.currentTime=time;stopped?a.pause():a.play();});}
 function inspect(layer){
  if(returning)return;
  if(selected===layer){close();return;}
  if(!selected){animations.forEach(a=>a.pause());saved=nodes.map(read);onInspect(true);}
  const before=nodes.map(read);focusAnimations.forEach(a=>a.cancel());selected=layer;host.dataset.inspecting='true';
  layers.forEach(item=>{item.dataset.selected=String(item===layer);item.setAttribute('aria-pressed',String(item===layer));});
  const target=nodes.map((node,i)=>i===0?{transform:'rotateX(0deg) rotateZ(0deg)'}:i===1?{...saved[i],opacity:.18}:node===layer?{transform:`translate3d(${320-layer.offsetLeft-layer.offsetWidth/2}px,${210-layer.offsetTop-layer.offsetHeight/2}px,320px)`,opacity:1}:{...saved[i],opacity:.35});
  focusAnimations=nodes.map((node,i)=>node.animate([before[i],target[i]],{duration:reduced.matches?0:750,easing:ease,fill:'both'}));
 }
 function close(){
  if(!selected||returning)return;returning=true;
  const before=nodes.map(read);focusAnimations.forEach(a=>a.cancel());
  focusAnimations=nodes.map((node,i)=>node.animate([before[i],saved[i]],{duration:reduced.matches?0:750,easing:ease,fill:'both'}));
  const current=focusAnimations;
  Promise.all(current.map(a=>a.finished)).then(()=>{
   if(focusAnimations!==current)return;
   current.forEach(a=>a.cancel());focusAnimations=[];selected=null;returning=false;host.dataset.inspecting='false';
   layers.forEach(item=>{item.dataset.selected='false';item.setAttribute('aria-pressed','false');});onInspect(false);
  }).catch(()=>{});
 }
 function readCard(source){
  if(cardReader){dismissCard(()=>readCard(source));return;}
  if(selected||returning)return;
  onInspect(true);
  const rect=source.getBoundingClientRect(),area=stage.getBoundingClientRect();
  const width=source.offsetWidth,height=source.offsetHeight;
  const element=document.createElement('div');element.className='hero-card-reader';element.tabIndex=0;element.setAttribute('role','dialog');element.setAttribute('aria-label',`${source.textContent.trim()} — press Escape to return`);
  const clone=source.cloneNode(true);clone.removeAttribute('role');clone.removeAttribute('tabindex');clone.classList.add('reader-content');element.append(clone);stage.append(element);
  element.style.width=`${width}px`;element.style.height=`${height}px`;
  // Preserve the actual chain of rotations instead of flattening to a rectangle.
  let orientation=new DOMMatrix();
  for(let node=source;node&&node!==host;node=node.parentElement){
   const matrix=new DOMMatrix(getComputedStyle(node).transform);
   matrix.m41=0;matrix.m42=0;matrix.m43=0;
   orientation=matrix.multiply(orientation);
  }
  const corners=[[0,0],[width,0],[0,height],[width,height]].map(([x,y])=>new DOMPoint(x,y,0).matrixTransform(orientation));
  const x=rect.x-area.x-Math.min(...corners.map(p=>p.x));
  const y=rect.y-area.y-Math.min(...corners.map(p=>p.y));
  const from=`translate(${x}px,${y}px) ${orientation.toString()}`;
  const lifted=`translate(${x}px,${y-24}px) ${orientation.toString()} scale(1.12)`;
  const scale=Math.min(2.8,(area.width-60)/width,(area.height-210)/height);
  const to=`translate(${(area.width-width*scale)/2}px,${(area.height-height*scale)/2}px) scale(${scale})`;
  source.style.visibility='hidden';host.dataset.cardReading='true';
  const opening=element.animate([{transform:from,offset:0,easing:ease},{transform:lifted,offset:.3,easing:ease},{transform:to,offset:1}],{duration:reduced.matches?0:850,fill:'forwards'});
  cardReader={source,element,from,lifted,to,opening,closing:false};
  element.focus({preventScroll:true});
  let held=null,moved=false;
  element.addEventListener('pointerdown',event=>{if(event.button!==0)return;held={id:event.pointerId,x:event.clientX,y:event.clientY};moved=false;element.setPointerCapture(event.pointerId);event.stopPropagation();});
  element.addEventListener('pointermove',event=>{
   if(reduced.matches)return;
   const r=element.getBoundingClientRect();
   const x=Math.max(-1,Math.min(1,(event.clientX-r.x)/r.width*2-1)),y=Math.max(-1,Math.min(1,(event.clientY-r.y)/r.height*2-1));
   clone.style.setProperty('--reader-rx',`${-y*5}deg`);clone.style.setProperty('--reader-ry',`${x*7}deg`);
   if(held){const dx=event.clientX-held.x,dy=event.clientY-held.y;moved ||= Math.hypot(dx,dy)>5;clone.style.setProperty('--reader-dx',`${Math.max(-22,Math.min(22,dx/scale))}px`);clone.style.setProperty('--reader-dy',`${Math.max(-22,Math.min(22,dy/scale))}px`);}
  });
  const reset=()=>{for(const key of ['rx','ry','dx','dy'])clone.style.removeProperty(`--reader-${key}`);};
  const release=event=>{held=null;reset();if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);};
  element.addEventListener('pointerup',release);element.addEventListener('pointercancel',release);element.addEventListener('pointerleave',()=>{if(!held)reset();});
  element.addEventListener('click',event=>{event.stopPropagation();if(!moved)dismissCard();});
  element.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();dismissCard();}});
 }
 function dismissCard(complete){
  const current=cardReader;if(!current||current.closing)return;current.closing=true;
  const from=getComputedStyle(current.element).transform;current.opening.cancel();
  current.element.querySelector('.reader-content').removeAttribute('style');
  const closing=current.element.animate([{transform:from,offset:0,easing:ease},{transform:current.lifted,offset:.7,easing:ease},{transform:current.from,offset:1}],{duration:reduced.matches?0:850,fill:'forwards'});
  closing.finished.then(()=>{
   if(cardReader!==current)return;
   current.source.style.visibility='';current.element.remove();cardReader=null;host.dataset.cardReading='false';current.source.focus({preventScroll:true});onInspect(false);complete?.();
  }).catch(()=>{});
 }
 board.querySelectorAll('.nested-reference,.nested-document').forEach(card=>{
  card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`${card.textContent.trim()} — open card`);
  card.addEventListener('click',event=>{event.stopPropagation();if(performance.now()>suppressClick)readCard(card);});
  card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();readCard(card);}});
 });
 layers.forEach(layer=>{
  layer.tabIndex=0;layer.setAttribute('role','button');layer.setAttribute('aria-label',`${layer.className.includes('sidebar')?'Navigation':layer.querySelector('h4,strong')?.textContent||'Actions'} — bring forward`);
  layer.addEventListener('click',event=>{event.stopPropagation();if(cardReader){dismissCard();return;}if(performance.now()>suppressClick)inspect(layer);});
  layer.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();inspect(layer);}if(event.key==='Escape')close();});
 });
 stage.addEventListener('click',event=>{if(event.target.closest('.reel-transport'))return;if(cardReader){dismissCard();return;}if(!event.target.closest('.explosion-layer'))close();});
 stage.addEventListener('keydown',event=>{if(event.key==='Escape'){if(cardReader)dismissCard();else close();}});
 function enableScrub(orbit,motions){
 orbit.addEventListener('pointerdown',event=>{
  if(event.button!==0||!event.isPrimary||reduced.matches)return;
  event.stopPropagation();drag={id:event.pointerId,x:event.clientX,times:motions.map(a=>a.currentTime),moved:false};
 });
 orbit.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const dx=event.clientX-drag.x;if(!drag.moved&&Math.abs(dx)<6)return;
  if(!drag.moved){drag.moved=true;orbit.setPointerCapture(event.pointerId);}
  event.preventDefault();event.stopPropagation();suppressClick=performance.now()+400;
  motions.forEach((a,i)=>{a.pause();a.currentTime=((drag.times[i]-dx*30)%9000+9000)%9000;});
 });
 const endDrag=event=>{if(!drag||drag.id!==event.pointerId)return;const moved=drag.moved;drag=null;if(orbit.hasPointerCapture(event.pointerId))orbit.releasePointerCapture(event.pointerId);if(moved){suppressClick=performance.now()+400;if(stage.closest('.strata-hero').dataset.motion==='running')motions.forEach(a=>a.play());}};
 orbit.addEventListener('pointerup',endDrag);orbit.addEventListener('pointercancel',endDrag);
 }
 enableScrub(board.querySelector('.nested-orbit'),orbitMotion);
 enableScrub(board.querySelector('.nested-stack'),stackMotion);
 let turnX=0,turnY=0,compositionDrag=null;
 const setView=(x,y)=>{fit.style.setProperty('--composition-x',`${x}deg`);fit.style.setProperty('--composition-y',`${y}deg`);};
 host.addEventListener('pointerdown',event=>{
  if(cardReader||selected||event.button!==0||!event.isPrimary||event.target.closest('.nested-orbit,.nested-stack'))return;
  compositionDrag={id:event.pointerId,x:event.clientX,y:event.clientY,turnX,turnY,moved:false};
 });
 host.addEventListener('pointermove',event=>{
  if(cardReader||selected||returning)return;
  if(compositionDrag){
   const dx=event.clientX-compositionDrag.x,dy=event.clientY-compositionDrag.y;
   if(!compositionDrag.moved&&Math.hypot(dx,dy)<6)return;
   if(!compositionDrag.moved){compositionDrag.moved=true;host.setPointerCapture(event.pointerId);host.dataset.turning='true';}
   event.preventDefault();suppressClick=performance.now()+400;
   turnX=Math.max(-20,Math.min(20,compositionDrag.turnX-dy*.15));
   turnY=Math.max(-35,Math.min(35,compositionDrag.turnY+dx*.18));setView(turnX,turnY);
  }else if(event.pointerType!=='touch'&&!reduced.matches){
   const r=host.getBoundingClientRect();
   setView(turnX-((event.clientY-r.y)/r.height-.5)*4,turnY+((event.clientX-r.x)/r.width-.5)*6);
  }
 });
 const endTurn=event=>{if(!compositionDrag||compositionDrag.id!==event.pointerId)return;const moved=compositionDrag.moved;compositionDrag=null;delete host.dataset.turning;if(host.hasPointerCapture(event.pointerId))host.releasePointerCapture(event.pointerId);if(moved)suppressClick=performance.now()+400;setView(turnX,turnY);};
 host.addEventListener('pointerup',endTurn);host.addEventListener('pointercancel',endTurn);
 host.addEventListener('pointerleave',()=>{if(!compositionDrag&&!cardReader&&!selected)setView(turnX,turnY);});
 new ResizeObserver(()=>host.style.setProperty('--ui-fit',Math.min(.92,(stage.clientWidth-32)/1000,(stage.clientHeight-180)/620))).observe(stage);
 return {start,sync,destroy(){nestedMotion.forEach(a=>a.cancel());animations.forEach(a=>a.cancel());focusAnimations.forEach(a=>a.cancel());}};
}
