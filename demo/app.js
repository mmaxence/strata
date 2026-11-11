import {createScene} from '../src/strata.js';
import {createCollectionExamples} from './collections.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const controllers = new Map();
const studyPausePreference = new Map();
const sceneElements = {creative: $('[data-case="creative"]'), collection: $('[data-case="grid"]'), flight: $('[data-case="flight"]'), explosion: $('[data-case="explosion"]')};
const collectionContent = createCollectionExamples(sceneElements.collection);
const titleById = Object.fromEntries($$('[data-surface]').map(surface => [surface.dataset.surface, surface.querySelector('[data-focus]').textContent.replace(/^\d+\s*/, '').trim()]));
const collectionLayouts = {grid: 'Grid', pile: 'Pile', fan: 'Fanned deck', rail: 'Review rail', spiral: 'Spiral orbit', compare: 'Belt', research: 'Figure eight', float: 'Floating grid'};
let currentStudy = 'creative';
let activeElement = sceneElements.creative;
let scene;
let hue = 0;
let lastAnnouncement = '';
let pendingDetail = null;
let returnFocus = null;

function sceneFor(element) {
  if(element===sceneElements.explosion)return null;
  if (!controllers.has(element)) {
    const controller = createScene(element, {onChange(state) {
      if (element === activeElement) syncState(state);
    }});
    controllers.set(element, controller);
    if (element !== sceneElements.creative) controller.setMode('overview');

  }
  return controllers.get(element);
}

function activeLayout(state) {
  const path = state.configuredPath || state.path;
  return path === 'belt' ? 'compare' : path === 'wave' ? 'research' : path === 'float' ? 'float' : path === 'spiral' ? 'spiral' : state.layout;
}

function setOutput(id, value, label) {
  $(id).value = value;
  const output = $(`${id}-value`);
  if (output) output.value = label;
}

