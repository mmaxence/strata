const root=document.querySelector('.explosion-scene');
const stage=root.querySelector('.explosion-stage');
const button=document.querySelector('#explode-toggle');
const range=document.querySelector('#explode-range');
const output=document.querySelector('#explode-value');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let selected=null;
let amount=0,target=0,frame=0,last=0,intro=0,visited=false;
function paint(){
 root.style.setProperty('--separation',amount);
 positionReadingLayer();
 root.dataset.expanded=String(amount>.1);
 root.querySelectorAll('.explosion-label').forEach(label=>label.style.opacity=Math.max(0,(amount-.35)/.65));
}
function tick(now){
 const dt=last?Math.min(now-last,40):16;last=now;
 amount+=(target-amount)*(1-Math.exp(-dt/210));
 if(Math.abs(target-amount)<.0005)amount=target;
 paint();
 if(amount!==target)frame=requestAnimationFrame(tick);else{frame=0;last=0;}
}
function set(value){
 clearTimeout(intro);target=value;if(value===0){resetAngle();if(selected)inspect(selected);}
 range.value=Math.round(value*100);output.value=`${Math.round(value*100)}%`;
 button.textContent=value>.5?'Assemble view':'Explode view';button.setAttribute('aria-pressed',String(value>.5));
 if(reduced.matches){cancelAnimationFrame(frame);frame=0;amount=target;paint();}
 else if(!frame)frame=requestAnimationFrame(tick);
}
button.onclick=()=>set(target>.5?0:1);
range.oninput=()=>set(Number(range.value)/100);
new ResizeObserver(()=>{root.style.setProperty('--fit',Math.min(1,(stage.clientWidth-24)/820));positionReadingLayer();}).observe(stage);
new MutationObserver(()=>{
 if(root.hidden){clearTimeout(intro);cancelAnimationFrame(frame);frame=0;last=0;}
 else if(!visited){visited=true;if(!reduced.matches)intro=setTimeout(()=>set(1),1200);}
 else set(target);
}).observe(root,{attributes:true,attributeFilter:['hidden']});
reduced.addEventListener('change',()=>set(target));

paint();


