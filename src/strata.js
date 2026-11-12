import { packPanels } from "./packing.js";
import { captureDOMState } from "./dom-state.js";
const mountedScenes = new WeakMap();
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
/** Mount a DOM-first scene. Its surfaces remain the original, interactive DOM nodes. */
function createScene(element, {
  onChange = () => {},
  workspace = element?.dataset?.workspace === "true" || element?.dataset?.case === "creative",
  compactWidth = 650,
  referenceWidth = 1120,
  observeVisibility = true,
  assembly = {},
} = {}) {
  if (!element?.querySelectorAll) throw new TypeError("Strata requires a scene element");
  if (mountedScenes.has(element)) throw new Error("This scene already has a controller; destroy it before remounting");
  if (typeof onChange !== "function") throw new TypeError("onChange must be a function");
  compactWidth = clamp(finite(compactWidth, 650), 320, 1600);
  referenceWidth = clamp(finite(referenceWidth, 1120), 320, 4e3);
  const ownerDocument = element.ownerDocument || document;
  const surfaces = [...element.querySelectorAll("[data-surface]")];
  if (!surfaces.length) throw new Error("Strata needs at least one [data-surface]");
  const ids = surfaces.map((surface) => surface.dataset.surface);
  if (ids.some((id) => !id?.trim()) || new Set(ids).size !== ids.length) throw new Error("Each surface needs a non-empty unique data-surface identifier");
  const restoreDOM = [captureDOMState(element, { styles: ["--camera-y", "--scene-scale", "--assembly-width", "--assembly-height"], data: ["mode", "compact", "motion", "ready", "assembled", "paused", "workspace", "layout"] })];
  for (const surface of surfaces) {
    restoreDOM.push(captureDOMState(surface, { styles: ["width", "height", "transform", "filter", "z-index", "--readability-scale", "--assembled-width", "--assembled-height"], data: ["active", "loop", "dragging", "settling", "density", "edgeScale", "sized", "resizing"] }));
    const visual = surface.querySelector("[data-visual]");
    if (visual) restoreDOM.push(captureDOMState(visual, { styles: ["filter"] }));
    const button = surface.querySelector("[data-focus]");
    if (button) restoreDOM.push(captureDOMState(button, { attributes: ["aria-pressed"] }));
  }
  const rows = Math.max(2, Math.ceil((surfaces.length - 1) / 2));
  const assemblyWidth = clamp(finite(assembly?.width, 1100), 320, 4e3), assemblyHeight = clamp(finite(assembly?.height, Math.max(620, rows * 290 + 40)), 240, 4e3);
  const assemblySlots = new Map(surfaces.map((surface, index) => {
    const supplied = assembly?.slots?.[surface.dataset.surface];
    const fallback = index === 0 ? { x: 0, y: 0, width: 430, height: Math.max(560, rows * 290 - 20) } : { x: index % 2 ? -380 : 380, y: (Math.floor((index - 1) / 2) - (rows - 1) / 2) * 290, width: 260, height: 270 };
    return [surface.dataset.surface, { x: finite(supplied?.x, fallback.x), y: finite(supplied?.y, fallback.y), width: clamp(finite(supplied?.width, fallback.width), 120, 2e3), height: clamp(finite(supplied?.height, fallback.height), 100, 3e3) }];
  }));
  // Enable spatial CSS before reading authored sizes; destroy restores the marker.
  element.dataset.ready = "true";
  const authoredDimensions = new Map(surfaces.map((surface) => [surface.dataset.surface, { w: surface.offsetWidth || 260, h: surface.offsetHeight || 250 }]));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let active = surfaces[0].dataset.surface, mode = "focus", depth = 1, rotation = 0, field = 1.1, drag = null, release = null, raf = 0, pointerInput = false, disposed = false;
  let path = "none", diameter = 640, axis = 20, speed = 1, phase = 0, motionFrame = 0, lastTime = 0, hovered = false, visible = !element.hidden, paused = false;
  let feedback = null, feedbackFrame = 0;
  let resizing = null;
  const sizes = new Map(), reflow = new Map(), originalSizes = new Map(surfaces.map((s) => [s, { width: s.style.width || "", height: s.style.height || "" }]));
  let assembled = false;
  let pileDragMode = "cycle";
  const detached = new Set();
  let cursorMode = "pause", cursorTilt = 0, cursorInside = false, cursorX = 0, cursorY = 0, leanX = 0, leanY = 0;
  let railPosition = 0;
  let layout = "grid", pileOrder = surfaces.map((s) => s.dataset.surface);
  let layoutUntil = 0;
  const layoutAnimations = new Map();
  let orbitTween = null, angularVelocity = 0, coasting = false, proximityFrame = 0, latestPointer = null;
  let sceneWidth = element.clientWidth, sceneHeight = element.clientHeight || 650;
  const frozen = new Map(), focusButtons = new Map(surfaces.map((s) => [s, s.querySelector("[data-focus]")]));
  const surfaceIndices = new Map(surfaces.map((surface, index) => [surface, index])), visuals = new Map(surfaces.map((surface) => [surface, surface.querySelector("[data-visual]") || surface]));
  const clarity = new Map(), poses = new Map(), stackOrder = new Map(surfaces.map((surface, index) => [surface.dataset.surface, index]));
  let frontOrder = surfaces.length;
  let pending = null, suppressClickUntil = 0, resumePath = "none";
  const responsivePath = () => path === "belt" || path === "wave" || path === "spiral";
  function targetVelocity() {
    if (hovered && cursorMode === "pause") return 0;
    if (cursorInside && responsivePath() && cursorMode === "steer") {
      const amount = Math.max(0, (Math.abs(cursorX) - 0.14) / 0.86);
      return Math.sign(cursorX) * amount * 0.15 * speed * 3;
    }
    return 0.15 * speed;
  }
  const leanTarget = () => cursorInside && responsivePath() && cursorTilt > 0;
  function motionNeeded() {
    return !!orbitTween || coasting || Math.abs(targetVelocity()) > 0.0001 || Math.abs(angularVelocity) > 0.0001 ||
      Math.abs(leanX - (leanTarget() ? cursorX : 0)) + Math.abs(leanY - (leanTarget() ? cursorY : 0)) > 0.001;
  }
  function animate(now) {
    motionFrame = 0;
    if (disposed || path === "none" || !canAnimate()) return;
    if (now < layoutUntil) {
      lastTime = now;
      motionFrame = requestAnimationFrame(animate);
      return;
    }
    const dt = Math.min(40, now - (lastTime || now)) / 1000;
    const response = 1 - Math.exp(-8 * dt);
    leanX += ((leanTarget() ? cursorX : 0) - leanX) * response;
    leanY += ((leanTarget() ? cursorY : 0) - leanY) * response;
    if (orbitTween) {
      const t = clamp((now - orbitTween.start) / 650, 0, 1), ease = 1 - Math.pow(1 - t, 3);
      phase = orbitTween.from + (orbitTween.to - orbitTween.from) * ease;
      render();
      if (t === 1) {
        const id = orbitTween.id;
        orbitTween = null;
        focus(id, true);
        return;
      }
    } else if (!drag && !release) {
      const base = coasting ? 0.15 * speed : targetVelocity();
      const damping = coasting ? 2.4 : 6;
      const decay = Math.exp(-damping * dt);
      phase += base * dt + (angularVelocity - base) * (1 - decay) / damping;
      angularVelocity = base + (angularVelocity - base) * decay;
      if (coasting && Math.abs(angularVelocity - base) < 0.005) coasting = false;
      if (base === 0 && Math.abs(angularVelocity) < 0.0001) angularVelocity = 0;
      render();
    }
    lastTime = now;
    if (!drag && !resizing && motionNeeded()) motionFrame = requestAnimationFrame(animate);
  }
  function captureLayout() {
    if (!canAnimate() || typeof getComputedStyle === "undefined") return null;
    const before = new Map(surfaces.map((s) => [s, getComputedStyle(s).transform]));
    for (const animation of layoutAnimations.values()) animation.cancel();
    layoutAnimations.clear();
    return before;
  }
  function morphLayout(before) {
    if (!before) return;
    layoutUntil = performance.now() + 750;
    for (const surface of surfaces) {
      if (!surface.animate) continue;
      const animation = surface.animate([{ transform: before.get(surface) }, { transform: surface.style.transform }], { duration: 750, easing: "cubic-bezier(.22,1,.36,1)" });
      layoutAnimations.set(surface, animation);
      animation.onfinish = () => {
        if (layoutAnimations.get(surface) === animation) layoutAnimations.delete(surface);
      };
    }
    schedule();
  }
  function schedule() {
    cancelAnimationFrame(motionFrame);
    motionFrame = 0;
    lastTime = 0;
    if (path !== "none" && canAnimate() && !drag && !resizing && motionNeeded()) motionFrame = requestAnimationFrame(animate);
  }
  const offsets = new Map(), cleanups = [];
  const listen = (node, type, fn) => {
    if (!node) return;
    node.addEventListener(type, fn);
    cleanups.push(() => node.removeEventListener(type, fn));
  };
  const state = () => ({ paused, visible, disposed, active, mode, depth, rotation, depthOfField: field, assembled, layout, railIndex: surfaces.findIndex(surface => surface.dataset.surface === active), railPosition, path, configuredPath: configuredPath(), angularVelocity, diameter, axis, speed, pileDragMode, cursorMode, cursorTilt, reducedMotion: reduced.matches, dragging: !!drag, settling: !!release, resizing: !!resizing });
  const notify = () => {
    if (!disposed) onChange(state());
  };
  const scale = () => Math.min(1, sceneWidth / referenceWidth);
  const canAnimate = () => !disposed && !paused && !reduced.matches && sceneWidth >= compactWidth && !ownerDocument.hidden && visible;
  const configuredPath = () => path === "none" ? resumePath : path;
  function home(surface) {
    return workspace && surface === surfaces[0] && mode === "focus" && active !== surfaces[0].dataset.surface ? surfaces.find((s) => s.dataset.surface === active) : surface;
  }
  function position(surface) {
    const h = home(surface), p = offsets.get(surface.dataset.surface) || { x: 0, y: 0 };
    const isFocused = mode === "focus" && surface.dataset.surface === active;
    return { x: isFocused ? 0 : finite(h.dataset.x) * scale() + p.x, y: isFocused ? 0 : finite(h.dataset.y) * scale() + p.y };
  }
  function clearPending() {
    const held = pending;
    pending = null;
    if (held?.surface) {
      try {
        held.surface.releasePointerCapture(held.pointerId);
      } catch {
      }
    }
  }
  // Every interruption funnels through one cleanup path, including pointer capture.
  function stopMotion() {
    cancelAnimationFrame(motionFrame);
    motionFrame = 0;
    lastTime = 0;
    cancelAnimationFrame(proximityFrame);
    proximityFrame = 0;
    latestPointer = null;
    for (const animation of layoutAnimations.values()) animation.cancel();
    layoutAnimations.clear();
    layoutUntil = 0;
    endResize(false, false);
    cancelAnimationFrame(feedbackFrame);
    feedbackFrame = 0;
    feedback = null;
    clearPending();
    orbitTween = null;
    coasting = false;
    angularVelocity = 0;
    leanX = leanY = 0;
    cursorInside = false;
    cancelAnimationFrame(raf);
    raf = 0;
    if (release?.railMode || drag?.railMode) {
      railPosition = release?.railMode ? release.target : clamp(Math.round(railPosition), 0, surfaces.length - 1);
      active = surfaces[Math.round(railPosition)].dataset.surface;
    }
    release = null;
    pointerInput = false;
    const held = drag;
    drag = null;
    if (held) {
      try {
        held.handle.releasePointerCapture(held.pointerId);
      } catch {
      }
    }
    for (const surface of surfaces) {
      delete surface.dataset.dragging;
      delete surface.dataset.settling;
    }
  }
  function render() {
    if (disposed) return;
    const compact = sceneWidth < compactWidth;
    const canvas = surfaces[0], canvasDim = sizes.get(canvas.dataset.surface) || { w: 430, h: 425 };
    const sideRoom = (sceneWidth - canvasDim.w * scale() * 1.06 * 1.07) / 2 - 45;
    const density = sideRoom < 90 ? "minimal" : sideRoom < 150 ? "compact" : "full";
    let packed = null;
    const details = new Map();
    if (workspace && !assembled && !compact && path === "none" && layout !== "rail" && layout !== "fan") {
      const anchor = resizing?.id || drag?.id || active;
      for (const surface of surfaces) {
        const id = surface.dataset.surface;
        details.set(id, active === canvas.dataset.surface && mode === "focus" && id !== active ? density : "full");
      }
      const rectangles = () => surfaces.map((surface, index) => {
        const id = surface.dataset.surface, selected = id === active, isFocused = mode === "focus" && selected, detail = details.get(id);
        const dim = sizes.get(id) || authoredDimensions.get(id), mag = isFocused ? index === 0 ? 1.06 : 1.45 : 1;
        let pos = reflow.get(id) || position(surface), z = isFocused ? 90 : -95 * depth;
        if (drag?.id === id) pos = position(surface);
        if (detail === "minimal") pos = { x: (index - surfaces.length / 2) * 175 * scale(), y: sceneHeight / 2 - 65 };
        const projection = 1600 / (1600 - z);
        return { id, minShrink: detail === "minimal" ? 0.88 : 0.52, x: pos.x, y: pos.y, w: (detail === "minimal" ? 160 : detail === "compact" ? 220 : dim.w) * scale() * mag * projection, h: (detail === "minimal" ? 120 : detail === "compact" ? 155 : dim.h) * scale() * mag * projection, pinned: id === anchor };
      });
      // Prefer less content before geometric shrink compromises legibility.
      for (let pass = 0; pass < 3; pass++) {
        packed = packPanels(rectangles(), sceneWidth, sceneHeight);
        let changed = false;
        for (const [id, node] of packed) {
          if (node.pinned || id === canvas.dataset.surface || node.shrink >= 0.98) continue;
          const current = details.get(id);
          if (current !== "minimal") {
            details.set(id, current === "full" ? "compact" : "minimal");
            changed = true;
          }
        }
        if (!changed) break;
      }
    }
    element.dataset.layout = layout;
    element.dataset.workspace = String(workspace);
    element.dataset.paused = String(paused);
    element.dataset.assembled = String(assembled);
    element.dataset.mode = mode;
    element.dataset.compact = String(compact);
    element.dataset.motion = reduced.matches ? "reduced" : "full";
    const assemblyScale = Math.max(0.1, Math.min(scale() * 0.85, (sceneWidth - 40) / assemblyWidth, (sceneHeight - 40) / assemblyHeight));
    element.style.setProperty("--scene-scale", String(assemblyScale));
    element.style.setProperty("--assembly-width", assemblyWidth + "px");
    element.style.setProperty("--assembly-height", assemblyHeight + "px");
    element.style.setProperty("--camera-y", `${compact || reduced.matches ? 0 : rotation}deg`);
    for (const surface of surfaces) {
      const id = surface.dataset.surface, selected = id === active;
      surface.dataset.density = details.get(id) || "full";
      const isFocused = mode === "focus" && selected;
      const moving = drag?.id === id && !drag.pathMode && !drag.railMode ? drag : release?.id === id && !release.railMode ? release : null;
      const h = home(surface), x = finite(h.dataset.x), y = finite(h.dataset.y), p = position(surface);
      const lift = moving?.lift || 0;
      const restingZ = (stackOrder.get(id) || 0) * 0.01;
      let z = moving ? lift + restingZ : isFocused ? resumePath !== "none" ? diameter / 2 + 120 : 90 : mode === "focus" ? -95 * depth + restingZ : restingZ;
      const response = feedback?.id === id ? feedback : null;
      let tiltZ = 0;
      let tiltX = moving?.tiltX || response?.x || 0, tiltY = moving?.tiltY || response?.y || 0;
      const loop = path !== "none" && !compact && !reduced.matches && !moving;
      if (loop) {
        const index = surfaceIndices.get(surface), a = phase + index * Math.PI * 2 / surfaces.length, r = diameter * scale() / 2, angle = (axis + leanY * cursorTilt * 1.5) * Math.PI / 180;
        tiltX += -leanY * cursorTilt;
        tiltY += leanX * cursorTilt;
        if (path === "belt") {
          p.x = Math.sin(a) * r;
          p.y = Math.cos(a) * r * Math.sin(angle) * 0.55;
          z = Math.cos(a) * r * Math.cos(angle);
        } else if (path === "spiral") {
          // A closed tilted vertical orbit; all coordinates are periodic in phase.
          const vertical = Math.sin(a) * Math.min(r * 0.62, sceneHeight * 0.28);
          p.x = Math.sin(a) * r * 0.68 + Math.sin(a * 2) * r * 0.12;
          p.y = vertical * Math.cos(angle) + Math.cos(a) * r * Math.sin(angle) * 0.25;
          z = Math.cos(a) * r * 0.72 - vertical * Math.sin(angle);
        } else if (path === "float") {
          p.y += Math.sin(phase * 2 + index) * 22;
          z += Math.cos(phase + index) * 35;
        } else {
          p.x = Math.sin(a) * r;
          p.y = Math.sin(a * 2) * r * 0.24;
          z = Math.cos(a) * 110;
        }
      }
      if ((layout === "pile" || layout === "fan") && path === "none" && resumePath === "none" && !moving && !isFocused && !detached.has(id)) {
        const index = pileOrder.filter(key => !detached.has(key)).indexOf(id);
        if (layout === "fan") {
          const count = pileOrder.filter(key => !detached.has(key)).length;
          const spread = (index - (count - 1) / 2) / Math.max(1, count - 1);
          p.x = spread * Math.min(760 * scale(), sceneWidth * 0.68);
          p.y = (Math.abs(spread) * 100 - 25) * scale();
          z = -index * 16 - Math.abs(spread) * 70;
          tiltZ = spread * 28;
        } else {
          p.x = index * 8 * scale();
          p.y = -index * 7 * scale();
          z = -index * 14;
        }
      }
      const onRail = layout === "rail" && path === "none" && resumePath === "none";
      const railMagnification = onRail ? 1 + 0.3 * Math.exp(-Math.pow(surfaceIndices.get(surface) - railPosition, 2) * 2) : 1;
      if (onRail) {
        const distance = surfaceIndices.get(surface) - railPosition;
        p.x = distance * railSpacing();
        p.y = Math.min(3, Math.abs(distance)) * 18 * scale();
        z = 90 - Math.min(4, Math.abs(distance)) * 130 * depth;
        tiltY = clamp(-distance * 8, -22, 22);
      }
      if (resumePath !== "none" && !selected && frozen.has(id)) {
        const saved = frozen.get(id);
        p.x = saved.x;
        p.y = saved.y;
        z = saved.z;
      }
      if (!compact && reflow.has(id) && !moving) {
        const fitted = reflow.get(id);
        p.x = fitted.x;
        p.y = fitted.y;
        z = fitted.z;
      }
      if (surface.dataset.density === "minimal" && !assembled) {
        p.x = (surfaceIndices.get(surface) - surfaces.length / 2) * 175 * scale();
        p.y = sceneHeight / 2 - 65;
        z = 20;
      }
      const slot = assemblySlots.get(id);
      surface.style.setProperty("--assembled-width", slot.width + "px");
      surface.style.setProperty("--assembled-height", slot.height + "px");
      if (assembled && workspace) {
        p.x = slot.x * assemblyScale;
        p.y = slot.y * assemblyScale;
        z = 0;
        tiltZ = 0;
      }
      const fitting = packed?.get(id);
      if (fitting) {
        p.x = fitting.x;
        p.y = fitting.y;
        if (!fitting.pinned) z -= 180 * (1 - fitting.shrink);
      }
      surface.dataset.edgeScale = String(fitting?.shrink || 1);
      surface.style.setProperty("--readability-scale", String(Math.max(0.2, scale() * (fitting?.shrink || 1) * 1600 / (1600 - z))));
      poses.set(id, { ...p, z });
      const blur = (1 - (clarity.get(id) || 0)) * (assembled || compact || reduced.matches || selected || moving || surface.dataset.density !== "full" ? 0 : field * (mode === "focus" ? depth : drag?.id?.length ? 0.55 : loop ? Math.max(0, (diameter / 2 - z) / diameter) : 0));
      surface.style.transform = compact ? "none" : `translate(-50%,-50%) translate3d(${p.x}px,${p.y}px,${reduced.matches ? 0 : z}px) rotateX(${reduced.matches ? 0 : tiltX}deg) rotateY(${reduced.matches ? 0 : tiltY}deg)${tiltZ && !reduced.matches ? ` rotateZ(${tiltZ}deg)` : ""} scale(${scale() * (fitting?.shrink || 1) * (isFocused && resumePath !== "none" ? (1600 - z) / 1510 : 1) * (assembled ? assemblyScale / scale() : onRail ? railMagnification : moving ? moving.magnification : isFocused ? workspace && surface === surfaces[0] ? 1.06 : 1.45 : 1)})`;
      visuals.get(surface).style.filter = `blur(${blur.toFixed(2)}px)`;
      surface.dataset.loop = String(loop || layout === "rail" && (!!drag?.railMode || !!release?.railMode));
      surface.dataset.active = String(selected);
      surface.style.zIndex = isFocused ? "1000" : moving ? "1001" : String(500 + Math.round(z));
      focusButtons.get(surface)?.setAttribute("aria-pressed", String(isFocused && !assembled));
    }
  }
  function settleFeedback() {
    if (!canAnimate()) {
      feedback = null;
      render();
      return;
    }
    cancelAnimationFrame(feedbackFrame);
    feedbackFrame = 0;
    if (!feedback) return;
    let last = performance.now();
    function tick(now) {
      feedbackFrame = 0;
      if (!canAnimate() || !feedback) return;
      const decay = Math.exp(-12 * Math.min(0.04, (now - last) / 1e3));
      last = now;
      feedback.x *= decay;
      feedback.y *= decay;
      if (Math.abs(feedback.x) + Math.abs(feedback.y) < 0.025) {
        feedback = null;
        render();
        return;
      }
      render();
      feedbackFrame = requestAnimationFrame(tick);
    }
    feedbackFrame = requestAnimationFrame(tick);
  }
  function pressFeedback(surface, event) {
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY) || !canAnimate()) return;
    const r = surface.getBoundingClientRect();
    cancelAnimationFrame(feedbackFrame);
    feedback = { id: surface.dataset.surface, x: clamp((event.clientY - r.top - r.height / 2) / r.height * 4, -2, 2), y: clamp(-(event.clientX - r.left - r.width / 2) / r.width * 4, -2, 2) };
    render();
    settleFeedback();
  }
  function resizeSurface(id, width, height, center = null) {
    if (disposed || assembled || sceneWidth < compactWidth || !workspace) return;
    const surface = surfaces.find((s2) => s2.dataset.surface === id);
    if (!surface) return;
    const rect = element.getBoundingClientRect(), s = scale(), mag = mode === "focus" && active === id ? surface === surfaces[0] ? 1.06 : 1.45 : 1;
    const w = clamp(finite(width, 260), 220, Math.max(220, Math.min(760, (rect.width - 70) / (s * mag * 1.07)))), h = clamp(finite(height, 260), 180, Math.max(180, Math.min(580, (rect.height - 150) / (s * mag * 1.07))));
    sizes.set(id, { w, h });
    surface.style.width = w + "px";
    surface.style.height = h + "px";
    surface.dataset.sized = "true";
    const anchor = center || poses.get(id) || { x: 0, y: 0, z: 90 }, aw = w * s * mag * 1.07, ah = h * s * mag * 1.07;
    const ax = clamp(anchor.x, -Math.max(0, (rect.width - aw) / 2 - 20), Math.max(0, (rect.width - aw) / 2 - 20)), ay = clamp(anchor.y, -Math.max(0, (rect.height - ah) / 2 - 20), Math.max(0, (rect.height - ah) / 2 - 20));
    reflow.clear();
    reflow.set(id, { x: ax, y: ay, z: mode === "focus" ? 90 : 35 });
    for (const other of surfaces) {
      if (other === surface) continue;
      const key = other.dataset.surface, dim = sizes.get(key) || { w: other.offsetWidth || 260, h: other.offsetHeight || 250 }, base = position(other);
      let x = base.x, y = base.y;
      const bw = dim.w * s, bh = dim.h * s, gap = 24;
      if (Math.abs(x - ax) < (aw + bw) / 2 + gap && Math.abs(y - ay) < (ah + bh) / 2 + gap) {
        const dx = x - ax, dy = y - ay;
        if (Math.abs(dx) > Math.abs(dy)) {
          x = ax + (dx < 0 ? -1 : 1) * ((aw + bw) / 2 + gap);
        } else {
          y = ay + (dy < 0 ? -1 : 1) * ((ah + bh) / 2 + gap);
        }
      }
      x = clamp(x, -Math.max(0, (rect.width - bw) / 2 - 20), Math.max(0, (rect.width - bw) / 2 - 20));
      y = clamp(y, -Math.max(0, (rect.height - bh) / 2 - 20), Math.max(0, (rect.height - bh) / 2 - 20));
      const overlap = Math.max(0, Math.min((aw + bw) / 2 - Math.abs(x - ax), (ah + bh) / 2 - Math.abs(y - ay)));
      reflow.set(key, { x, y, z: -95 * depth - Math.min(240, overlap * 1.2) });
    }
    render();
    notify();
  }
  function endResize(animate2 = true, emit = true) {
    if (!resizing) return;
    const held = resizing;
    resizing = null;
    delete held.surface.dataset.resizing;
    try {
      held.handle.releasePointerCapture(held.pointerId);
    } catch {
    }
    suppressClickUntil = performance.now() + 350;
    if (animate2) settleFeedback();
    else {
      cancelAnimationFrame(feedbackFrame);
      feedbackFrame = 0;
      feedback = null;
    }
    if (emit) {
      render();
      notify();
    }
  }
  function focus(id, arrived = false) {
    if (disposed || !surfaces.some((s) => s.dataset.surface === id)) return;
    if (layout === "rail" && configuredPath() === "none") {
      selectRail(surfaces.findIndex(surface => surface.dataset.surface === id), true);
      return;
    }
    assembled = false;
    reflow.clear();
    if (path !== "none" && !arrived && canAnimate()) {
      const index = surfaces.findIndex((s) => s.dataset.surface === id), target = -index * Math.PI * 2 / surfaces.length;
      orbitTween = { id, from: phase, to: phase + Math.atan2(Math.sin(target - phase), Math.cos(target - phase)), start: performance.now() };
      schedule();
      return;
    }
    if (path !== "none") {
      resumePath = path;
      frozen.clear();
      for (const [key, value] of poses) frozen.set(key, { ...value });
    }
    stopMotion();
    path = "none";
    schedule();
    active = id;
    mode = "focus";
    render();
    notify();
  }
  function setMode(next) {
    if (disposed) return;
    assembled = false;
    reflow.clear();
    stopMotion();
    mode = next === "overview" ? "overview" : "focus";
    if (mode === "overview" && resumePath !== "none") {
      path = resumePath;
      resumePath = "none";
    } else if (mode === "focus" && path !== "none") {
      frozen.clear();
      for (const [key, value] of poses) frozen.set(key, { ...value });
      resumePath = path;
      path = "none";
    }
    render();
    schedule();
    notify();
  }
  // Invert camera projection at the lifted plane; decorative tilt never changes drag distance.
  function pointerOnPlane(clientX, clientY, z) {
    const rect = element.getBoundingClientRect(), sx = clientX - rect.left - rect.width / 2, sy = clientY - rect.top - rect.height / 2;
    const angle = (reduced.matches ? 0 : rotation) * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle), perspective = 1600;
    const x = (sx * (perspective - z * c) - perspective * z * s) / (perspective * c - sx * s);
    return { x, y: sy * (perspective - z * c + x * s) / perspective };
  }
  function limitOffset(id, x, y) {
    const surface = surfaces.find((s2) => s2.dataset.surface === id), s = scale(), rect = element.getBoundingClientRect();
    const boundX = Math.max(0, rect.width / 2 - (surface.offsetWidth || 260) * s / 2 - 24), boundY = Math.max(0, rect.height / 2 - (surface.offsetHeight || 250) * s / 2 - 24);
    const baseX = finite(surface.dataset.x) * s, baseY = finite(surface.dataset.y) * s;
    return { x: clamp(x, -boundX - baseX, boundX - baseX), y: clamp(y, -boundY - baseY, boundY - baseY) };
  }
  function setOffset(id, x, y) {
    offsets.set(id, limitOffset(id, x, y));
  }
  const railSpacing = () => Math.max(180, 320 * scale());
  function selectRail(index, focused = true, velocity = 0) {
    if (disposed || layout !== "rail" || configuredPath() !== "none") return;
    const from = railPosition;
    stopMotion();
    railPosition = from;
    const target = clamp(Math.round(finite(index)), 0, surfaces.length - 1);
    active = surfaces[target].dataset.surface;
    mode = focused ? "focus" : "overview";
    if (canAnimate() && Math.abs(target - railPosition) > 0.001) {
      release = {railMode:true, x:railPosition, vx:clamp(velocity,-6,6), target, started:performance.now(), last:performance.now()};
      raf = requestAnimationFrame(settle);
    } else railPosition = target;
    render();
    notify();
  }
  function navigate(step) {
    if (disposed || layout !== "rail" || configuredPath() !== "none") return;
    const index = surfaces.findIndex(surface => surface.dataset.surface === active);
    selectRail(index + Math.trunc(finite(step)), true);
  }
  function cyclePile(id, cancelled = false, gesture = null) {
    const before = captureLayout();
    offsets.delete(id);
    detached.delete(id);
    if (!cancelled) {
      pileOrder = pileOrder.filter(key => key !== id);
      pileOrder.push(id);
    }
    active = pileOrder.find(key => !detached.has(key)) || pileOrder[0];
    mode = "overview";
    render();
    morphLayout(before);
    // Move around the edge before descending: the card never cuts through the stack.
    const surface = surfaces.find(item => item.dataset.surface === id);
    if (before && !cancelled && surface?.animate) {
      layoutAnimations.get(surface)?.cancel();
      const direction = Math.sign(gesture?.vx || gesture?.x || 1);
      const reach = Math.min(sceneWidth / 2 - 30, (surface.offsetWidth || 260) * scale() * 1.15);
      const pose = `translate(-50%,-50%) translate3d(${direction * reach}px,-30px,`;
      const animation = surface.animate([
        {transform:before.get(surface),offset:0},
        {transform:pose + `90px) rotateZ(${direction * 7}deg) scale(${scale()})`,offset:0.35},
        {transform:pose + `${-surfaces.length * 14}px) rotateZ(${direction * 3}deg) scale(${scale()})`,offset:0.65},
        {transform:surface.style.transform,offset:1}
      ],{duration:650,easing:"cubic-bezier(.22,1,.36,1)"});
      layoutAnimations.set(surface,animation);
      animation.onfinish=()=>{if(layoutAnimations.get(surface)===animation)layoutAnimations.delete(surface);};
    }
    notify();
  }
  function finishDrag(cancelled = false) {
    if (!drag) return;
    const d = drag;
    if (d.railMode) {
      const velocity = cancelled || performance.now() - d.time > 120 ? 0 : d.velocity;
      const target = cancelled ? d.selected : Math.round(railPosition + clamp(velocity * 0.18, -1.25, 1.25));
      drag = null;
      delete d.surface.dataset.dragging;
      suppressClickUntil = performance.now() + 350;
      try {d.handle.releasePointerCapture(d.pointerId);} catch {}
      selectRail(target, true, velocity);
      return;
    }
    if (d.pathMode) {
      angularVelocity = cancelled || performance.now() - d.time > 120 ? 0 : d.velocity;
      coasting = !cancelled && canAnimate();
      drag = null;
      suppressClickUntil = performance.now() + 350;
      try {
        d.handle.releasePointerCapture(d.pointerId);
      } catch {
      }
      render();
      schedule();
      notify();
      return;
    }
    if ((layout === "pile" || layout === "fan") && !workspace && pileDragMode === "cycle") {
      drag = null;
      suppressClickUntil = performance.now() + 350;
      delete d.surface.dataset.dragging;
      try { d.handle.releasePointerCapture(d.pointerId); } catch {}
      cyclePile(d.id, cancelled || (d.travel || 0) < 12, d);
      return;
    }
    stackOrder.set(d.id, ++frontOrder);
    drag = null;
    suppressClickUntil = performance.now() + 350;
    delete d.surface.dataset.dragging;
    if (performance.now() - d.time > 100) {
      d.vx = 0;
      d.vy = 0;
    }
    try {
      d.handle.releasePointerCapture(d.pointerId);
    } catch {
    }
    if (cancelled || !canAnimate()) {
      render();
      notify();
      return;
    }
    const p = offsets.get(d.id) || { x: 0, y: 0 }, destination = limitOffset(d.id, p.x, p.y);
    release = { id: d.id, surface: d.surface, x: p.x, y: p.y, vx: d.vx, vy: d.vy, targetX: destination.x, targetY: destination.y, magnification: d.magnification, lift: d.lift, tiltX: d.tiltX, tiltY: d.tiltY, started: performance.now(), last: performance.now() };
    d.surface.dataset.settling = "true";
    raf = requestAnimationFrame(settle);
    notify();
  }
  function settle(now) {
    raf = 0;
    if (!canAnimate() || !release) return;
    if (release.railMode) {
      const r = release, dt = clamp((now - r.last) / 1000, 1 / 240, 1 / 30);
      r.last = now;
      r.vx += (150 * (r.target - r.x) - 25 * r.vx) * dt;
      r.x = clamp(r.x + r.vx * dt, 0, surfaces.length - 1);
      railPosition = r.x;
      if (now - r.started > 1200 || Math.abs(r.target-r.x) < 0.002 && Math.abs(r.vx) < 0.015) {
        railPosition = r.target;
        release = null;
        render();notify();return;
      }
      render();raf = requestAnimationFrame(settle);return;
    }
    const r = release, dt = clamp((now - r.last) / 1e3, 1 / 240, 1 / 30);
    r.last = now;
    // Damped spring retains the release gesture without throwing a panel off canvas.
    r.vx += (170 * (r.targetX - r.x) - 26 * r.vx) * dt;
    r.vy += (170 * (r.targetY - r.y) - 26 * r.vy) * dt;
    const bounded = limitOffset(r.id, r.x + r.vx * dt, r.y + r.vy * dt);
    r.x = bounded.x;
    r.y = bounded.y;
    const decay = Math.exp(-13 * dt);
    r.magnification = 1 + (r.magnification - 1) * decay;
    r.lift *= decay;
    r.tiltX *= decay;
    r.tiltY *= decay;
    setOffset(r.id, r.x, r.y);
    if (now - r.started > 1100 || Math.hypot(r.targetX - r.x, r.targetY - r.y) < 0.15 && Math.hypot(r.vx, r.vy) < 1 && r.lift < 0.2) {
      setOffset(r.id, r.targetX, r.targetY);
      delete r.surface.dataset.settling;
      release = null;
      render();
      notify();
      return;
    }
    render();
    raf = requestAnimationFrame(settle);
  }
  const dragStarters = new Map();
  for (const surface of surfaces) {
    const id = surface.dataset.surface, handle = surface.querySelector("[data-drag]");
    const interactive = (target) => target.closest("input,textarea,select,a,button:not([data-focus]):not([data-drag]),[contenteditable=true]");
    listen(surface, "pointerdown", (event) => {
      pointerInput = true;
      if (!handle || assembled || drag || resizing || pending || event.button !== 0 || sceneWidth < compactWidth || interactive(event.target) || event.target.closest("[data-drag]")) return;
      event.preventDefault();
      pending = { id, surface, x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      surface.setPointerCapture(event.pointerId);
    });
    listen(surface, "click", (event) => {
      if (performance.now() < suppressClickUntil || event.target.closest("[data-drag]") || interactive(event.target)) return;
      if (assembled) {
        assembled = false;
        render();
        notify();
      } else if (active === id && mode === "focus") setMode("overview");
      else focus(id);
      pressFeedback(surface, event);
    });
    listen(surface, "focusin", () => {
      if (!assembled && path === "none" && !pointerInput && !pending && (active !== id || mode === "overview")) focus(id);
    });
    listen(surface, "dragstart", (event) => event.preventDefault());
    for (const corner of surface.querySelectorAll?.("[data-resize]") || []) {
      listen(corner, "pointerdown", (event) => {
        if (!workspace || assembled || drag || resizing || event.button !== 0 || sceneWidth < compactWidth) return;
        event.preventDefault();
        event.stopPropagation?.();
        stopMotion();
        path = "none";
        schedule();
        if (active !== id) {
          active = id;
          mode = "overview";
        }
        const pose = poses.get(id) || position(surface), mag = mode === "focus" && active === id ? surface === surfaces[0] ? 1.06 : 1.45 : 1;
        resizing = { id, surface, handle: corner, pointerId: event.pointerId, x: event.clientX, y: event.clientY, w: surface.offsetWidth, h: surface.offsetHeight, pose: { ...pose }, mag, factor: scale() * mag * 1600 / (1600 - pose.z), corner: corner.dataset.resize };
        corner.setPointerCapture(event.pointerId);
        surface.dataset.resizing = "true";
        notify();
      });
      listen(corner, "lostpointercapture", (event) => {
        if (resizing?.pointerId === event.pointerId) endResize();
      });
      listen(corner, "keydown", (event) => {
        const keys = { ArrowRight: [20, 0], ArrowLeft: [-20, 0], ArrowDown: [0, 20], ArrowUp: [0, -20] };
        if (!keys[event.key]) return;
        event.preventDefault();
        const [dx, dy] = keys[event.key];
        resizeSurface(id, (surface.offsetWidth || 260) + dx * (corner.dataset.resize.includes("w") ? -1 : 1), (surface.offsetHeight || 250) + dy * (corner.dataset.resize.includes("n") ? -1 : 1));
      });
    }
    if (!handle) continue;
    const beginDrag = (event) => {
      if (event.type === "pointerdown" && event.button !== 0 || sceneWidth < compactWidth || disposed || assembled || resizing || drag) return;
      event.preventDefault();
      if (path === "none" && resumePath !== "none") {
        path = resumePath;
        resumePath = "none";
        mode = "overview";
        render();
        schedule();
      }
      if (path !== "none") {
        if (event.pointerType === "touch") {cursorInside = false; hovered = false;}
        orbitTween = null;
        coasting = false;
        cancelAnimationFrame(motionFrame);
        motionFrame = 0;
        clearPending();
        drag = { id, surface, handle, pointerId: event.pointerId, pathMode: true, startX: event.clientX, phase, lastPhase: phase, time: performance.now(), velocity: 0 };
        handle.setPointerCapture(event.pointerId);
        notify();
        return;
      }
      if (layout === "rail") {
        const from = railPosition;
        const selected = surfaces.findIndex(surface => surface.dataset.surface === active);
        const startX = pending?.x ?? event.clientX;
        stopMotion();railPosition = from;
        mode = "overview";
        drag = {id,surface,handle,pointerId:event.pointerId,railMode:true,startX,position:from,lastPosition:from,selected,time:performance.now(),velocity:0};
        handle.setPointerCapture(event.pointerId);
        surface.dataset.dragging = "true";
        render();notify();return;
      }
      const initialTravel = pending ? Math.hypot(event.clientX - pending.x, event.clientY - pending.y) : 0;
      const start = poses.get(id) || position(surface), magnification = mode === "focus" && active === id ? workspace && surface === surfaces[0] ? 1.06 : 1.45 : 1;
      stopMotion();
      resumePath = "none";
      path = "none";
      schedule();
      active = id;
      mode = "overview";
      if ((layout === "pile" || layout === "fan") && pileDragMode === "free") detached.add(id);
      pointerInput = true;
      handle.focus({ preventScroll: true });
      setOffset(id, start.x - finite(surface.dataset.x) * scale(), start.y - finite(surface.dataset.y) * scale());
      const p = offsets.get(id), lift = reduced.matches ? 0 : 75, point = pointerOnPlane(event.clientX, event.clientY, lift);
      drag = { id, surface, handle, pointerId: event.pointerId, start: point, x: p.x, y: p.y, last: point, travel: initialTravel, time: event.timeStamp || performance.now(), vx: 0, vy: 0, magnification, lift, tiltX: 0, tiltY: 0 };
      handle.setPointerCapture(event.pointerId);
      surface.dataset.dragging = "true";
      render();
      notify();
    };
    dragStarters.set(id, beginDrag);
    listen(handle, "pointerdown", (event) => {
      event.stopPropagation?.();
      beginDrag(event);
    });
    for (const type of ["pointercancel", "lostpointercapture"]) listen(handle, type, (event) => {
      if (drag?.id === id && drag.pointerId === event.pointerId) finishDrag(true);
    });
    listen(handle, "keydown", (event) => {
      const direction = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[event.key];
      if (!direction || assembled || sceneWidth < compactWidth) return;
      event.preventDefault();
      if (path === "none" && resumePath !== "none") {
        path = resumePath;
        resumePath = "none";
        mode = "overview";
        render();
        schedule();
      }
      if (path !== "none") {
        orbitTween = null;
        phase += (direction[0] || direction[1]) * 0.015;
        render();
        schedule();
        notify();
        return;
      }
      if (layout === "rail") {navigate(Math.sign(direction[0] || direction[1]));return;}
      if ((layout === "pile" || layout === "fan") && pileDragMode === "cycle" && !workspace) {
        stopMotion();
        cyclePile(id);
        return;
      }
      stopMotion();
      if ((layout === "pile" || layout === "fan") && pileDragMode === "free") detached.add(id);
      mode = "overview";
      active = id;
      const p = offsets.get(id) || { x: 0, y: 0 };
      setOffset(id, p.x + direction[0], p.y + direction[1]);
      render();
      notify();
    });
  }
  listen(ownerDocument, "pointermove", (event) => {
    if (pending?.pointerId === event.pointerId && Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > 6) dragStarters.get(pending.id)?.(event);
    if (!drag || drag.pointerId !== event.pointerId) return;
    const id = drag.id;
    if (drag.railMode) {
      const now = performance.now(), dt = Math.max(0.008,(now-drag.time)/1000);
      railPosition = clamp(drag.position - (event.clientX-drag.startX)/railSpacing(),0,surfaces.length-1);
      const sample = clamp((railPosition-drag.lastPosition)/dt,-6,6);
      drag.velocity += (sample-drag.velocity)*(1-Math.exp(-dt*25));
      drag.lastPosition=railPosition;drag.time=now;
      const nearest = surfaces[Math.round(railPosition)].dataset.surface;
      const changed = active !== nearest;
      active = nearest;
      render();if(changed)notify();return;
    }
    if (drag.pathMode) {
      if (event.pointerType !== "touch") {
        const rect = element.getBoundingClientRect();
        cursorInside = event.clientX >= rect.left && event.clientX <= rect.left + rect.width && event.clientY >= rect.top && event.clientY <= rect.top + rect.height;
        cursorX = clamp((event.clientX - rect.left - rect.width / 2) / (rect.width / 2), -1, 1);
        cursorY = clamp((event.clientY - rect.top - rect.height / 2) / (rect.height / 2), -1, 1);
      }
      const now2 = performance.now(), dt2 = Math.max(8e-3, (now2 - drag.time) / 1e3);
      phase = drag.phase + (event.clientX - drag.startX) / Math.max(100, diameter * scale() / 2);
      const sample = clamp((phase - drag.lastPhase) / dt2, -6, 6), weight = 1 - Math.exp(-dt2 * 25);
      drag.velocity += (sample - drag.velocity) * weight;
      drag.lastPhase = phase;
      drag.time = now2;
      render();
      return;
    }
    const point = pointerOnPlane(event.clientX, event.clientY, drag.lift), now = event.timeStamp || performance.now(), dt = Math.max(8e-3, (now - drag.time) / 1e3);
    drag.travel = Math.max(drag.travel || 0, Math.hypot(point.x - drag.start.x, point.y - drag.start.y));
    drag.vx = clamp((point.x - drag.last.x) / dt, -1200, 1200) * 0.6 + drag.vx * 0.4;
    drag.vy = clamp((point.y - drag.last.y) / dt, -1200, 1200) * 0.6 + drag.vy * 0.4;
    drag.tiltY = clamp(drag.vx / 120, -7, 7);
    drag.tiltX = clamp(-drag.vy / 120, -7, 7);
    setOffset(id, drag.x + point.x - drag.start.x, drag.y + point.y - drag.start.y);
    drag.last = point;
    drag.time = now;
    render();
  });
  listen(ownerDocument, "pointerup", (event) => {
    if (drag?.pointerId === event.pointerId) finishDrag();
  });
  listen(ownerDocument, "pointermove", (event) => {
    if (!resizing || resizing.pointerId !== event.pointerId) return;
    const r = resizing, dx = (event.clientX - r.x) / r.factor, dy = (event.clientY - r.y) / r.factor;
    if (!reduced.matches) {
      cancelAnimationFrame(feedbackFrame);
      feedback = { id: r.id, x: clamp(dy / 70, -3, 3), y: clamp(-dx / 70, -3, 3) };
    }
    resizeSurface(r.id, r.w + dx * (r.corner.includes("w") ? -1 : 1), r.h + dy * (r.corner.includes("n") ? -1 : 1), { x: r.pose.x + dx * scale() * r.mag / 2, y: r.pose.y + dy * scale() * r.mag / 2 });
  });
  listen(ownerDocument, "pointerup", (event) => {
    if (resizing?.pointerId === event.pointerId) endResize();
  });
  listen(ownerDocument, "pointercancel", (event) => {
    if (resizing?.pointerId === event.pointerId) endResize(false);
  });
  listen(element, "click", (event) => {
    if (performance.now() < suppressClickUntil) return;
    if (!event.target.closest("[data-surface]")) setMode("overview");
  });
  function updateProximity() {
    proximityFrame = 0;
    if (disposed || drag || pending || !latestPointer) return;
    const point = latestPointer;
    for (const surface of surfaces) {
      const r = surface.getBoundingClientRect(), dx = Math.max(r.left - point.x, 0, point.x - r.right), dy = Math.max(r.top - point.y, 0, point.y - r.bottom);
      clarity.set(surface.dataset.surface, 1 - clamp(Math.hypot(dx, dy) / 140, 0, 1));
    }
    render();
  }
  listen(element, "pointermove", (event) => {
    if (!canAnimate() || resizing || drag || pending || event.pointerType === "touch") return;
    hovered = true;
    cursorInside = true;
    const rect = element.getBoundingClientRect();
    cursorX = clamp((event.clientX - rect.left - rect.width / 2) / (rect.width / 2), -1, 1);
    cursorY = clamp((event.clientY - rect.top - rect.height / 2) / (rect.height / 2), -1, 1);
    if (!motionFrame && path !== "none") schedule();
    latestPointer = { x: event.clientX, y: event.clientY };
    if (!proximityFrame) proximityFrame = requestAnimationFrame(updateProximity);
  });
  listen(element, "pointerleave", () => {
    hovered = false;
    cursorInside = false;
    latestPointer = null;
    cancelAnimationFrame(proximityFrame);
    proximityFrame = 0;
    clarity.clear();
    render();
    schedule();
  });
  listen(element, "focusin", () => {
    hovered = true;
    schedule();
  });
  listen(element, "focusout", (event) => {
    if (!element.contains(event.relatedTarget)) {
      hovered = false;
      schedule();
    }
  });
  listen(ownerDocument, "pointerup", (event) => {
    pointerInput = false;
    if (pending?.pointerId === event.pointerId) clearPending();
  });
  listen(ownerDocument, "pointercancel", (event) => {
    pointerInput = false;
    if (pending?.pointerId === event.pointerId) clearPending();
    if (drag?.pointerId === event.pointerId) finishDrag(true);
  });
  listen(element, "lostpointercapture", (event) => {
    if (pending?.pointerId === event.pointerId) clearPending();
  });
  listen(ownerDocument, "visibilitychange", () => {
    if (ownerDocument.hidden) {
      stopMotion();
      render();
      notify();
    }
    schedule();
  });
  listen(element, "keydown", (event) => {
    if (event.key === "Escape") {
      setMode("overview");
      element.focus({ preventScroll: true });
    }
  });
  listen(reduced, "change", () => {
    stopMotion();
    render();
    notify();
    schedule();
  });
  const observer = new ResizeObserver(() => {
    if (disposed) return;
    sceneWidth = element.clientWidth;
    sceneHeight = element.clientHeight || 650;
    stopMotion();
    render();
    schedule();
    notify();
  });
  observer.observe(element);
  let visibilityObserver = null;
  if (observeVisibility && typeof IntersectionObserver !== "undefined") {
    visibilityObserver = new IntersectionObserver((entries) => {
      const entry = entries.find((item) => item.target === element);
      if (!entry || disposed) return;
      const next = entry.isIntersecting && entry.intersectionRatio > 0;
      if (next === visible) return;
      visible = next;
      if (!visible) stopMotion();
      render();
      schedule();
      notify();
    });
    visibilityObserver.observe(element);
  }
  render();
  element.getBoundingClientRect();
  mountedScenes.set(element, true);
  notify();
  return { focus, setMode, resizeSurface, navigate, pause() {
    if (disposed || paused) return;
    paused = true;
    stopMotion();
    render();
    notify();
  }, resume() {
    if (disposed || !paused) return;
    paused = false;
    render();
    schedule();
    notify();
  }, get isPaused() {
    return paused;
  }, setAssembled(value) {
    if (disposed || !workspace) return;
    const before = captureLayout();
    stopMotion();
    assembled = !!value;
    reflow.clear();
    path = "none";
    resumePath = "none";
    mode = "focus";
    active = surfaces[0].dataset.surface;
    render();
    morphLayout(before);
    notify();
  }, setLayout(value) {
    if (disposed) return;
    const before = captureLayout();
    stopMotion();
    assembled = false;
    reflow.clear();
    path = "none";
    resumePath = "none";
    layout = ["pile","fan","rail"].includes(value) ? value : "grid";
    detached.clear();
    offsets.clear();
    if (layout === "pile" || layout === "fan") active = pileOrder[0];
    railPosition = surfaces.findIndex(surface => surface.dataset.surface === active);
    mode = layout === "rail" ? "focus" : "overview";
    render();
    morphLayout(before);
    schedule();
    notify();
  }, sendToBack() {
    if (disposed) return;
    if ((layout !== "pile" && layout !== "fan") || configuredPath() !== "none") return;
    stopMotion();
    const id = mode === "focus" ? active : pileOrder.find(key => !detached.has(key)) || pileOrder[0];
    cyclePile(id);
  }, setPileDragMode(value) {
    if (disposed || workspace) return;
    const before = captureLayout();
    stopMotion();
    pileDragMode = value === "free" ? "free" : "cycle";
    if (pileDragMode === "cycle" && (layout === "pile" || layout === "fan")) {detached.clear(); offsets.clear(); mode = "overview"; active = pileOrder[0];}
    render();
    morphLayout(before);
    schedule();
    notify();
  }, setPath(value, options = {}) {
    if (disposed) return;
    const nextPath = ["belt", "float", "wave", "spiral"].includes(value) ? value : "none";
    const before = configuredPath() !== nextPath ? captureLayout() : null;
    assembled = false;
    reflow.clear();
    resumePath = "none";
    path = ["belt", "float", "wave", "spiral"].includes(value) ? value : "none";
    diameter = clamp(finite(options.diameter, diameter), 200, 900);
    axis = clamp(finite(options.axis, axis), -80, 80);
    speed = clamp(finite(options.speed, speed), 0.2, 3);
    if (["none", "pause", "steer"].includes(options.interaction)) cursorMode = options.interaction;
    cursorTilt = clamp(finite(options.tilt, cursorTilt), 0, 12);
    stopMotion();
    if (path !== "none") mode = "overview";
    render();
    morphLayout(before);
    schedule();
    notify();
  }, setDepth(value) {
    if (disposed) return;
    depth = clamp(finite(value), 0, 1.5);
    render();
    notify();
  }, setDepthOfField(value) {
    if (disposed) return;
    field = clamp(finite(value), 0, 3);
    render();
    notify();
  }, orbit(value) {
    if (disposed) return;
    stopMotion();
    rotation = clamp(finite(value), -12, 12);
    render();
    schedule();
    notify();
  }, reset() {
    if (disposed) return;
    const configured = path === "none" ? resumePath : path;
    assembled = false;
    stopMotion();
    resumePath = "none";
    path = configured;
    schedule();
    offsets.clear();
    detached.clear();
    reflow.clear();
    sizes.clear();
    for (const surface of surfaces) {
      surface.style.width = originalSizes.get(surface).width;
      surface.style.height = originalSizes.get(surface).height;
      delete surface.dataset.sized;
    }
    rotation = 0;
    depth = 1;
    field = 1.1;
    active = surfaces[0].dataset.surface;
    railPosition = 0;
    mode = path === "none" ? "focus" : "overview";
    render();
    notify();
  }, get state() {
    return state();
  }, get stats() {
    return { animationFramePending: !!raf || !!motionFrame || !!feedbackFrame || !!proximityFrame || layoutAnimations.size > 0, pendingFrames: Number(!!raf) + Number(!!motionFrame) + Number(!!feedbackFrame) + Number(!!proximityFrame), layoutAnimations: layoutAnimations.size, dragging: !!drag, settling: !!release, resizing: !!resizing };
  }, destroy() {
    if (disposed) return;
    disposed = true;
    stopMotion();
    observer.disconnect();
    visibilityObserver?.disconnect();
    cleanups.forEach((fn) => fn());
    restoreDOM.reverse().forEach((restore) => restore());
    mountedScenes.delete(element);
  } };
}
export {
  createScene
};