function syncState(state) {
  const isCreative = currentStudy === 'creative';
  const isCollection = currentStudy === 'collection';
  const isFlight = currentStudy === 'flight';
  const isExplosion = currentStudy === 'explosion';
  document.querySelector('.view-switch').hidden=isFlight||isExplosion;
  document.querySelector('.playground-bottom').hidden=isFlight||isExplosion;
  const configuredPath = state.configuredPath || state.path || 'none';
  const caseKey = isCreative ? 'creative' : activeLayout(state);
  const title = titleById[state.active] || 'Panel';
  $('#focus-view').setAttribute('aria-pressed', String(state.mode === 'focus' && !state.assembled));
  $('#overview-view').setAttribute('aria-pressed', String(state.mode === 'overview' && !state.assembled));
  $$('[data-case-target]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.caseTarget === caseKey)));
  $$('[data-study]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.study === currentStudy)));
  $$('[data-workspace-state]').forEach(button => button.setAttribute('aria-pressed', String(!state.assembled && (button.dataset.workspaceState === 'overview' ? state.mode === 'overview' : state.mode === 'focus' && state.active === button.dataset.workspaceState))));
  $('#workspace-gather').setAttribute('aria-pressed', String(state.assembled));
  $('#workspace-unfold').setAttribute('aria-pressed', String(!state.assembled));
  $('#creative-states').hidden = !isCreative;
  $('#collection-layouts').hidden = !isCollection;
  $('#pile-controls').hidden = !isCollection || !['pile', 'fan'].includes(caseKey);
  $('#collection-examples').hidden = !isCollection;
  $('#rail-controls').hidden = !isCollection || caseKey !== 'rail';
  $('#rail-position').value = `${(state.railIndex || 0) + 1} / 6`;
  $('#rail-previous').disabled = state.railIndex === 0;
  $('#rail-next').disabled = state.railIndex === 5;
  $('#pile-free').checked = state.pileDragMode === 'free';
  $('#cursor-control').hidden = !isCollection || !['belt', 'wave', 'spiral'].includes(configuredPath);
  $('#cursor-guide').hidden = $('#cursor-control').hidden || state.cursorMode !== 'steer' || state.reducedMotion;
  if (configuredPath !== 'none') {$('#cursor-mode').value = state.cursorMode; setOutput('#cursor-tilt', state.cursorTilt, `${state.cursorTilt}°`);}
  $('#path-options').hidden = !isCollection;
  $('#case-title').textContent = isExplosion ? 'Explosion' : isFlight ? 'Fly-through' : isCreative ? 'Creative workspace' : `${collectionContent.name} / ${collectionLayouts[caseKey]}`;
  $('#case-description').textContent = isExplosion ? 'One interface, taken apart.' : isFlight ? 'Above. Below. Through the glass.' : isCreative ? (state.assembled ? 'One interface. Five live modules.' : 'Make room for the work.') : 'Six studies. One continuous space.';
  $('#case-result').textContent = isExplosion ? 'Separate the interface into its structural layers. Drag the slider to explore, or assemble it again.' : isFlight ? 'A live interface. Translucent panels lift as the rocket slips beneath them. Try the checklist or leave a note.' : isCreative
    ? (state.assembled ? 'The complete interface stays editable. Separate its modules when you need more room.' : 'Drag a header to rearrange. Pull a corner to resize. Neighboring modules adapt before shrinking.')
    : caseKey === 'rail' ? 'Review one item with its neighbors in view. Drag horizontally, use Previous / Next, or select a title.'
    : ['pile', 'fan'].includes(caseKey) ? (state.pileDragMode === 'free' ? 'Drag cards out and leave them on the canvas. Turn off Free placement to gather the pile.' : 'Drag the front card and release to tuck it behind the pile. A click brings it into focus.')
    : configuredPath !== 'none' ? 'Drag a card to turn the path. Release to coast. Select a title to bring it forward.'
    : 'Select a card to lift it into focus. Select it again, click the background, or press Escape to return.';
  $('#path').value = configuredPath;
  setOutput('#depth', state.depth * 100, `${state.depth.toFixed(1)}×`);
  setOutput('#orbit', state.rotation, `${state.rotation}°`);
  setOutput('#field', state.depthOfField * 10, `${state.depthOfField.toFixed(1)} px`);
  setOutput('#diameter', state.diameter, `${state.diameter} px`);
  setOutput('#axis', state.axis, `${state.axis}°`);
  setOutput('#speed', state.speed * 10, `${state.speed.toFixed(1)}×`);
  $('#choreography').value = activeElement.dataset.choreography || 'glide';
  const hasMotion = configuredPath !== 'none';
  $('#toggle-motion').hidden = !isCollection || !hasMotion;
  $('#toggle-motion').textContent = state.paused ? 'Resume motion' : 'Pause motion';
  $('#toggle-motion').setAttribute('aria-pressed', String(!!state.paused));
  $('#motion-hint').textContent = state.reducedMotion ? 'Reduced motion is on. Paths stay still.' : state.cursorMode === 'steer' ? 'Cursor left: reverse. Centre: brake. Right: forward. Move vertically to lean the path. Drag and release to coast.' : state.cursorMode === 'pause' ? 'Hover to slow to a stop. Leave to resume. Drag and release to coast.' : 'The loop keeps cruising. Drag and release to coast; cursor tilt is optional.';
  const compact = activeElement.clientWidth < 650;
  $('#compact-notice').hidden = isFlight || isExplosion || !compact;
  $('#compact-notice').textContent = 'Compact view keeps every module in a readable stack. Spatial movement and corner resizing return when there is more room.';
  const message = state.resizing ? 'Resizing · modules make room'
    : state.dragging ? (hasMotion ? 'Turning the collection' : 'Moving a panel')
    : state.settling ? 'Settling into place'
    : state.assembled ? 'Workspace assembled'
    : state.paused ? 'Motion paused'
    : state.mode === 'focus' ? `${title} in focus` : 'Overview';
  if (message !== lastAnnouncement) {
    $('#scene-status').textContent = message;
    lastAnnouncement = message;
  }
  if (pendingDetail && state.active === pendingDetail.id && state.mode === 'focus' && state.path === 'none') {
    showDetail(pendingDetail);
  }
}

function switchStudy(next) {
  if (next === currentStudy) return;
  pendingDetail = null;
  studyPausePreference.set(activeElement, scene?.state.paused||false);
  scene?.pause();
  activeElement.hidden = true;
  currentStudy = next;
  activeElement = sceneElements[next];
  activeElement.hidden = false;
  scene = sceneFor(activeElement);
  if (!studyPausePreference.get(activeElement)) scene?.resume();
  syncState(scene?.state||controllers.get(sceneElements.creative).state);
}

function selectLayout(key) {
  switchStudy('collection');
  pendingDetail = null;
  if (['compare', 'research', 'float', 'spiral'].includes(key)) scene.setPath(key === 'compare' ? 'belt' : key === 'research' ? 'wave' : key, {interaction: $('#cursor-mode').value, tilt: Number($('#cursor-tilt').value)});
  else scene.setLayout(key);
}

scene = sceneFor(activeElement);
syncState(scene.state);
$$('[data-study]').forEach(button => button.onclick = () => switchStudy(button.dataset.study));
$$('[data-case-target]').forEach(button => button.onclick = () => selectLayout(button.dataset.caseTarget));
$('#focus-view').onclick = () => scene.focus(scene.state.active);
$('#overview-view').onclick = () => { pendingDetail = null; scene.setMode('overview'); };
$('#reset-scene').onclick = () => { pendingDetail = null; scene.reset(); syncState(scene.state); };
$('#field').oninput = event => scene.setDepthOfField(event.target.value / 10);
$('#depth').oninput = event => scene.setDepth(event.target.value / 100);
$('#orbit').oninput = event => scene.orbit(event.target.value);
$('#choreography').onchange = () => activeElement.dataset.choreography = $('#choreography').value;
function updatePath() {
  pendingDetail = null;
  scene.setPath($('#path').value, {diameter: Number($('#diameter').value), axis: Number($('#axis').value), speed: $('#speed').value / 10, interaction: $('#cursor-mode').value, tilt: Number($('#cursor-tilt').value)});
}
for (const id of ['path', 'diameter', 'axis', 'speed', 'cursor-mode', 'cursor-tilt']) $(`#${id}`).oninput = updatePath;
$('#toggle-motion').onclick = () => { scene.state.paused ? scene.resume() : scene.pause(); syncState(scene.state); };
$('#collection-example').onchange = () => {
  collectionContent.select($('#collection-example').value);
  for (const surface of sceneElements.collection.querySelectorAll('[data-surface]')) titleById[surface.dataset.surface] = surface.querySelector('[data-focus]').textContent;
  selectLayout(collectionContent.recommendedLayout);
};
$('#rail-previous').onclick = () => scene.navigate(-1);
$('#rail-next').onclick = () => scene.navigate(1);
$('#pile-free').onchange = () => scene.setPileDragMode($('#pile-free').checked ? 'free' : 'cycle');
$('#pile-back').onclick = () => scene.sendToBack();
$('#pile-fold').onclick = () => scene.setLayout('pile');
$('#pile-unfold').onclick = () => scene.setLayout('grid');
$('#workspace-gather').onclick = () => scene.setAssembled(true);
$('#workspace-unfold').onclick = () => scene.setAssembled(false);
$('#split-workspace').onclick = () => scene.setAssembled(false);
$$('[data-workspace-state]').forEach(button => button.onclick = () => button.dataset.workspaceState === 'overview' ? scene.setMode('overview') : scene.focus(button.dataset.workspaceState));
$('#show-canvas').onclick = () => {
  scene.focus('canvas');
  if (activeElement.dataset.compact === 'true') $('.canvas-panel').scrollIntoView({block: 'center', behavior: 'instant'});
};

function updateArtwork() {
  const useColor = $('#show-color').checked;
  $('.artwork').style.setProperty('--hue', `${useColor ? hue : 0}deg`);
  $('.artwork').style.setProperty('--saturation', useColor ? $('#saturation').value / 100 : 1);
  $('.artwork').style.setProperty('--contrast', $('#contrast').checked && useColor ? 1.3 : 1);
  $('.artwork img').style.visibility = $('#show-image').checked ? 'visible' : 'hidden';
  $('.artwork-copy').style.visibility = $('#show-title').checked ? 'visible' : 'hidden';
  $('#art-title').textContent = $('#headline').value;
  $('#art-title').style.setProperty('--title-size', `${$('#type-size').value}px`);
  $('#type-value').value = `${$('#type-size').value} px`;
  $('#saturation-value').value = `${$('#saturation').value}%`;
}
$$('[data-case="creative"] .panel-body input').forEach(input => input.addEventListener('input', updateArtwork));
$$('[data-hue]').forEach(button => button.onclick = () => {
  hue = Number(button.dataset.hue);
  $$('[data-hue]').forEach(swatch => swatch.setAttribute('aria-pressed', String(swatch === button)));
  updateArtwork();
});
$('#restore-art').onclick = () => {
  hue = 0;
  $('#headline').value = 'Beyond the surface.';
  $('#type-size').value = 56;
  $('#saturation').value = 100;
  $('#contrast').checked = false;
  for (const id of ['show-title', 'show-color', 'show-image']) $(`#${id}`).checked = true;
  $$('[data-hue]').forEach(swatch => swatch.setAttribute('aria-pressed', String(swatch.dataset.hue === '0')));
  updateArtwork();
};
$('#notes').value = 'Less chrome. More feeling.\n\nLet the work come to you.';
$('#notes').oninput = () => $('#notes-status').textContent = `${$('#notes').value.length} characters · retained while you explore`;
updateArtwork();

function showDetail(request) {
  pendingDetail = null;
  $('#detail .dialog-bar span').textContent = collectionContent.name.toUpperCase();
  const {title, subtitle, copy, showImage, note} = collectionContent.study(request.id);
  $('#detail-image').hidden = !showImage;
  $('#detail-note').textContent = note;
  $('#detail-title').textContent = title;
  $('#detail-subtitle').textContent = subtitle;
  $('#detail-copy').textContent = copy;
  $('#detail-image').style.filter = request.surface.querySelector('img').style.filter;
  $('#detail-image').alt = `Abstract artwork for ${title}`;
  returnFocus = request.trigger;
  if (!$('#detail').open) $('#detail').showModal();
}
$$('[data-open-detail]').forEach(button => button.onclick = () => {
  const surface = button.closest('[data-surface]');
  pendingDetail = {id: surface.dataset.surface, surface, trigger: button};
  scene.focus(surface.dataset.surface);
  syncState(scene.state);
});
$('#close-detail').onclick = () => $('#detail').close();
$('#detail').addEventListener('close', () => {
  pendingDetail = null;
  returnFocus?.focus({preventScroll: true});
  scene.setMode('overview');
});
$('#detail').addEventListener('click', event => {
  if (event.target !== $('#detail')) return;
  const r = $('#detail').getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('#detail').close();
});
activeElement.addEventListener('keydown', event => { if (event.key === 'Escape') pendingDetail = null; });
sceneElements.collection.addEventListener('keydown', event => { if (event.key === 'Escape') pendingDetail = null; });

function setupCode() {
  const state = scene.state;
  const path = state.configuredPath || state.path;
  const lines = ["import { createScene } from './src/strata.js';", "// Include src/strata.css and your own surface styling.", '', `const element = document.querySelector('[data-case="${activeElement.dataset.case}"]');`, `element.dataset.choreography = '${activeElement.dataset.choreography || 'glide'}';`, `const space = createScene(element, { workspace: ${currentStudy === 'creative'} });`, 'space.pause(); // Apply the initial state without an entrance animation.', `space.setDepth(${state.depth});`, `space.setDepthOfField(${state.depthOfField});`, `space.orbit(${state.rotation});`];
  if (currentStudy === 'creative') lines.push(`space.setAssembled(${state.assembled});`);
  else {lines.push(`space.setLayout('${state.layout}');`); lines.push(`space.setPileDragMode('${state.pileDragMode}');`);}
  if (path !== 'none') lines.push(`space.setPath('${path}', ${JSON.stringify({diameter: state.diameter, axis: state.axis, speed: state.speed, interaction: state.cursorMode, tilt: state.cursorTilt})});`);
  if (!state.assembled) lines.push(state.mode === 'focus' ? `space.focus('${state.active}');` : "space.setMode('overview');");
  if (!state.paused) lines.push('space.resume();');
  lines.push('', '// When removing the scene: space.destroy();');
  return lines.join('\n');
}
$('#copy-code').onclick = () => {
  $('#setup-code').value = setupCode();
  $('#copy-result').textContent = '';
  $('#code-dialog').showModal();
};
$('#close-code').onclick = () => $('#code-dialog').close();
$('#copy-snippet').onclick = async () => {
  try {
    await navigator.clipboard.writeText($('#setup-code').value);
    $('#copy-result').textContent = 'Copied.';
  } catch {
    $('#setup-code').focus(); $('#setup-code').select();
    $('#copy-result').textContent = 'Select and copy the code with your keyboard.';
  }
};
let pausedBeforePageHide = false;
window.addEventListener('pagehide', event => {
  pausedBeforePageHide = scene?.state.paused||false;
  controllers.forEach(controller => event.persisted ? controller.pause() : controller.destroy());
});
window.addEventListener('pageshow', event => {
  if (event.persisted && !pausedBeforePageHide) scene?.resume();
});
