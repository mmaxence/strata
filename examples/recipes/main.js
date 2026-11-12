import {recipes} from './definitions.js';
/** @param {string} selector */
const need=selector=>{const node=document.querySelector(selector);if(!(node instanceof HTMLElement))throw Error('Missing '+selector);return node;};
const picker=/** @type {HTMLSelectElement} */(need('#recipe')),status=need('#state');
const preference=matchMedia('(prefers-reduced-motion: reduce)');
/** @type {Promise<typeof import('@strata-ui/core')>|undefined} */
let library;
/** @type {{dispose:()=>void,select:(id:string)=>void,snapshot:()=>object}|undefined} */
let app;
// This owner is application code, not a new Space controller API.
export function mountRecipes(){
 if(app)return app;
 const events=new AbortController();
 let disposed=false,generation=0,selected='workspace',loading=false,userPaused=false,nativeChoice=false,reducedMotion=preference.matches,errorText='';
 /** @type {import('@strata-ui/core').SceneController|null} */
 let scene=null;
 /** @type {Readonly<import('@strata-ui/core').SceneState>|null} */
 let lastState=null;
 /** @type {HTMLElement|null} */
 let invoker=null;
 let returnAssembled=false;
 let sceneEvents=new AbortController();
 const panel=()=>need('[data-recipe="'+selected+'"]');
 const root=()=>{const node=panel().querySelector('.scene');if(!(node instanceof HTMLElement))throw Error('Missing scene');return node;};
 const spec=()=>recipes[/** @type {keyof typeof recipes} */(selected)];
 const ids=()=>[...root().querySelectorAll('[data-surface]')].map(n=>/** @type {HTMLElement} */(n).dataset.surface||'');
 /** @param {HTMLElement} node @param {boolean} value */
 const disable=(node,value)=>{if(node instanceof HTMLButtonElement&&node.disabled!==value)node.disabled=value;};
 /** @param {HTMLElement} node @param {string} value */
 const label=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
 const paint=()=>{
  for(const id of ['inspect','overview','pause','native','remount','reset'])disable(need('#'+id),disposed||(['inspect','overview','reset'].includes(id)&&!scene));
  label(need('#pause'),userPaused?'Resume motion':'Pause motion');need('#pause').setAttribute('aria-pressed',String(userPaused));
  label(need('#native'),nativeChoice?'Enable spatial layout':'Use document layout');need('#native').setAttribute('aria-pressed',String(nativeChoice));
  for(const node of document.querySelectorAll('[data-open],[data-compose],[data-cycle]'))if(node instanceof HTMLElement)disable(node,disposed||!scene||!panel().contains(node));
  for(const node of root().querySelectorAll('[data-focus],[data-drag],[data-resize]'))if(node instanceof HTMLElement)disable(node,!scene||disposed)
  for(const node of panel().querySelectorAll('[data-open]'))if(node instanceof HTMLElement){
   node.setAttribute('aria-pressed',String(lastState?.mode==='focus'&&lastState.active===node.dataset.open));
   if(selected==='onboarding'&&lastState?.active===node.dataset.open)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');
  }
  const compose=panel().querySelector('[data-compose]');
  if(compose instanceof HTMLElement){compose.setAttribute('aria-pressed',String(!!lastState?.assembled));label(compose,lastState?.assembled?'Separate components':'Compose interface');}
  const prev=panel().querySelector('[data-prev]'),next=panel().querySelector('[data-next]');
  if(prev instanceof HTMLElement)disable(prev,!scene||(lastState?.railIndex??0)===0);
  if(next instanceof HTMLElement)disable(next,!scene||(lastState?.railIndex??0)===ids().length-1);
  const text=disposed?'Recipes disposed. Native source retained.':loading?'Loading selected recipe…':scene&&lastState?selected+': '+lastState.mode+' / '+lastState.active+' / '+lastState.layout+(lastState.assembled?' / composed':'')+(userPaused?' / user paused':'')+(reducedMotion?' / reduced document layout':''):selected+': native document layout. '+errorText;
  if(status.textContent!==text)status.textContent=text;
 };
 const teardown=()=>{sceneEvents.abort();sceneEvents=new AbortController();scene?.destroy();scene=null;lastState=null;};
 const remember=/** @param {HTMLElement} control */control=>{invoker=control;returnAssembled=scene?.state.assembled??false;};
 const restoreInvoker=()=>{if(returnAssembled)scene?.setAssembled(true);returnAssembled=false;const target=invoker;invoker=null;if(target?.isConnected&&!target.closest('[hidden]'))target.focus({preventScroll:true});};
 const overview=()=>{if(!scene)return;scene.setMode('overview');restoreInvoker();};
 const open=/** @param {string} id @param {HTMLElement} control */(id,control)=>{if(!scene)return;remember(control);scene.focus(id);};
 const configure=()=>{
  if(!scene)return;
  scene.setDepth(.75);scene.setDepthOfField(.4);scene.setLayout(spec().layout);
  if(selected==='board')scene.setPileDragMode('free');
  if(selected==='orbit')scene.setPath('belt',{diameter:600,axis:16,speed:.25,interaction:'pause',tilt:0});
  else if(selected!=='onboarding')scene.setMode('overview');
  if(spec().assembled)scene.setAssembled(true);
  if(userPaused)scene.pause();
 };
 const mount=async()=>{
  const current=++generation;teardown();loading=false;errorText='';
  if(disposed||nativeChoice){paint();return;}
  loading=true;paint();
  try{
   const {createScene}=await(library??=import('@strata-ui/core'));
   if(disposed||current!==generation)return;
   const element=root(),keys=ids();
   const slots=selected==='breakdown'?{header:{x:0,y:-190,width:680,height:160},body:{x:0,y:0,width:680,height:210},footer:{x:0,y:195,width:680,height:140}}:Object.fromEntries(keys.map((id,i)=>[id,{x:[0,-350,350][i],y:0,width:i===0?370:270,height:i===0?420:300}]));
   scene=createScene(element,{workspace:spec().workspace,compactWidth:reducedMotion?1600:760,assembly:{width:1080,height:620,slots},onChange:state=>{if(disposed||current!==generation)return;lastState=state;paint();}});
   loading=false;configure();lastState=scene.state;paint();
   // Runtime handles selection/background/Escape; restore only a recorded user-close destination.
   const closeAfterDispatch=()=>{
    const owned=scene;queueMicrotask(()=>{if(disposed||current!==generation||scene!==owned)return;if(scene?.state.mode==='overview')restoreInvoker();});
   };
   element.addEventListener('click',event=>{if(event.target instanceof Element&&!event.target.closest('[data-surface]')&&invoker)closeAfterDispatch();},{signal:sceneEvents.signal});
   element.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented&&invoker)closeAfterDispatch();},{signal:sceneEvents.signal});
   element.addEventListener('click',event=>{const button=event.target instanceof Element?event.target.closest('[data-focus]'):null;if(button instanceof HTMLElement)remember(button);},{capture:true,signal:sceneEvents.signal});
  }catch{if(disposed||current!==generation)return;teardown();loading=false;errorText='Enhancement unavailable; source retained.';paint();}
 };
 const select=/** @param {string} id */id=>{
  if(disposed||!(id in recipes))return;
  if(id!==selected&&root().contains(document.activeElement))picker.focus({preventScroll:true});
  selected=id;picker.value=id;invoker=null;returnAssembled=false;
  for(const n of document.querySelectorAll('[data-recipe]'))if(n instanceof HTMLElement)n.hidden=n.dataset.recipe!==id;
  void mount();
 };
 const listen=/** @param {HTMLElement} node @param {string} type @param {()=>void} action */(node,type,action)=>node.addEventListener(type,action,{signal:events.signal});
 listen(picker,'change',()=>select(picker.value));
 listen(need('#inspect'),'click',()=>open(spec().primary,need('#inspect')));
 listen(need('#overview'),'click',overview);
 listen(need('#pause'),'click',()=>{userPaused=!userPaused;if(userPaused)scene?.pause();else scene?.resume();paint();});
 listen(need('#native'),'click',()=>{nativeChoice=!nativeChoice;invoker=null;returnAssembled=false;void mount();});
 listen(need('#remount'),'click',()=>{invoker=null;returnAssembled=false;void mount();});
 listen(need('#reset'),'click',()=>{invoker=null;returnAssembled=false;scene?.reset();configure();});
 for(const n of document.querySelectorAll('[data-open]'))if(n instanceof HTMLElement)listen(n,'click',()=>open(n.dataset.open||'',n));
 for(const n of document.querySelectorAll('[data-compose]'))if(n instanceof HTMLElement)listen(n,'click',()=>{invoker=null;returnAssembled=false;scene?.setAssembled(!scene.state.assembled);});
 for(const n of document.querySelectorAll('[data-prev]'))if(n instanceof HTMLElement)listen(n,'click',()=>scene?.navigate(-1));
 for(const n of document.querySelectorAll('[data-next]'))if(n instanceof HTMLElement)listen(n,'click',()=>scene?.navigate(1));
 for(const n of document.querySelectorAll('[data-cycle]'))if(n instanceof HTMLElement)listen(n,'click',()=>scene?.sendToBack());
 for(const n of document.querySelectorAll('[data-local-action]'))if(n instanceof HTMLElement)listen(n,'click',()=>{const result=n.parentElement?.querySelector('[data-local-result]');if(result)result.textContent='Confirmed locally';});
 for(const n of document.querySelectorAll('[data-sample]'))if(n instanceof HTMLElement)listen(n,'click',()=>{const metric=panel().querySelector('[data-metric]');if(metric)metric.textContent=String(Math.min(60,Number(metric.textContent)+5));});
 // Native disclosure activation/scroll is a child gesture, not a card drag/toggle.
 for(const n of document.querySelectorAll('summary'))for(const type of ['pointerdown','click'])n.addEventListener(type,event=>event.stopPropagation(),{signal:events.signal});
 /** @param {MediaQueryListEvent} event */
 const onPreference=event=>{reducedMotion=event.matches;invoker=null;returnAssembled=false;void mount();};
 preference.addEventListener('change',onPreference);
 const dispose=()=>{if(disposed)return;disposed=true;++generation;events.abort();preference.removeEventListener('change',onPreference);teardown();loading=false;invoker=null;returnAssembled=false;paint();for(const n of document.querySelectorAll('[data-recipe]'))if(n instanceof HTMLElement)n.hidden=false;for(const n of document.querySelectorAll('[data-focus],[data-drag],[data-resize],[data-open],[data-compose],[data-prev],[data-next],[data-cycle]'))if(n instanceof HTMLButtonElement)n.disabled=true;app=undefined;};
 let pausedBeforeCache=false;
 window.addEventListener('pagehide',event=>{if(event.persisted){pausedBeforeCache=scene?.isPaused??userPaused;scene?.pause();}else dispose();},{signal:events.signal});
 window.addEventListener('pageshow',event=>{if(event.persisted&&!pausedBeforeCache&&!userPaused)scene?.resume();},{signal:events.signal});
 app={dispose,select,snapshot:()=>({selected,loading,userPaused,nativeChoice,reducedMotion,state:scene?.state??null,stats:scene?.stats??null,hasInvoker:!!invoker,returnAssembled,generation})};
 const initial=location.hash.slice(1);select(initial in recipes?initial:'workspace');return app;
}
export const snapshotRecipes=()=>app?.snapshot()??null;
export const disposeRecipes=()=>app?.dispose();
mountRecipes();