const layers=[...root.querySelectorAll('.explosion-layer')];
const note=root.querySelector('.explosion-note');
const descriptions=[
 'Navigation · the workspace’s persistent routes.',
 'Context · the current page and your identity.',
 'Metrics · the key numbers, grouped together.',
 'Content · the main chart and its supporting detail.',
 'Actions · the next step, kept within reach.'
];
function positionReadingLayer(){
 if(!selected)return;
 const inverse=new DOMMatrix().rotateAxisAngle(1,0,0,viewX).rotateAxisAngle(0,1,0,viewY).rotateAxisAngle(1,0,0,amount*48).rotateAxisAngle(0,0,1,amount*-24).inverse();
 const forward=new DOMPoint(0,0,390).matrixTransform(inverse);
 selected.style.setProperty('--inspect-x',`${320-selected.offsetLeft-selected.offsetWidth/2+forward.x}px`);
 selected.style.setProperty('--inspect-y',`${210-selected.offsetTop-selected.offsetHeight/2+forward.y}px`);
 selected.style.setProperty('--inspect-z',`${forward.z}px`);
 const fit=Number(root.style.getPropertyValue('--fit'))||1;
 selected.style.setProperty('--inspect-scale',Math.min(.9/fit,stage.clientWidth*.65/(selected.offsetWidth*fit),stage.clientHeight*.55/(selected.offsetHeight*fit)));
}
const readingAnimations=new Map();
function inspect(layer){
 const previous=selected;
 const next=selected===layer?null:layer;
 const changing=[...new Set([previous,next].filter(Boolean))];
 const snapshot=item=>{const style=getComputedStyle(item);return {transform:style.transform,translate:style.translate};};
 const before=new Map(changing.map(item=>[item,snapshot(item)]));
 changing.forEach(item=>{readingAnimations.get(item)?.cancel();readingAnimations.delete(item);item.dataset.readingMotion='true';});
 selected=next;
 positionReadingLayer();
 layers.forEach(item=>{item.dataset.selected=String(item===selected);item.setAttribute('aria-pressed',String(item===selected));});
 root.dataset.inspecting=String(!!selected);
 note.textContent=selected?descriptions[layers.indexOf(selected)]:'Same positions. Different depths.';
 changing.forEach(item=>{
  const end=snapshot(item),start=before.get(item);
  if(reduced.matches){delete item.dataset.readingMotion;return;}
  // Use the same uninterrupted path and settling curve in both directions.
  const animation=item.animate([start,end],{
    duration:750,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'
  });
  readingAnimations.set(item,animation);
  animation.finished.then(()=>{
    if(readingAnimations.get(item)!==animation)return;
    animation.cancel();readingAnimations.delete(item);delete item.dataset.readingMotion;
  }).catch(()=>{});
 });
}
layers.forEach((layer,i)=>{
 layer.tabIndex=0;layer.setAttribute('role','button');layer.setAttribute('aria-label',descriptions[i]);layer.setAttribute('aria-pressed','false');
 layer.addEventListener('click',event=>{event.stopPropagation();inspect(layer);});
 layer.addEventListener('keydown',event=>{
   if(event.target!==layer)return;
   if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();inspect(layer);}
 });
});
// The action is part of the inspected layer, rather than a second control.
const launch=document.querySelector('#explosion-launch');
launch.replaceWith(Object.assign(document.createElement('span'),{className:'explosion-action',innerHTML:launch.innerHTML}));
let drag=null,viewX=0,viewY=0,suppressClickUntil=0;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function applyAngle(){
 root.style.setProperty('--view-x',`${viewX}deg`);
 root.style.setProperty('--view-y',`${viewY}deg`);
 document.querySelector('#explode-tilt').value=viewX;
 document.querySelector('#explode-turn').value=viewY;
 document.querySelector('#explode-tilt-value').value=`${Math.round(viewX)}°`;
 document.querySelector('#explode-turn-value').value=`${Math.round(viewY)}°`;
 positionReadingLayer();
}
function resetAngle(){viewX=0;viewY=0;applyAngle();}
stage.tabIndex=0;
stage.setAttribute('aria-label','Drag to rotate the interface. Arrow keys rotate; Escape resets the angle.');
stage.addEventListener('pointerdown',event=>{
 if(!event.isPrimary||event.button!==0||readingAnimations.size)return;
 drag={id:event.pointerId,x:event.clientX,y:event.clientY,viewX,viewY,moved:false};
});
stage.addEventListener('pointermove',event=>{
 if(!drag||drag.id!==event.pointerId)return;
 const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
 if(!drag.moved&&Math.hypot(dx,dy)<5)return;
 if(!drag.moved){drag.moved=true;stage.setPointerCapture(event.pointerId);root.dataset.rotating='true';}
 event.preventDefault();
 viewX=clamp(drag.viewX-dy*.18,-32,24);
 viewY=clamp(drag.viewY+dx*.22,-55,55);
 applyAngle();
});
function finishDrag(event){
 if(!drag||drag.id!==event.pointerId)return;
 if(drag.moved)suppressClickUntil=performance.now()+400;
 drag=null;delete root.dataset.rotating;
 if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
}
stage.addEventListener('pointerup',finishDrag);
stage.addEventListener('pointercancel',finishDrag);
stage.addEventListener('lostpointercapture',finishDrag);
stage.addEventListener('click',event=>{
 if(performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}
},true);
stage.addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
 event.preventDefault();event.stopPropagation();
 viewY=clamp(viewY+(event.key==='ArrowRight'?5:event.key==='ArrowLeft'?-5:0),-55,55);
 viewX=clamp(viewX+(event.key==='ArrowUp'?5:event.key==='ArrowDown'?-5:0),-32,24);
 applyAngle();
});
stage.addEventListener('click',event=>{if(!event.target.closest('.explosion-layer')&&selected)inspect(selected);});
root.addEventListener('keydown',event=>{if(event.key==='Escape'){if(selected)inspect(selected);else resetAngle();}});
reduced.addEventListener('change',resetAngle);

document.querySelector('#explode-tilt').oninput=event=>{viewX=Number(event.target.value);applyAngle();};
document.querySelector('#explode-turn').oninput=event=>{viewY=Number(event.target.value);applyAngle();};
document.querySelector('#explode-reset-angle').onclick=resetAngle;
