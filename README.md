# Strata

Real HTML interfaces, arranged in space. A dependency-free, DOM-first spatial UI library in the Solids / Materia / Prisma family.

**0.1.0-alpha.1 · public alpha.** [Live site](https://mmaxence.github.io/strata/) · [Documentation](https://mmaxence.github.io/strata/documentation/) · [Agent guide](https://mmaxence.github.io/strata/agent-guide.md). Source is MIT licensed. Not published to npm; the package name remains provisional.

## Start with source

Copy `src/` into your project. Include the structural stylesheet, give the scene a height, and mount after its panels exist:

```html
<link rel="stylesheet" href="./strata/strata.css">
<div class="scene" id="gallery" tabindex="-1" style="height:600px">
  <div class="camera">
    <article class="surface" data-surface="first" data-x="-160" data-y="0">
      <div data-visual>
        <button data-focus>First panel</button>
        <button data-drag aria-label="Move first panel">Move</button>
        <p>Your real content, links and form controls.</p>
      </div>
    </article>
    <article class="surface" data-surface="second" data-x="160" data-y="0">
      <div data-visual><button data-focus>Second panel</button><p>More content.</p></div>
    </article>
  </div>
</div>
<script type="module">
import {createScene} from './strata/strata.js';
const scene = createScene(document.querySelector('#gallery'));
scene.setMode('overview');
// Before unmounting: scene.destroy();
</script>
```

The structural CSS is required; your application supplies colors, typography and content styles. Each `data-surface` identifier must be unique. `data-x` / `data-y` are layout coordinates at the 1120px reference width. Keep visual blur inside `[data-visual]`, not on the outer transformed surface. Start with [the standalone example](examples/basic/index.html), which does not depend on demo CSS.

You can also run `npm pack` and install the resulting local tarball. Package exports are `@strata-ui/core` and `@strata-ui/core/style.css`. No CDN or npm release exists yet. The private package flag prevents accidental registry publication.

## Controller

```js
const scene = createScene(element, {
  workspace: false,
  compactWidth: 650,
  referenceWidth: 1120,
  observeVisibility: true,
  onChange(state) { console.log(state.mode, state.active); }
});
scene.focus('second');
scene.setMode('overview');
scene.setPath('belt', {diameter: 640, axis: 20, speed: 1});
scene.setLayout('pile');
scene.sendToBack();
scene.setPileDragMode('free'); // Default: 'cycle', release a drag behind the stack.
scene.setDepth(0.8);
scene.setDepthOfField(1.1);
scene.orbit(6);
scene.pause();
scene.resume();
scene.reset();
scene.destroy();
```

Paths: `none`, `belt`, `float`, `wave` (figure eight), `spiral`. Layouts: `grid`, `pile`, `fan`, `rail`. `focus(id)` selects a panel; `setMode('overview')` restores context. Belt dragging changes the shared path phase, with bounded release velocity easing back to cruising speed. A selected path card stays associated with that path. Reset restores authored panel sizes/positions, depth, blur strength, camera yaw and primary selection, and separates assembled modules. It retains the configured path and its parameters, layout, pile order and pause state. See [the API documentation](documentation/index.html) and [TypeScript declarations](src/strata.d.ts) for the complete contract.

Pile drags return the card behind the stack by default. `setPileDragMode('free')` lets released cards stay on the canvas; returning to `'cycle'` gathers the pile. Cancelled drags preserve stack order. Arrow keys on a pile grip cycle it when free placement is off.

For belt, figure-eight and spiral paths, opt into cursor steering:

```js
scene.setPath('belt', {
  interaction: 'steer', // 'pause' (default), 'steer', or 'none'
  tilt: 6              // 0–12 degrees; default 0
});
```

Steering reverses on the left, brakes in the centre dead zone, and accelerates forward on the right. Vertical cursor position leans the path. Velocity and tilt ease smoothly, and leaving restores cruising. Drag inertia takes precedence and then hands back to the cursor. These interactions respect pause, visibility, compact view and reduced motion. The playground enables steering and 6° tilt by default; library defaults preserve hover-to-pause.

Fan spreads the same cards along an arc and shares the pile's cycle/free-placement behavior. Rail keeps an active item centered with receding neighbors: `scene.setLayout('rail')`, then `scene.navigate(1)` or `scene.navigate(-1)`. Navigation clamps at the ends. A horizontal drag scrubs the entire rail and settles to an item with bounded momentum; cards never detach. `state.railIndex` is the target item and `state.railPosition` is the fractional scrub position. Spiral is a closed, vertically travelling path with the same attached selection, drag and cursor behavior as belt.

The playground has four studies: Creative workspace, Collection (including an editable launch checklist and reading notes), Fly-through, and Explosion. Explosion separates a dashboard into six structural layers in perspective, with reversible assembly and a separation slider. Fly-through is a live dashboard with a rocket crossing above and beneath translucent panels. Backdrop blur reveals its passage; nearby panels rise gently on the lower pass. Checklist and note state survive study changes. Flight pauses when hidden, offscreen, or explicitly paused, and respects reduced motion. These are application examples; their state belongs to the demo, not the spatial controller. The earlier eye-tracking gallery remains a separate [research prototype](research/index.html).

Workspace mode is opt-in (`workspace: true`, or `data-workspace="true"`; legacy `data-case="creative"` is supported). The first panel is the primary canvas. `setAssembled(true/false)` moves the same controls between one composed interface and separate panels; it never clones input state. `resizeSurface(id, width, height)` resizes a panel. Corner buttons use `data-resize="nw|ne|sw|se"`; they must have accessible labels. Optional assembly slots configure the composed arrangement:

```js
createScene(element, {
  workspace: true,
  assembly: {
    width: 1100, height: 620,
    slots: { first: {x: 0, y: 0, width: 430, height: 560} }
  }
});
```

Wrap full panel controls in `[data-content]` and supply optional `[data-summary]` content with a `[data-summary-icon]`. Full controls compact into summaries, then icon-label tiles, before edge scaling. The active, dragged or resized panel is the packing anchor. Packing is bounded and heuristic: arbitrary content may still overflow its own panel, and very crowded scenes have finite space. Use scrollable panel interiors and a sensible number of panels.

## Integration and access

- Mount once after DOM content exists. Call `destroy()` before removing the element or replacing its panels. The panel list is fixed for a controller's lifetime; remount for structural changes.
- Use `pause()` for an inactive tab or hidden application view, then `resume()`. Automatic hidden-page, offscreen, compact and reduced-motion gates remain independent of manual pause.
- Keep native text, labels, links and input elements. Grips support arrow keys; Escape returns to overview. Do not use spatial position as the only indication of meaning.
- At widths below `compactWidth`, panels become a readable document stack. Reduced motion suppresses decorative depth motion and inertia. Do not override those fallbacks in app CSS.
- Do not transform or blur the outer surface yourself. Style `[data-visual]`. CSS transforms create containing blocks; portals are preferable for application-wide overlays.
- The runtime has no browser globals at module import. Mounting requires a browser with modern CSS transforms, Pointer Events, ResizeObserver and requestAnimationFrame. Call it inside your framework's client mount/effect hook, with destroy in cleanup.

## Validate and share

Use Node.js 22 or newer for development scripts. The browser runtime itself does not require Node.js.

```sh
npm run dev             # localhost:4414
npm run check           # syntax, export paths, no runtime dependencies
npm test                # deterministic controller + geometry regressions
npm run measure:size    # raw source and individual gzip sizes
npm run build:site      # static site-dist artifact
npm pack --dry-run      # inspect the distributable file list
```

The [browser checks](test/browser.html) exercise the real DOM and structural CSS. The [performance page](performance/index.html) reports source size and lets you measure frame intervals locally. Browser benchmark results describe the current machine and scene; they are not an all-device performance guarantee. See the [audit and release plan](audit/index.html) for completed work and remaining validation gates.

GitHub Pages deploys after validated pushes to main, or a manual workflow dispatch. Pull requests validate without deploying. Local builds do not publish. The build produces canonical URLs, structured metadata, a sitemap, and text resources for agents. The package is not published to npm.

## Limits

Alpha API; a fixed set of flat DOM panels; no WebGL, geometric meshes or physics collision solver. Decorative tilt is not part of exact drag-plane inversion. Browser zoom, complex transforms, nested scroll and device performance need application-specific testing. Automated browser verification in this pass covers the available Chromium browser, not Safari/Firefox or physical phones. No promise of 60fps on every device.

[MIT License](LICENSE) © 2026 Maxence Mauduit. [Demo asset notices](ASSETS.md). The runtime sends no telemetry and makes no network requests.

### Interactive hero

Select a hero card to open it and pause the chapter timer. Select it again, click the scene background, or press Escape to settle back into the same arrangement before resuming its remaining time. Chapter buttons start the chosen arrangement. An explicit Pause preference is preserved when closing a card. The layered mark and wordmark animation is independent of hero inspection and respects reduced motion.

The hero cards contain small interactive experiments: preview two letters, change a palette, turn the rings, adjust artwork color, and advance the edition. Selecting outside the card or pressing Escape closes the experiment and resumes the reel after the cards settle.

Explosion supports gentle cursor-controlled perspective, hover highlighting, and click or keyboard selection to inspect a layer. Escape clears selection. Hero horizontal swipes browse selected cards, advance the stack or rail, and switch the other reel arrangements; vertical touch gestures keep page scrolling.

The hero composes spatial behaviours inside one interface: a References module contains a draggable orbit, and a Working stack module cycles documents. The interface separates into modules and reassembles; the behaviours remain nested inside those modules. Selecting a module pauses playback for inspection; dismissing it restores its arrangement and resumes the timeline.
