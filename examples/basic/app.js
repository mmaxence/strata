import {createScene} from '../../src/strata.js';
const $=id=>document.getElementById(id);
const scene=createScene($('example'),{onChange:s=>{
 $('state').textContent=`${s.mode} · ${s.active} · ${s.configuredPath} · ${s.paused?'paused':'ready'}`;
 $('pause').textContent=s.paused?'Resume':'Pause';
}});
$('overview').onclick=()=>scene.setMode('overview');
$('notes').onclick=()=>scene.focus('notes');
$('belt').onclick=()=>scene.setPath('belt',{diameter:560,axis:15,speed:.6});
$('pause').onclick=()=>scene.isPaused?scene.resume():scene.pause();
$('reset').onclick=()=>scene.reset();
let count=0;$('counter').onclick=()=>$('counter').textContent=`Clicked ${++count} times`;
let pausedBeforeHide=false;
addEventListener('pagehide',event=>{if(event.persisted){pausedBeforeHide=scene.isPaused;scene.pause();}else scene.destroy();});
addEventListener('pageshow',event=>{if(event.persisted&&!pausedBeforeHide)scene.resume();});
