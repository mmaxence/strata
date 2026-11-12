import {createScene} from '@strata-ui/core';
// Application lifecycle/control code; only createScene is a runtime export.
/** @param {string} id */
const need=id=>{const element=document.getElementById(id);if(!(element instanceof HTMLElement))throw Error('Missing example element '+id);return element;};
const element=need('workspace'),status=need('status'),pause=need('pause');
const events=new AbortController();
/** @type {import('@strata-ui/core').SceneController|null} */
let scene=null;
let disposed=false,userPaused=false,pausedBeforeCache=false;
/** @param {Readonly<import('@strata-ui/core').SceneState>} state */
const paint=state=>{const text=`${state.mode} · ${state.active} · ${state.assembled?'assembled':state.configuredPath} · ${state.paused?'paused':'ready'}${state.reducedMotion?' · reduced motion':''}`;if(status.textContent!==text)status.textContent=text;pause.textContent=userPaused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(userPaused));};
const mount=()=>{if(disposed)return;scene?.destroy();scene=createScene(element,{workspace:true,assembly:{width:1080,height:560,slots:{canvas:{x:0,y:0,width:430,height:480},settings:{x:-370,y:0,width:270,height:320},notes:{x:370,y:0,width:270,height:320}}},onChange:paint});if(userPaused)scene.pause();};
/** @param {string} id @param {()=>void} action */
const listen=(id,action)=>need(id).addEventListener('click',action,{signal:events.signal});
listen('notes',()=>scene?.focus('notes'));
listen('overview',()=>scene?.setMode('overview'));
listen('pause',()=>{userPaused=!userPaused;if(userPaused)scene?.pause();else scene?.resume();pause.textContent=userPaused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(userPaused));});
listen('reset',()=>scene?.reset());
listen('destroy',()=>{scene?.destroy();scene=null;status.textContent='Scene destroyed. Native controls and source flow remain.';});
listen('mount',mount);
listen('assemble',()=>scene?.setAssembled(true));
listen('separate',()=>scene?.setAssembled(false));
listen('grow',()=>{scene?.setAssembled(false);scene?.focus('canvas');scene?.resizeSurface('canvas',760,480);});
// A cached page keeps its controller and explicit pause; a real unmount disposes it.
window.addEventListener('pagehide',event=>{if(event.persisted){pausedBeforeCache=scene?.isPaused??userPaused;scene?.pause();}else disposeExample();},{signal:events.signal});
window.addEventListener('pageshow',event=>{if(event.persisted&&!pausedBeforeCache&&!userPaused)scene?.resume();},{signal:events.signal});
export const snapshotExample=()=>({state:scene?.state??null,stats:scene?.stats??null,userPaused});
export const disposeExample=()=>{if(disposed)return;disposed=true;events.abort();scene?.destroy();scene=null;status.textContent='Example disposed. Native source retained.';};
mount();
