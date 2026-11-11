import assert from "node:assert/strict";
import { createScene } from "../src/strata.js";
class Target {
  constructor() {
    this.handlers = /* @__PURE__ */ new Map();
    this.dataset = {};
    this.style = { setProperty(k, v) {
      this[k === "z-index" ? "zIndex" : k] = v;
    }, removeProperty(k) {
      delete this[k === "z-index" ? "zIndex" : k];
    }, getPropertyValue(k) {
      return this[k === "z-index" ? "zIndex" : k] || "";
    } };
    this.attrs = {};
  }
  addEventListener(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, /* @__PURE__ */ new Set());
    this.handlers.get(type).add(fn);
  }
  removeEventListener(type, fn) {
    this.handlers.get(type)?.delete(fn);
  }
  emit(type, values = {}) {
    const e = { type, target: this, button: 0, pointerId: 1, timeStamp: clock, preventDefault() {
    }, ...values };
    for (const fn of this.handlers.get(type) || []) fn(e);
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
  setPointerCapture(id) {
    this.capture = id;
  }
  releasePointerCapture() {
    delete this.capture;
    this.emit("lostpointercapture");
  }
  closest() {
    return this;
  }
  focus() {
  }
}
const motion = new Target();
motion.matches = false;
let clock = 0, nextFrame = 0, queue = /* @__PURE__ */ new Map(), observer;
globalThis.matchMedia = () => motion;
globalThis.document = new Target();
globalThis.performance = { now: () => clock };
globalThis.requestAnimationFrame = (fn) => {
  const id = ++nextFrame;
  queue.set(id, fn);
  return id;
};
globalThis.cancelAnimationFrame = (id) => queue.delete(id);
globalThis.ResizeObserver = class {
  constructor(fn) {
    this.fn = fn;
    observer = this;
  }
  observe() {
  }
  disconnect() {
    this.disconnected = true;
  }
};
function surface(id, x, y) {
  const s = new Target();
  s.dataset = { surface: id, x: String(x), y: String(y) };
  s.button = new Target();
  s.handle = new Target();
  s.querySelector = (selector) => selector === "[data-focus]" ? s.button : selector === "[data-drag]" ? s.handle : null;
  return s;
}
function fixture() {
  const element2 = new Target();
  element2.clientWidth = 1120;
  element2.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1120, height: 650 });
  const surfaces2 = [surface("a", 0, 0), surface("b", 300, 80)];
  element2.querySelectorAll = () => surfaces2;
  return { element: element2, surfaces: surfaces2 };
}
function advance(ms) {
  const end = clock + ms;
  while (clock < end) {
    clock += 16;
    const batch = [...queue.values()];
    queue.clear();
    batch.forEach((fn) => fn(clock));
  }
}
let checks = 0;
function test(name, fn) {
  fn();
  checks++;
  console.log("PASS " + name);
}
const { element, surfaces } = fixture();
let notifications = 0;
const scene = createScene(element, { onChange: () => notifications++ });
test("idle scene owns no animation frame", () => assert.equal(queue.size, 0));
test("only background surface has depth blur", () => {
  assert.equal(surfaces[0].style.filter, "blur(0.00px)");
  assert.equal(surfaces[1].style.filter, "blur(1.10px)");
});
test("depth field setter clamps and updates", () => {
  scene.setDepthOfField(8);
  assert.equal(scene.state.depthOfField, 3);
  assert.equal(surfaces[1].style.filter, "blur(3.00px)");
});
test("overview restores sharp panels", () => {
  scene.setMode("overview");
  assert.equal(surfaces[1].style.filter, "blur(0.00px)");
});
test("focus can clear blur and retain native surface", () => {
  scene.focus("b");
  assert.equal(surfaces[1].style.filter, "blur(0.00px)");
  assert.equal(surfaces[1].attrs["aria-pressed"], void 0);
  assert.equal(surfaces[1].button.attrs["aria-pressed"], "true");
});
scene.setMode("overview");
scene.orbit(12);
const handle = surfaces[1].handle;
test("drag captures pointer and lifts panel", () => {
  handle.emit("pointerdown", { clientX: 860, clientY: 405 });
  assert.equal(scene.stats.dragging, true);
  assert.equal(handle.capture, 1);
  assert.match(surfaces[1].style.transform, /,75(?:\.\d+)?px\)/);
});
test("drag applies bounded displacement and velocity tilt", () => {
  clock += 16;
  document.emit("pointermove", { clientX: 930, clientY: 450 });
  assert.match(surfaces[1].style.transform, /rotateX\(-/);
  assert.equal(queue.size, 0);
});
test("release springs then stops completely", () => {
  document.emit("pointerup");
  assert.equal(scene.stats.settling, true);
  assert.equal(queue.size, 1);
  advance(1600);
  assert.deepEqual(scene.stats, { animationFramePending: false, pendingFrames: 0, layoutAnimations: 0, dragging: false, settling: false, resizing: false });
  assert.equal(queue.size, 0);
  assert.equal(surfaces[1].dataset.settling, void 0);
});
test("reset interrupts pending spring", () => {
  handle.emit("pointerdown", { clientX: 860, clientY: 405 });
  clock += 16;
  document.emit("pointermove", { clientX: 900, clientY: 420 });
  document.emit("pointerup");
  assert.equal(queue.size, 1);
  scene.reset();
  assert.equal(queue.size, 0);
  assert.equal(scene.state.active, "a");
});
test("extreme drag remains within scene bounds", () => {
  handle.emit("pointerdown", { clientX: 860, clientY: 405 });
  clock += 16;
  document.emit("pointermove", { clientX: 1e5, clientY: 1e5 });
  const xyz = surfaces[1].style.transform.match(/translate3d\(([-.0-9]+)px,([-.0-9]+)px,/);
  assert.ok(Math.abs(Number(xyz[1])) <= 406);
  assert.ok(Math.abs(Number(xyz[2])) <= 176);
  handle.emit("pointercancel");
  scene.reset();
});
test("pointer cancellation never starts inertia", () => {
  handle.emit("pointerdown", { clientX: 860, clientY: 405 });
  handle.emit("pointercancel");
  assert.equal(queue.size, 0);
  assert.equal(scene.stats.dragging, false);
  assert.equal(handle.capture, void 0);
});
test("keyboard layout change needs no animation loop", () => {
  handle.emit("keydown", { key: "ArrowRight" });
  assert.equal(scene.state.mode, "overview");
  assert.equal(scene.state.active, "b");
  assert.equal(queue.size, 0);
});
test("reduced motion removes blur tilt and release animation", () => {
  motion.matches = true;
  motion.emit("change");
  scene.focus("a");
  assert.equal(surfaces[1].style.filter, "blur(0.00px)");
  handle.emit("pointerdown", { clientX: 860, clientY: 405 });
  clock += 16;
  document.emit("pointermove", { clientX: 900, clientY: 420 });
  document.emit("pointerup");
  assert.equal(queue.size, 0);
  assert.match(surfaces[1].style.transform, /rotateX\(0deg\) rotateY\(0deg\)/);
});
test("compact scenes become sharp static document surfaces", () => {
  element.clientWidth = 390;
  observer.fn();
  assert.equal(element.dataset.compact, "true");
  assert.equal(surfaces[0].style.transform, "none");
  handle.emit("pointerdown", { clientX: 100, clientY: 100 });
  assert.equal(scene.stats.dragging, false);
});
test("destroy restores DOM and detaches every handler", () => {
  scene.destroy();
  assert.equal(observer.disconnected, true);
  assert.equal(element.dataset.ready, void 0);
  assert.equal(surfaces[0].style.filter, void 0);
  assert.equal(queue.size, 0);
  assert.equal([...handle.handlers.values()].reduce((n, s) => n + s.size, 0), 0);
});
test("disposed controller methods do not reactivate", () => {
  const before = notifications;
  scene.reset();
  scene.focus("a");
  scene.orbit(4);
  scene.setDepth(1);
  scene.setDepthOfField(2);
  scene.setMode("overview");
  assert.equal(notifications, before);
  assert.equal(queue.size, 0);
});
console.log(`${checks} scene checks passed`);
motion.matches = false;
const loopFixture = fixture(), loopScene = createScene(loopFixture.element);
test("belt schedules and changes transforms", () => {
  loopScene.setPath("belt", { diameter: 600, axis: 30 });
  const before = loopFixture.surfaces[1].style.transform;
  advance(400);
  assert.notEqual(loopFixture.surfaces[1].style.transform, before);
});
test("focusing leaves automatic motion", () => {
  loopScene.focus("b");
  advance(750);
  assert.equal(loopScene.state.path, "none");
  assert.equal(loopScene.stats.animationFramePending, false);
});
test("proximity clears background blur", () => {
  loopScene.focus("a");
  for (const s of loopFixture.surfaces) s.getBoundingClientRect = () => ({ left: 0, right: 100, top: 0, bottom: 100 });
  loopFixture.element.emit("pointermove", { clientX: 50, clientY: 50, pointerType: "mouse" });
  advance(16);
  assert.equal(loopFixture.surfaces[1].style.filter, "blur(0.00px)");
  loopFixture.element.emit("pointerleave");
  assert.equal(loopFixture.surfaces[1].style.filter, "blur(1.10px)");
});
loopScene.destroy();
const natural = fixture(), naturalScene = createScene(natural.element), plain = { closest: () => null };
advance(400);
test("card click toggles focus and overview", () => {
  natural.surfaces[1].emit("click", { target: plain });
  assert.equal(naturalScene.state.active, "b");
  assert.equal(naturalScene.state.mode, "focus");
  natural.surfaces[1].emit("click", { target: plain });
  assert.equal(naturalScene.state.mode, "overview");
});
test("outside click dismisses focus", () => {
  naturalScene.focus("a");
  natural.element.emit("click", { target: plain });
  assert.equal(naturalScene.state.mode, "overview");
});
test("native input click does not move a panel", () => {
  natural.surfaces[1].emit("click", { target: { closest: (q) => q.startsWith("input") ? {} : null } });
  assert.equal(naturalScene.state.mode, "overview");
});
test("body drag waits for movement threshold", () => {
  natural.surfaces[1].emit("pointerdown", { target: plain, clientX: 850, clientY: 400 });
  document.emit("pointermove", { clientX: 853, clientY: 402 });
  assert.equal(naturalScene.stats.dragging, false);
  document.emit("pointermove", { clientX: 870, clientY: 420, button: -1 });
  assert.equal(naturalScene.stats.dragging, true);
  document.emit("pointerup");
  natural.surfaces[1].emit("click", { target: plain });
  assert.equal(naturalScene.state.mode, "overview");
  advance(1600);
});
test("overview resumes a previously focused loop", () => {
  naturalScene.setPath("belt");
  naturalScene.focus("a");
  advance(750);
  naturalScene.setMode("overview");
  assert.equal(naturalScene.state.path, "belt");
});
naturalScene.destroy();
console.log(`${checks} total checks passed`);
const overlap = fixture(), overlapScene = createScene(overlap.element);
test("focused card remains above background shells", () => {
  overlapScene.focus("b");
  assert.ok(Number(overlap.surfaces[1].style.zIndex) > Number(overlap.surfaces[0].style.zIndex));
});
test("resting panels stay parallel with distinct depth", () => {
  overlapScene.setMode("overview");
  assert.notEqual(overlap.surfaces[0].style.transform.match(/translate3d\([^)]*/)[0], overlap.surfaces[1].style.transform.match(/translate3d\([^)]*/)[0]);
  for (const s of overlap.surfaces) assert.match(s.style.transform, /rotateY\(0deg\)/);
});
overlapScene.destroy();
const rail = fixture(), railScene = createScene(rail.element);
railScene.setPath("belt");
test("path drag scrubs orbit without free displacement", () => {
  const before = rail.surfaces[0].style.transform;
  rail.surfaces[0].handle.emit("pointerdown", { clientX: 500, clientY: 300 });
  document.emit("pointermove", { clientX: 650, clientY: 500, button: -1 });
  assert.equal(railScene.state.path, "belt");
  assert.notEqual(rail.surfaces[0].style.transform, before);
  document.emit("pointerup");
  assert.equal(railScene.stats.settling, false);
  assert.equal(railScene.state.path, "belt");
});
test("path selection arrives before focusing", () => {
  railScene.focus("b");
  assert.equal(railScene.state.mode, "overview");
  advance(750);
  assert.equal(railScene.state.mode, "focus");
  assert.equal(railScene.state.active, "b");
  railScene.setMode("overview");
  assert.equal(railScene.state.path, "belt");
});
railScene.destroy();
console.log(`${checks} checks passed`);
const momentum = fixture(), momentumScene = createScene(momentum.element);
momentumScene.setPath("belt");
test("path release keeps moving and converges to cruising speed", () => {
  momentum.surfaces[0].handle.emit("pointerdown", { clientX: 400, clientY: 300 });
  advance(32);
  document.emit("pointermove", { clientX: 500, clientY: 300, button: -1 });
  document.emit("pointerup");
  const before = momentum.surfaces[0].style.transform;
  advance(200);
  assert.notEqual(momentum.surfaces[0].style.transform, before);
  assert.equal(momentumScene.state.path, "belt");
  advance(4e3);
  assert.ok(Math.abs(momentumScene.state.angularVelocity - 0.15) < 1e-3);
  assert.equal(momentumScene.stats.animationFramePending, true);
});
test("selection leaves neighboring cards on their path positions", () => {
  momentumScene.focus("a");
  advance(640);
  const before = momentum.surfaces[1].style.transform;
  advance(32);
  assert.equal(momentumScene.state.mode, "focus");
  const xyz = (s) => s.match(/translate3d\(([^)]+)\)/)[1].split(",").map(parseFloat);
  const a = xyz(before), b = xyz(momentum.surfaces[1].style.transform);
  assert.ok(Math.hypot(...a.map((v, i) => v - b[i])) < 1);
});
test("pile unfolds and cycles its front card", () => {
  momentumScene.setLayout("pile");
  const before = momentum.surfaces[0].style.transform;
  momentumScene.sendToBack();
  assert.notEqual(momentum.surfaces[0].style.transform, before);
  momentumScene.setLayout("grid");
  assert.equal(momentumScene.state.layout, "grid");
});
momentumScene.destroy();
console.log(`${checks} checks passed`);
const morph = fixture(), animations = [];
globalThis.getComputedStyle = (s) => ({ transform: s.style.transform });
for (const surface2 of morph.surfaces) surface2.animate = (frames, options) => {
  const animation = { frames, options, cancelled: false, cancel() {
    this.cancelled = true;
  } };
  animations.push(animation);
  return animation;
};
const morphScene = createScene(morph.element);
test("layout morph preserves surfaces and cancels interrupted animations", () => {
  const identities = [...morph.surfaces];
  morphScene.setLayout("pile");
  assert.equal(animations.length, 2);
  morphScene.setPath("belt");
  assert.ok(animations.slice(0, 2).every((a) => a.cancelled));
  assert.deepEqual(morph.surfaces, identities);
  assert.equal(animations.length, 4);
});
morphScene.destroy();
delete globalThis.getComputedStyle;
console.log(`${checks} total checks passed`);
const fitting = fixture();
fitting.element.dataset.case = "creative";
for (const surface2 of fitting.surfaces) {
  surface2.offsetWidth = 260;
  surface2.offsetHeight = 250;
}
const fitScene = createScene(fitting.element);
test("resizing fits dimensions and moves neighbors into depth", () => {
  const before = fitting.surfaces[1].style.transform;
  fitScene.resizeSurface("a", 700, 450);
  assert.equal(fitting.surfaces[0].style.width, "700px");
  assert.notEqual(fitting.surfaces[1].style.transform, before);
  assert.equal(fitting.surfaces[0].dataset.sized, "true");
});
test("oversized panels remain bounded and reset restores authored size", () => {
  fitScene.resizeSurface("a", 1e5, 1e5);
  assert.ok(parseFloat(fitting.surfaces[0].style.width) <= 760);
  assert.ok(parseFloat(fitting.surfaces[0].style.height) <= 580);
  fitScene.reset();
  assert.equal(fitting.surfaces[0].style.width, "");
  assert.equal(fitting.surfaces[0].dataset.sized, void 0);
});
fitScene.destroy();
console.log(`${checks} checks passed`);
const corners = fixture();
corners.element.dataset.case = "creative";
const corner = new Target();
corner.dataset.resize = "se";
corners.surfaces[0].querySelectorAll = () => [corner];
for (const s of corners.surfaces) {
  s.offsetWidth = 260;
  s.offsetHeight = 250;
}
const cornerScene = createScene(corners.element);
test("corner resize captures pointer and cancel releases it", () => {
  corner.emit("pointerdown", { clientX: 500, clientY: 400 });
  assert.equal(cornerScene.state.resizing, true);
  assert.equal(corner.capture, 1);
  document.emit("pointermove", { clientX: 540, clientY: 440 });
  assert.ok(parseFloat(corners.surfaces[0].style.width) > 260);
  document.emit("pointercancel");
  assert.equal(cornerScene.state.resizing, false);
  assert.equal(corner.capture, void 0);
});
test("compact layout rejects resize", () => {
  corners.element.clientWidth = 390;
  observer.fn();
  const previous = corners.surfaces[0].style.width;
  cornerScene.resizeSurface("a", 600, 400);
  assert.equal(corners.surfaces[0].style.width, previous);
});
cornerScene.destroy();
console.log(`${checks} checks passed`);
const adaptive = fixture();
adaptive.element.dataset.case = "creative";
adaptive.element.clientWidth = 760;
for (const s of adaptive.surfaces) {
  s.offsetWidth = 260;
  s.offsetHeight = 250;
  s.getBoundingClientRect = () => ({ left: 0, top: 0, width: 260, height: 250 });
}
const adaptiveScene = createScene(adaptive.element);
test("modules collapse as canvas grows and restore when focused", () => {
  adaptiveScene.resizeSurface("a", 740, 400);
  assert.equal(adaptive.surfaces[1].dataset.density, "minimal");
  adaptiveScene.focus("b");
  assert.equal(adaptive.surfaces[1].dataset.density, "full");
  adaptiveScene.focus("a");
  adaptiveScene.resizeSurface("a", 300, 300);
  assert.equal(adaptive.surfaces[1].dataset.density, "full");
});
test("off-center click has bounded tilt that settles", () => {
  advance(400);
  adaptive.surfaces[1].emit("click", { target: plain, clientX: 220, clientY: 220 });
  assert.match(adaptive.surfaces[1].style.transform, /rotateX\((?!0deg)/);
  advance(1200);
  assert.match(adaptive.surfaces[1].style.transform, /rotateX\(0deg\) rotateY\(0deg\)/);
});
adaptiveScene.destroy();
console.log(`${checks} checks passed`);
const assembly = fixture();
assembly.element.dataset.case = "creative";
const assemblyScene = createScene(assembly.element);
test("workspace gathering preserves modules and unfolds their positions", () => {
  const ids = assembly.surfaces.map((s) => s.dataset.surface);
  assemblyScene.setAssembled(true);
  assert.equal(assemblyScene.state.assembled, true);
  const gathered = assembly.surfaces[1].style.transform;
  assemblyScene.setAssembled(false);
  assert.notEqual(assembly.surfaces[1].style.transform, gathered);
  assert.deepEqual(assembly.surfaces.map((s) => s.dataset.surface), ids);
});
assemblyScene.destroy();
console.log(`${checks} checks passed`);
const beltFocus = fixture(), beltFocusScene = createScene(beltFocus.element);
beltFocusScene.setPath("belt", { diameter: 900 });
beltFocusScene.focus("b");
advance(750);
test("selected belt card is ahead of entire path depth", () => {
  const z = Number(beltFocus.surfaces[1].style.transform.match(/translate3d\([^,]+,[^,]+,([-.0-9]+)px/)[1]);
  assert.ok(z > 450);
});
test("dragging focused belt card resumes path instead of free placement", () => {
  beltFocus.surfaces[1].handle.emit("pointerdown", { clientX: 500, clientY: 300 });
  document.emit("pointermove", { clientX: 550, clientY: 350, button: -1 });
  assert.equal(beltFocusScene.state.path, "belt");
  assert.equal(beltFocusScene.state.mode, "overview");
  document.emit("pointerup");
  assert.equal(beltFocusScene.stats.settling, false);
});
beltFocusScene.destroy();
console.log(`${checks} checks passed`);
const semantic = fixture();
semantic.element.dataset.case = "creative";
semantic.element.clientWidth = 760;
const semanticScene = createScene(semantic.element);
semanticScene.resizeSurface("a", 740, 420);
test("support modules compact before geometric shrinking", () => {
  for (const s of semantic.surfaces.slice(1)) if (Number(s.dataset.edgeScale) < 0.98) assert.equal(s.dataset.density, "minimal");
});
semanticScene.destroy();
console.log(`${checks} checks passed`);
test("invalid mounts fail before mutating the DOM", () => {
  assert.throws(() => createScene(null), /scene element/);
  const empty = fixture();
  empty.element.querySelectorAll = () => [];
  assert.throws(() => createScene(empty.element), /at least one/);
  const duplicate = fixture();
  duplicate.surfaces[1].dataset.surface = "a";
  assert.throws(() => createScene(duplicate.element), /unique/);
  assert.equal(duplicate.element.dataset.ready, void 0);
});
test("one controller owns a scene until it is destroyed", () => {
  const f = fixture(), s = createScene(f.element);
  assert.throws(() => createScene(f.element), /already has/);
  s.destroy();
  createScene(f.element).destroy();
});
test("pause retains the configured path and resumes it without idle work", () => {
  const f = fixture(), s = createScene(f.element);
  s.setPath("belt");
  advance(100);
  s.pause();
  assert.equal(s.isPaused, true);
  assert.equal(s.state.configuredPath, "belt");
  const pose = f.surfaces[0].style.transform;
  advance(1e3);
  assert.equal(f.surfaces[0].style.transform, pose);
  assert.equal(queue.size, 0);
  s.resume();
  advance(100);
  assert.equal(s.isPaused, false);
  assert.notEqual(f.surfaces[0].style.transform, pose);
  s.destroy();
});
test("offscreen observation stops every frame and resumes visible motion", () => {
  let intersection;
  globalThis.IntersectionObserver = class {
    constructor(fn) {
      intersection = this;
      this.fn = fn;
    }
    observe() {
    }
    disconnect() {
      this.disconnected = true;
    }
  };
  const f = fixture(), s = createScene(f.element);
  s.setPath("belt");
  intersection.fn([{ target: f.element, isIntersecting: false, intersectionRatio: 0 }]);
  assert.equal(queue.size, 0);
  assert.equal(s.state.visible, false);
  assert.equal(s.stats.pendingFrames, 0);
  intersection.fn([{ target: f.element, isIntersecting: true, intersectionRatio: 1 }]);
  assert.equal(s.state.visible, true);
  assert.equal(queue.size, 1);
  s.destroy();
  assert.equal(intersection.disconnected, true);
  delete globalThis.IntersectionObserver;
});
test("document visibility suspends and resumes the configured path", () => {
  const f = fixture(), s = createScene(f.element);
  s.setPath("belt");
  document.hidden = true;
  document.emit("visibilitychange");
  assert.equal(queue.size, 0);
  document.hidden = false;
  document.emit("visibilitychange");
  assert.equal(queue.size, 1);
  s.destroy();
});
test("cancelled body presses release capture and do not become drags later", () => {
  const f = fixture(), s = createScene(f.element);
  f.surfaces[0].emit("pointerdown", { target: plain, clientX: 300, clientY: 300 });
  assert.equal(f.surfaces[0].capture, 1);
  document.emit("pointercancel");
  assert.equal(f.surfaces[0].capture, void 0);
  document.emit("pointermove", { clientX: 500, clientY: 500 });
  assert.equal(s.stats.dragging, false);
  s.destroy();
});
test("a second pointer cannot steal an active drag or cancel it", () => {
  const f = fixture(), s = createScene(f.element);
  f.surfaces[0].handle.emit("pointerdown", { clientX: 300, clientY: 300 });
  f.surfaces[1].handle.emit("pointerdown", { pointerId: 2, clientX: 300, clientY: 300 });
  assert.equal(f.surfaces[1].handle.capture, void 0);
  document.emit("pointercancel", { pointerId: 2 });
  assert.equal(s.stats.dragging, true);
  document.emit("pointercancel");
  assert.equal(s.stats.dragging, false);
  s.destroy();
});
test("destroy restores authored styles, data, and accessibility exactly", () => {
  const f = fixture();
  f.element.dataset.ready = "author";
  f.element.style.setProperty("--scene-scale", "0.8");
  f.surfaces[0].style.transform = "translateX(4px)";
  f.surfaces[0].style.zIndex = "12";
  f.surfaces[0].dataset.active = "original";
  f.surfaces[0].button.setAttribute("aria-pressed", "mixed");
  const s = createScene(f.element);
  s.setPath("belt");
  s.destroy();
  assert.equal(f.element.dataset.ready, "author");
  assert.equal(f.element.style["--scene-scale"], "0.8");
  assert.equal(f.surfaces[0].style.transform, "translateX(4px)");
  assert.equal(f.surfaces[0].style.zIndex, "12");
  assert.equal(f.surfaces[0].dataset.active, "original");
  assert.equal(f.surfaces[0].button.attrs["aria-pressed"], "mixed");
  const snapshot = JSON.stringify(f.surfaces.map((surface2) => ({ style: surface2.style, data: surface2.dataset })));
  s.pause();
  s.resume();
  s.focus("b");
  s.resizeSurface("a", 600, 400);
  s.setAssembled(true);
  s.setLayout("pile");
  s.sendToBack();
  s.setPath("belt");
  s.destroy();
  assert.equal(JSON.stringify(f.surfaces.map((surface2) => ({ style: surface2.style, data: surface2.dataset }))), snapshot);
  assert.equal(queue.size, 0);
});
test("workspace and assembly slots are reusable without creative demo attributes", () => {
  const f = fixture(), s = createScene(f.element, { workspace: true, assembly: { width: 900, height: 640, slots: { b: { x: 240, y: 120, width: 240, height: 300 } } } });
  s.resizeSurface("a", 450, 300);
  assert.equal(f.surfaces[0].dataset.sized, "true");
  s.setAssembled(true);
  assert.equal(f.element.style["--assembly-width"], "900px");
  assert.equal(f.surfaces[1].style["--assembled-width"], "240px");
  const transform = f.surfaces[1].style.transform;
  assert.match(transform, /translate3d\(204px,102px,0px\)/);
  f.surfaces[1].emit("focusin");
  assert.equal(s.state.assembled, true);
  s.setLayout("pile");
  assert.equal(s.state.assembled, false);
  s.destroy();
});
test("assembly gives additional modules distinct slots instead of overlapping", () => {
  const f = fixture();
  f.surfaces.push(...Array.from({ length: 5 }, (_, i) => surface("extra" + i, 0, 0)));
  const s = createScene(f.element, { workspace: true });
  s.setAssembled(true);
  assert.equal(new Set(f.surfaces.map((surface2) => surface2.style.transform)).size, 7);
  assert.equal(f.element.style["--assembly-height"], "910px");
  s.destroy();
});
test("orbit keeps a configured motion path running", () => {
  const f = fixture(), s = createScene(f.element);
  s.setPath("belt");
  s.orbit(10);
  assert.equal(s.state.path, "belt");
  assert.equal(queue.size, 1);
  s.destroy();
});
test("compact resizing stops feedback as well as path frames", () => {
  const f = fixture();
  for (const surface2 of f.surfaces) surface2.getBoundingClientRect = () => ({ left: 0, top: 0, width: 260, height: 250 });
  const s = createScene(f.element);
  advance(400);
  f.surfaces[1].emit("click", { target: plain, clientX: 220, clientY: 220 });
  assert.equal(s.stats.pendingFrames, 1);
  f.element.clientWidth = 400;
  observer.fn();
  assert.equal(queue.size, 0);
  s.destroy();
});
console.log(`${checks} total scene checks passed`);
test('document gesture listeners stay constant as surface count grows', () => {
  const f = fixture();
  f.surfaces.push(...Array.from({length: 20}, (_, index) => surface('panel' + index, 0, 0)));
  const s = createScene(f.element);
  assert.equal(document.handlers.get('pointermove').size, 2);
  assert.equal(document.handlers.get('pointerup').size, 3);
  s.destroy();
  assert.equal(document.handlers.get('pointermove').size, 0);
});
test('an application can destroy its controller from a change callback', () => {
  const f = fixture();
  let s;
  s = createScene(f.element, {onChange: () => s?.destroy()});
  s.setPath('belt');
  assert.equal(s.state.disposed, true);
  assert.equal(queue.size, 0);
  assert.equal(f.element.dataset.ready, undefined);
});
test('manual pause cancels pending hover and feedback work together', () => {
  const f = fixture();
  for (const surface of f.surfaces) surface.getBoundingClientRect = () => ({left: 0, top: 0, right: 260, bottom: 250, width: 260, height: 250});
  const s = createScene(f.element);
  advance(400);
  f.surfaces[1].emit('click', {target: plain, clientX: 220, clientY: 220});
  f.element.emit('pointermove', {clientX: 20, clientY: 20, pointerType: 'mouse'});
  assert.equal(s.stats.pendingFrames, 2);
  s.pause();
  assert.equal(queue.size, 0);
  assert.equal(s.stats.animationFramePending, false);
  s.destroy();
});
console.log(`${checks} total scene checks passed`);

test('focus controls announce focused rather than merely active surfaces', () => {
  const f = fixture(), s = createScene(f.element, {workspace:true});
  s.setMode('overview');
  assert.ok(f.surfaces.every(surface => surface.button.attrs['aria-pressed'] === 'false'));
  s.focus('b');
  assert.equal(f.surfaces[1].button.attrs['aria-pressed'], 'true');
  s.setAssembled(true);
  assert.ok(f.surfaces.every(surface => surface.button.attrs['aria-pressed'] === 'false'));
  s.destroy();
});
console.log(`${checks} total scene checks passed`);

// A small CSSOM model: writing a declaration canonicalizes the attribute text,
// just as the browser does, while the original source may use arbitrary spacing.
function styledTarget(original) {
  let raw = original;
  const declarations = new Map();
  const read = value => {
    declarations.clear();
    for (const part of (value || '').split(';')) {
      const colon = part.indexOf(':');
      if (colon >= 0) declarations.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim());
    }
  };
  read(original);
  const write = () => {raw = [...declarations].map(([name, value]) => `${name}: ${value};`).join(' ');};
  return {
    dataset: {},
    style: {
      get length() {return declarations.size;},
      [Symbol.iterator]() {return declarations.keys();},
      getPropertyValue(name) {return declarations.get(name) || '';},
      getPropertyPriority() {return '';},
      setProperty(name, value) {declarations.set(name, value);write();},
      removeProperty(name) {declarations.delete(name);write();},
    },
    getAttribute(name) {return name === 'style' ? raw : null;},
    setAttribute(name, value) {if (name === 'style') {raw = value;read(value);}},
    removeAttribute(name) {if (name === 'style') {raw = null;declarations.clear();}},
  };
}
const {captureDOMState} = await import('../src/dom-state.js');
test('teardown restores the exact authored style attribute when otherwise unchanged', () => {
  const element = styledTarget('color:red;  width : 240px');
  const restore = captureDOMState(element, {styles: ['width', 'transform']});
  element.style.setProperty('width', '400px');
  element.style.setProperty('transform', 'translateX(10px)');
  restore();
  assert.equal(element.getAttribute('style'), 'color:red;  width : 240px');
});
test('teardown removes the empty style attribute it created', () => {
  const element = styledTarget(null);
  const restore = captureDOMState(element, {styles: ['filter']});
  element.style.setProperty('filter', 'blur(2px)');
  restore();
  assert.equal(element.getAttribute('style'), null);
});
test('teardown preserves unrelated styles changed by the application', () => {
  const element = styledTarget('color:red; width:240px');
  const restore = captureDOMState(element, {styles: ['width', 'transform']});
  element.style.setProperty('width', '400px');
  element.style.setProperty('transform', 'translateX(10px)');
  element.style.setProperty('color', 'blue');
  restore();
  assert.equal(element.style.getPropertyValue('color'), 'blue');
  assert.equal(element.style.getPropertyValue('width'), '240px');
  assert.equal(element.style.getPropertyValue('transform'), '');
});
console.log(`${checks} total scene checks passed`);

for (const cancelled of [false,true]) test(`pile drag ${cancelled?'cancellation restores order':'cycles the front card behind the stack'}`,()=>{
 const f=fixture(),s=createScene(f.element);s.setLayout('pile');
 f.surfaces[0].handle.emit('pointerdown',{clientX:560,clientY:325});
 document.emit('pointermove',{clientX:780,clientY:350});
 document.emit(cancelled?'pointercancel':'pointerup');
 advance(1200);
 assert.equal(s.state.active,cancelled?'a':'b');
 assert.equal(s.state.layout,'pile');
 assert.equal(s.stats.dragging,false);
 if(!cancelled)assert.ok(Number(f.surfaces[0].style.zIndex)<Number(f.surfaces[1].style.zIndex));
 s.destroy();
});
test('pile handle click without a drag does not cycle',()=>{
 const f=fixture(),s=createScene(f.element);s.setLayout('pile');
 f.surfaces[0].handle.emit('pointerdown',{clientX:560,clientY:325});document.emit('pointerup');
 assert.equal(s.state.active,'a');s.destroy();
});
test('free pile placement persists and disabling it gathers the cards',()=>{
 const f=fixture(),s=createScene(f.element);s.setLayout('pile');s.setPileDragMode('free');
 f.surfaces[0].handle.emit('pointerdown',{clientX:560,clientY:325});document.emit('pointermove',{clientX:780,clientY:350});document.emit('pointerup');advance(1600);
 assert.equal(s.state.active,'a');assert.equal(s.state.pileDragMode,'free');
 assert.doesNotMatch(f.surfaces[0].style.transform,/translate3d\(0px,0px,0px\)/);
 s.setPileDragMode('cycle');assert.match(f.surfaces[0].style.transform,/translate3d\(0px,0px,0px\)/);s.destroy();
});
test('pile keyboard gesture cycles rather than freely displacing',()=>{
 const f=fixture(),s=createScene(f.element);s.setLayout('pile');f.surfaces[0].handle.emit('keydown',{key:'ArrowRight'});
 assert.equal(s.state.active,'b');s.destroy();
});
for(const path of ['belt','wave'])test(`${path} cursor reverses, brakes to idle, tilts, then resumes on leave`,()=>{
 const f=fixture();for(const panel of f.surfaces)panel.getBoundingClientRect=()=>({left:400,right:660,top:200,bottom:450});
 const s=createScene(f.element);s.setPath(path,{interaction:'steer',tilt:8});advance(1000);
 f.element.emit('pointermove',{clientX:100,clientY:100,pointerType:'mouse'});advance(2000);
 assert.ok(s.state.angularVelocity<-.1);assert.doesNotMatch(f.surfaces[0].style.transform,/rotateX\(0deg\)/);
 f.element.emit('pointermove',{clientX:1020,clientY:550,pointerType:'mouse'});advance(2000);assert.ok(s.state.angularVelocity>.1);
 f.element.emit('pointermove',{clientX:560,clientY:325,pointerType:'mouse'});advance(2500);assert.equal(s.state.angularVelocity,0);assert.equal(s.stats.animationFramePending,false);
 f.element.emit('pointerleave');advance(1000);assert.ok(s.state.angularVelocity>0);s.destroy();
});
test('hover-to-pause ignores position and resumes on leave',()=>{
 const f=fixture();for(const panel of f.surfaces)panel.getBoundingClientRect=()=>({left:400,right:660,top:200,bottom:450});
 const s=createScene(f.element);s.setPath('belt',{interaction:'pause',tilt:0});advance(1000);
 f.element.emit('pointermove',{clientX:100,clientY:325,pointerType:'mouse'});advance(2500);assert.equal(s.stats.animationFramePending,false);
 f.element.emit('pointerleave');advance(1000);assert.ok(s.state.angularVelocity>0);s.destroy();
});
test('cursor settings remain bounded and reduced motion stays idle',()=>{
 const f=fixture(),s=createScene(f.element);s.setPath('wave',{interaction:'steer',tilt:99});assert.equal(s.state.cursorTilt,12);
 motion.matches=true;motion.emit('change');f.element.emit('pointermove',{clientX:0,clientY:0});advance(1000);assert.equal(s.stats.animationFramePending,false);assert.match(f.surfaces[0].style.transform,/rotateX\(0deg\)/);
 s.destroy();motion.matches=false;
});
console.log(`${checks} total scene checks passed`);

const xyz = surface => surface.style.transform.match(/translate3d\(([^)]+)\)/)[1].split(',').map(parseFloat);
function collectionFixture(count=5) {
 const f=fixture();f.surfaces.push(...Array.from({length:count-2},(_,i)=>surface('extra'+i,0,0)));return f;
}
test('fan spreads a curved deck and lifts the selected card ahead of it',()=>{
 const f=collectionFixture(),s=createScene(f.element);s.setLayout('fan');
 assert.equal(s.state.layout,'fan');assert.equal(new Set(f.surfaces.map(panel=>xyz(panel)[0])).size,5);
 assert.ok(xyz(f.surfaces[0])[1]>xyz(f.surfaces[2])[1]);assert.match(f.surfaces[0].style.transform,/rotateZ\(-/);
 s.focus('extra0');assert.equal(xyz(f.surfaces[2])[0],0);assert.ok(xyz(f.surfaces[2])[2]>Math.max(...f.surfaces.filter((_,i)=>i!==2).map(panel=>xyz(panel)[2])));s.destroy();
});
test('fan cycles by gesture and supports deliberately detached placement',()=>{
 const f=collectionFixture(),s=createScene(f.element);s.setLayout('fan');
 f.surfaces[0].handle.emit('pointerdown',{clientX:400,clientY:300});document.emit('pointermove',{clientX:600,clientY:350});document.emit('pointerup');advance(1500);
 assert.equal(s.state.active,'b');s.setPileDragMode('free');
 f.surfaces[1].handle.emit('pointerdown',{clientX:400,clientY:300});document.emit('pointermove',{clientX:600,clientY:350});document.emit('pointerup');advance(1500);
 const placed=f.surfaces[1].style.transform;s.setDepthOfField(2);assert.equal(f.surfaces[1].style.transform,placed);
 s.setPileDragMode('cycle');assert.notEqual(f.surfaces[1].style.transform,placed);s.destroy();
});
test('rail navigation centres the chosen item and recedes its neighbors',()=>{
 const f=collectionFixture(),s=createScene(f.element);s.setLayout('rail');s.navigate(2);advance(1600);
 assert.equal(s.state.railIndex,2);assert.equal(s.state.railPosition,2);assert.equal(s.state.active,'extra0');assert.equal(xyz(f.surfaces[2])[0],0);
 assert.ok(xyz(f.surfaces[1])[0]<0&&xyz(f.surfaces[3])[0]>0);assert.ok(xyz(f.surfaces[1])[2]<xyz(f.surfaces[2])[2]);
 assert.equal(s.stats.animationFramePending,false);s.destroy();
});
test('rail navigation clamps at ends and grips navigate without detaching',()=>{
 const f=collectionFixture(),s=createScene(f.element);s.setLayout('rail');s.navigate(-100);advance(1600);assert.equal(s.state.railIndex,0);
 s.navigate(100);advance(1600);assert.equal(s.state.railIndex,4);
 f.surfaces[4].handle.emit('keydown',{key:'ArrowLeft'});advance(1600);assert.equal(s.state.railIndex,3);assert.equal(s.state.layout,'rail');assert.equal(s.state.path,'none');s.destroy();
});
test('rail drag scrubs the shared position then snaps with bounded momentum',()=>{
 const f=collectionFixture(),s=createScene(f.element);s.setLayout('rail');
 f.surfaces[0].handle.emit('pointerdown',{clientX:600,clientY:300});advance(32);document.emit('pointermove',{clientX:280,clientY:520});
 assert.equal(s.state.railPosition,1);assert.equal(s.state.layout,'rail');assert.equal(xyz(f.surfaces[1])[0],0);
 document.emit('pointerup');assert.equal(s.stats.settling,true);assert.ok(s.state.railIndex>=1&&s.state.railIndex<=2);
 const first=s.state.railPosition;advance(100);assert.ok(s.state.railPosition>first);advance(1500);
 assert.equal(s.state.railPosition,s.state.railIndex);assert.equal(s.stats.animationFramePending,false);s.destroy();
});
test('rail pointer cancellation restores selection and never leaves a detached panel',()=>{
 const f=collectionFixture(),s=createScene(f.element);s.setLayout('rail');s.navigate(2);advance(1600);
 f.surfaces[2].handle.emit('pointerdown',{clientX:600,clientY:300});document.emit('pointermove',{clientX:200,clientY:500});document.emit('pointercancel');advance(1600);
 assert.equal(s.state.railPosition,2);assert.equal(s.state.railIndex,2);assert.equal(s.stats.dragging,false);assert.equal(f.surfaces[2].handle.capture,undefined);s.destroy();
});
test('rail focused card clicks and interrupted navigation preserve a stable rail',()=>{
 const f=collectionFixture(),s=createScene(f.element);s.setLayout('rail');s.focus('extra2');advance(100);const before=s.state.railPosition;
 s.navigate(-1);assert.equal(s.state.railIndex,3);assert.equal(s.state.railPosition,before);advance(1600);assert.equal(s.state.railPosition,3);
 s.setMode('overview');assert.equal(s.state.layout,'rail');assert.equal(s.state.railPosition,3);s.destroy();
});
test('rail pause, compact, and reduced motion leave no background springs',()=>{
 const f=collectionFixture(),s=createScene(f.element);s.setLayout('rail');s.navigate(3);advance(80);s.pause();assert.equal(s.state.railPosition,3);assert.equal(queue.size,0);
 s.navigate(-1);assert.equal(s.state.railPosition,2);assert.equal(queue.size,0);s.resume();
 motion.matches=true;motion.emit('change');s.navigate(1);assert.equal(s.state.railPosition,3);assert.equal(queue.size,0);motion.matches=false;motion.emit('change');
 f.element.clientWidth=400;observer.fn();s.navigate(-2);assert.equal(s.state.railPosition,1);assert.equal(queue.size,0);assert.equal(f.surfaces[1].style.transform,'none');s.destroy();
});
test('switching away from a snapping rail cancels its work and resets detached positions',()=>{
 const f=collectionFixture(),s=createScene(f.element);s.setLayout('rail');s.navigate(3);advance(100);s.setLayout('fan');advance(1600);
 assert.equal(s.state.layout,'fan');assert.equal(s.stats.settling,false);assert.equal(queue.size,0);
 const pose=f.surfaces[0].style.transform;s.navigate(2);assert.equal(f.surfaces[0].style.transform,pose);s.destroy();
});
test('spiral is a bounded continuously moving vertical path distinct from belt',()=>{
 const f=collectionFixture(),s=createScene(f.element);s.setPath('belt',{diameter:900,axis:20});const belt=f.surfaces.map(xyz);
 s.setPath('spiral');const spiral=f.surfaces.map(xyz);assert.notDeepEqual(spiral,belt);
 assert.ok(Math.max(...spiral.map(p=>Math.abs(p[1])))>100);
 let previous=spiral;for(let i=0;i<250;i++){advance(32);const next=f.surfaces.map(xyz);for(let j=0;j<next.length;j++){assert.ok(Math.hypot(...next[j].map((v,k)=>v-previous[j][k]))<20);assert.ok(next[j].every(v=>Math.abs(v)<600));}previous=next;}
 assert.equal(s.state.path,'spiral');s.destroy();
});
test('spiral selection and dragging stay attached to the configured orbit',()=>{
 const f=collectionFixture(),s=createScene(f.element);s.setPath('spiral');s.focus('b');advance(800);assert.equal(s.state.configuredPath,'spiral');assert.equal(s.state.path,'none');
 f.surfaces[1].handle.emit('pointerdown',{clientX:500,clientY:300});document.emit('pointermove',{clientX:700,clientY:450});document.emit('pointerup');assert.equal(s.state.path,'spiral');assert.equal(s.stats.settling,false);s.destroy();
});
test('spiral responds to cursor steering and returns to no work at the centre',()=>{
 const f=collectionFixture();for(const panel of f.surfaces)panel.getBoundingClientRect=()=>({left:400,right:660,top:200,bottom:450});
 const s=createScene(f.element);s.setPath('spiral',{interaction:'steer',tilt:8});
 f.element.emit('pointermove',{clientX:100,clientY:100,pointerType:'mouse'});advance(2500);assert.ok(s.state.angularVelocity<0);assert.doesNotMatch(f.surfaces[0].style.transform,/rotateX\(0deg\)/);
 f.element.emit('pointermove',{clientX:560,clientY:325,pointerType:'mouse'});advance(3000);assert.equal(s.stats.animationFramePending,false);s.destroy();
});
console.log(`${checks} total scene checks passed`);
