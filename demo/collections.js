const creative = [
 ['Identity','A study in contrast','A recognizable silhouette, a warm focal point, and supporting details that stay quiet.'],
 ['Editorial','Make a focal point','Balance a clear reading order with room for an expressive image. Bring a study forward, read its detail, then return to the same collection.'],
 ['Objects','Material and light','Reflective forms make changes in scale and orientation easy to see. These studies reuse one generated artwork with different color treatments.'],
 ['Motion','Movement with purpose','A shared path keeps the collection together. Dragging changes its phase; release adds momentum; selection brings an item forward while preserving its neighbors.'],
 ['Spaces','Keep the context','A focused object is easier to understand when its surroundings remain visible. Use depth to support a task rather than hide the rest of the interface.'],
 ['Experiments','Keep the useful parts','Compare the spatial experience with the flat grid. Respect reduced motion and compact layouts, and test real content before shipping.']
];
const launch = [
 ['Positioning','01 / Define','Write one clear promise.','Choose the person you are helping and the task you make easier. Write a one-sentence promise, then list what the first release deliberately leaves out.\n\nReview gate: a new reader can explain the product without seeing the demo.'],
 ['First impression','02 / Demonstrate','Show a useful result in context.','Build a hero around one believable workflow. Let visitors see a result before exposing settings, and make the first interaction easy to undo.\n\nReview gate: the main action works with a pointer, keyboard and a compact viewport.'],
 ['Integration','03 / Document','Make the first example runnable.','Ship the smallest useful example with the actual import, stylesheet and lifecycle cleanup. Keep setup instructions aligned with the package exports.\n\nReview gate: someone can mount and destroy a scene without any playground code.'],
 ['Accessibility','04 / Include','Keep every task reachable.','Check semantic labels, visible focus, reading order and native form behavior. Repeat the task with reduced motion and without a precise pointer.\n\nReview gate: depth is never the only way to find or understand an item.'],
 ['Performance','05 / Measure','Measure the scene you ship.','Use realistic content and record the device, viewport and test method. Check interruption, idle behavior and offscreen work as well as frame cadence.\n\nReview gate: the result is reproducible and the limitations are stated.'],
 ['Release','06 / Share','Verify the public artifact.','Inspect package contents, license notices, documentation links and the deployed site. Keep a clear alpha label until compatibility evidence supports a broader claim.\n\nReview gate: a clean consumer install and the public example both work.']
];
const reading = [
 ['Depth is a tool','Pattern / Hierarchy','Bring the current task forward.','Depth earns its place when it makes an interface easier to understand. A foreground panel can concentrate attention while the surrounding material remains available.\n\nTry it: use the review rail to inspect one note at a time, then switch to the grid to compare the whole collection.'],
 ['Keep real controls','Pattern / Interaction','The interface should stay HTML.','A spatial layout should not turn working controls into screenshots. Text should remain selectable, inputs should retain their values, and links should keep their normal behavior.\n\nTry it: mark this note as read. Change arrangements and verify that the reading state remains.'],
 ['Motion with intent','Pattern / Movement','A gesture needs a clear result.','A stack drag should communicate what happens after release. A path drag should move the shared path instead of detaching one card unexpectedly.\n\nTry it: compare the pile’s default send-to-back behavior with its optional free placement.'],
 ['Make room first','Pattern / Responsive UI','Reduce detail before readability.','When the available space shrinks, secondary panels can show a summary before their geometry scales down. Important controls need a route back to their full form.\n\nTry it: return to the creative workspace and expand the central canvas.'],
 ['Design for stillness','Pattern / Accessibility','The same task should work quietly.','Motion can clarify a relationship, but an interface should remain understandable when that motion is reduced. A readable stack is often the right compact-screen experience.\n\nTry it: use Pause motion, then navigate with the title controls and keyboard.'],
 ['Keep the context','Pattern / Continuity','Rearrange the same collection.','Transitions are easier to follow when the objects remain recognizable. Switching between a grid, fan, rail and loop should reorganize existing content and preserve its state.\n\nTry it: mark a few notes as read, switch use cases, then return to this collection.']
];
const examples = {
 creative:{name:'Creative studies',description:'Browse visual studies. Compare the grid, deal the pile, or explore a moving collection.',layout:'grid',entries:creative},
 launch:{name:'Launch checklist',description:'Review a launch one step at a time. Mark tasks complete; your checklist stays intact as the layout changes.',layout:'rail',entries:launch},
 reading:{name:'Reading collection',description:'A small library of original pattern notes. Browse the fan, open a note, and keep track of what you have read.',layout:'fan',entries:reading}
};
/** Update content in place: the scene's surface, grip and focus nodes never change. */
export function createCollectionExamples(element) {
 let key='creative';
 const progress={launch:new Set(),reading:new Set()};
 const cards=[...element.querySelectorAll('[data-surface]')];
 const parts=cards.map((card,index)=>{
  const body=card.querySelector('.panel-body'),read=card.querySelector('[data-open-detail]');
  const graphic=document.createElement('div');graphic.className='collection-graphic';graphic.setAttribute('aria-hidden','true');graphic.textContent=String(index+1).padStart(2,'0');card.querySelector('img').after(graphic);
  const meta=document.createElement('p');meta.className='collection-meta';body.prepend(meta);
  const copy=document.createElement('p');copy.className='collection-copy';card.querySelector('h3').after(copy);
  const actions=document.createElement('div');actions.className='collection-actions';read.before(actions);actions.append(read);
  const toggle=document.createElement('button');toggle.className='collection-complete';toggle.type='button';toggle.setAttribute('role','checkbox');actions.append(toggle);
  toggle.onclick=()=>{const done=progress[key];if(!done)return;done.has(index)?done.delete(index):done.add(index);renderProgress();};
  return {card,meta,copy,graphic,toggle,read};
 });
 function renderProgress(){
  const count=progress[key]?.size||0;
  const output=document.getElementById('collection-progress');
  output.textContent=key==='creative'?'6 visual studies':`${count} of 6 ${key==='launch'?'complete':'read'} · retained in this tab`;
  for(const [index,part] of parts.entries()){
   const done=progress[key]?.has(index)||false;
   part.card.dataset.complete=String(done);
   part.toggle.hidden=key==='creative';
   part.toggle.setAttribute('aria-checked',String(done));
   part.toggle.textContent=done?(key==='launch'?'Complete':'Read'):(key==='launch'?'Mark done':'Mark read');
   part.toggle.setAttribute('aria-label',`${key==='launch'?'Complete':'Read'}: ${examples[key].entries[index][0]}`);
  }
 }
 function select(next){
  if(!examples[next])return;
  key=next;element.dataset.collection=key;
  document.getElementById('collection-description').textContent=examples[key].description;
  for(const [index,part] of parts.entries()){
   const entry=examples[key].entries[index];
   part.card.querySelector('[data-focus]').textContent=entry[0];
   part.card.querySelector('[data-drag]').setAttribute('aria-label',`Move ${entry[0]}`);
   part.card.querySelector('h3').textContent=entry[0];
   part.card.querySelector('img').hidden=key==='launch';
   part.card.querySelector('img').alt=`Abstract illustration for ${entry[0]}`;
   part.graphic.hidden=key!=='launch';
   part.meta.hidden=key==='creative';part.meta.textContent=entry[1];
   part.copy.hidden=key==='creative';part.copy.textContent=entry[2];
   part.read.textContent=key==='creative'?'Read study':key==='launch'?'Review task':'Read note';
  }
  renderProgress();
 }
 select('creative');
 return {
  select,
  get key(){return key;},
  get name(){return examples[key].name;},
  get recommendedLayout(){return examples[key].layout;},
  study(id){const entry=examples[key].entries[Number(id.split('-').at(-1))];return {title:entry[0],subtitle:entry[1],copy:entry[3]||entry[2],showImage:key==='creative',note:key==='creative'?'Illustrative studies using original generated artwork.':key==='launch'?'Interactive sample checklist. Completion is kept in this tab.':'Original pattern notes. Reading progress is kept in this tab.'};}
 };
}
