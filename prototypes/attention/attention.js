// Pointer-only interaction prototype. No camera, model, gaze collection or storage.
export function createAttentionGallery(element, getScene) {
  const toggle = document.querySelector('#attention-dwell');
  const stories = {
    'exhibit-form': ['01 / FORM', 'Suspended matter', 'A solid core, held inside a transparent gesture. Depth lets the object approach while the rest of the exhibition stays in view.'],
    'exhibit-rhythm': ['02 / RHYTHM', 'Between the lines', 'Repetition creates a field; a small difference gives it direction. Sustained attention brings the work forward without asking you to chase a moving control.'],
    'exhibit-light': ['03 / LIGHT', 'A softer presence', 'Light can acknowledge a visitor before asking anything of them. In a real installation, a broad gaze zone could reveal this layer while a physical button confirms the next step.']
  };
  let timer = 0, progress = null, candidate = null;
  function cancel() {clearTimeout(timer);timer=0;progress?.cancel();progress=null;candidate=null;}
  function sync(state) {
    const copy = state.mode === 'focus' ? stories[state.active] : ['AN EXHIBITION THAT MEETS YOU','Stay a little longer.','Three studies in form, rhythm and light. Select an exhibit, or try sustained attention with the pointer simulator.'];
    ['attention-kicker','attention-title','attention-copy'].forEach((id,index)=>document.getElementById(id).textContent=copy[index]);
  }
  for(const surface of element.querySelectorAll('[data-surface]')) {
    surface.addEventListener('pointerenter',event=>{
      cancel();
      const scene=getScene();
      if(!toggle.checked||event.pointerType!=='mouse'||element.hidden||!scene||scene.isPaused||scene.state.active===surface.dataset.surface&&scene.state.mode==='focus')return;
      candidate=surface;
      progress=surface.querySelector('.dwell-meter i').animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:900,fill:'forwards'});
      timer=setTimeout(()=>{const id=candidate?.dataset.surface;cancel();if(id&&!element.hidden&&!document.hidden)getScene()?.focus(id);},900);
    });
    surface.addEventListener('pointerleave',cancel);
    surface.addEventListener('pointerdown',cancel);
  }
  toggle.addEventListener('change',cancel);
  document.querySelector('#attention-overview').addEventListener('click',()=>{cancel();getScene()?.setMode('overview');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
  element.addEventListener('keydown',event=>{if(event.key==='Escape')cancel();});
  return {sync,cancel};
}
