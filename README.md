# Living Space

Part of **Living Things — Libraries for a living web**. Formerly **Strata**. Existing repository URLs, package names, imports and APIs remain unchanged.


Real HTML interfaces, arranged in space. A dependency-free, DOM-first spatial UI library in the Living Object / Living Type / Living Frame family.

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

## Practical integration recipes

These recipes describe **0.1.0-alpha.1**. Snippets are alternatives for the indicated markup, not multiple controllers to run sequentially on one root. Source/runtime APIs remain the same; the examples' snapshotExample/disposeExample helpers are application code, not library exports. Run the [basic example](examples/basic/index.html) for focus/drag/path/pause, and the [workspace](examples/workspace/index.html) for assembly/resize/native form state. Both include destroy/remount and use only original HTML/CSS with system fonts, no media assets or demo scripts.

### Install and initialize

In a repository checkout with Node 22, run npm ci, then npm pack. Install the actual local tarball path in your application, or copy the complete src directory with LICENSE. The package stays **private:true**; its provisional name is not an available/registered npm or CDN promise. Keep @strata-ui/core and @strata-ui/core/style.css imports stable. A bundler uses:

```js
import {createScene} from '@strata-ui/core';
import '@strata-ui/core/style.css';
const element = document.querySelector('#gallery');
const scene = createScene(element, {compactWidth:650, referenceWidth:1120});
// Register scene.destroy() in client unmount cleanup before removing panels/root.
```

Native browser pages need an import map and a separate stylesheet link; the runnable examples show both. Import is SSR-safe, mounting requires connected browser HTML and modern DOM/CSS APIs. Structural CSS is required, not a theme. Keep the direct .scene > .camera > .surface[data-surface] structure, unique nonempty IDs, visual wrappers and native content before mounting. Do not pre-author controller-owned data-ready. A duplicate controller on one root throws.

### Focus and drag without replacing native controls

```js
// After createScene, with these application buttons already connected:
const inspect = document.querySelector('#notes');
const close = document.querySelector('#overview');
inspect.addEventListener('click', () => scene.focus('notes'));
close.addEventListener('click', () => {
  scene.setMode('overview');
  inspect.focus({preventScroll:true}); // Intentional user-close destination, not a focus trap.
});
// Remove these application listeners in your own cleanup as well.
```

focus(id) is **spatial selection**, not DOM focus/modal semantics. It does not install inert siblings or a focus trap. Native tab order is still authored DOM order; Escape returns to overview and focuses the scene. App dialogs/routes or actions hiding a focused field must choose their own appropriate focus destination. Preserve labels, readable summaries, logical order and semantic buttons; source identity alone does not certify accessibility.

Provide a labelled data-drag button for movement, data-focus for selection and optional labelled resize corners in workspace mode. Arrow keys on grips/corners provide movement/resize alternatives. Native inputs/links/contenteditable descendants are excluded from the ordinary surface gesture path; arbitrary custom nested widgets are not universally arbitrated. Dedicated grips use pointer capture; cancel/release must finish the gesture. Compact mode hides grips and allows ordinary scrolling. Pile layout reserves touch-action:none on its surfaces; it is not a promise that every nested scroller/gesture will compose correctly. Touch emulation is not a physical phone test.

### Separate and reassemble the same form nodes

```js
const workspace = createScene(element, {
  workspace:true,
  assembly:{width:1080,height:560,slots:{
    canvas:{x:0,y:0,width:430,height:480},
    settings:{x:-370,y:0,width:270,height:320},
    notes:{x:370,y:0,width:270,height:320},
  }},
});
workspace.setAssembled(true);
workspace.setAssembled(false);
workspace.resizeSurface('canvas', 600, 420);
// Cleanup: workspace.destroy(); never mount this over an existing controller.
```

Use this in place of the earlier controller, not as a second mount on the same root. Workspace is opt-in; its first surface is primary. setAssembled works only for workspace scenes and uses assembly slots to arrange those same panels; it clears an active path and changes selection/mode. It does **not** split arbitrary DOM into layers or implement the showcase Explosion/rocket/card-to-camera choreography. Native input/textarea values stay in the same nodes through supported updates. Keep data-content interiors scrollable and provide useful data-summary text; when a panel compacts, essential actions still need a clear way to reach its full content.

### Update and dispose

Keep panel membership/IDs stable for a controller's lifetime. Native text/form edits remain application DOM state; do not rerender/replace the panel nodes under the controller. Use public setters for layouts/paths/depth/assembly/sizing. Root ResizeObserver handles container changes; arbitrary content/font/transform changes are not a universal refresh signal. There is no public refresh() or generic update() method. Use resizeSurface where appropriate, or destroy/remount after structural/constructor changes; retain values in native nodes or your application model.

pause()/resume() apply to this controller's animation, independently of hidden document, observed offscreen, compact width and live reduced preference. They do not disable native controls, stop unrelated CSS/demo timers or pause child libraries/media. Never clear a user's manual pause because visibility/preference changed. The examples retain that choice across their own controller remount and BFCache lifecycle; they do not provide a general cross-library scheduler/intent adapter.

Destroy is idempotent, cancels controller motion/observers/listeners and restores captured authored state without replacing inputs. Later controller calls are inert. Call it before root removal/reparenting, then clean up your own listeners/async work. Without a controller the scoped structural fallback keeps direct panels in document flow; it does not flatten a custom nested camera. Missing modern APIs/CSS or missing structural styles are not polyfilled. Reduced/compact presentation and a readable no-JS source are distinct states, not a measured all-browser guarantee.

### Complete public controller, not showcase API

| Members | Boundary |
| --- | --- |
| focus(id), setMode(mode) | Spatial selection / overview, not modal DOM focus |
| setLayout(layout), navigate(step) | grid/pile/fan/rail; navigate is rail-only and clamps |
| setPath(path, options), orbit(degrees) | none/belt/float/wave/spiral; orbit is camera yaw clamped ±12°, not a path ID |
| setAssembled(bool), resizeSurface(id,w,h) | Workspace arrangement and panel size; not arbitrary layer explosion |
| sendToBack(), setPileDragMode(mode) | Pile/fan cycle/free rules; free mode is not a workspace solver |
| setDepth(value), setDepthOfField(value) | Decorative depth 0–1.5 / blur field 0–3 |
| pause(), resume(), isPaused | Manual scheduling intent; live visibility/preference gates stay independent |
| reset() | Restores controller defaults/authored sizes while retaining documented path/layout/pause state; not native form reset |
| destroy(), state, stats | Owned cleanup and readonly snapshots; counters are not GPU/memory/FPS certification |

Constructor options: workspace, compactWidth (default 650, clamped 320–1600), referenceWidth (1120, 320–4000), observeVisibility (true), assembly and onChange. Path options use diameter 200–900, axis ±80°, speed 0.2–3, interaction none/pause/steer and tilt 0–12°. Initial options and setters remain defined by [strata.d.ts](src/strata.d.ts); do not infer undocumented methods/options from demo code.

### Alpha migration and geometry limits

Keep legacy repository/browser filenames, package identity/imports and data-surface IDs. Source/local tarballs remain alpha/private; do not remove safeguards or invent a registry alias. Older prototypes using demo functions, numeric chapter/rocket timers, explode(), card projection or checklist stores must keep those as app code. Use setAssembled for declared workspace slots, setPath('belt') for an orbit-like path and orbit(degrees) separately for yaw. The legacy data-case="creative" workspace opt-in is still accepted; prefer explicit workspace:true for new examples. Do not replace fixed panel sets without cleanup.

The no-JS direct-camera fallback and controller-owned data-ready marker must remain intact during upgrades. Never apply opacity/blur/filter to a camera ancestor that must preserve a 3D hierarchy. Space owns surface transforms/z-index; theme visual leaves instead. Portals/outside roots are often appropriate for application-wide overlays. Drag-plane inversion does not model every decorative tilt/zoom/perspective ancestor/nested scroll; child text/media/object pointer projection is not automatically correct. Cross-library composition and physical device budgets require their own evidence. The runtime has no canvas/DPR option, WebGL/mesh occlusion or physics solver.

## Eight practical use cases

[Runnable gallery](examples/recipes/index.html) · [Choice and ownership guide](examples/recipes/guide.md). These application recipes are excluded from the runtime tarball; source and local built copies are not live publication evidence.

| Job | Supported route | Native source |
| --- | --- | --- |
| Workspace | workspace + assembly slots | Draft, settings and notes |
| Portfolio orbit | belt path; inspect/return | Project cards, links and reading note |
| Comparison | grid + direct selection | Before/After labels and decision radios |
| Product breakdown | declared header/body/footer assembly | One real proposal, not showcase Explosion API |
| Onboarding | rail + navigate/focus | Step fields, preferences and review |
| Reference board | fan/free placement | Links, notes and checkboxes |
| Dashboard focus | grid + focus | Named output/table and native sample update |
| Responsive cards | pile/cycle, compact stack | Native disclosures and reading note |

One active scene and one application owner unify explicit open/overview/background/Escape return, drag state, composition context and teardown. Spatial selection is not modal DOM focus; ordinary input and onChange do not steal focus. Explicit close restores its invoking control, and composed entry context is reassembled. Labelled grips/corners and native step/compose controls provide keyboard/gesture alternatives. Native disclosures explicitly own their activation.

The recipes retain manual pause and document choice. Compact width 760 uses the actual runtime stack; reduced preference remounts the same nodes with compactWidth:1600 for an intentionally flat alternative. This is application policy, not the library's default reduced layout or a new API. No media/font/service, child library, projected-pointer or physical-device/composition certification is added. Run npm run check:recipes after building.

## Validate and share

Use Node.js 22 or newer for development scripts. The browser runtime itself does not require Node.js.

```sh
npm ci                  # repository development tools only
npm run dev             # localhost:4414
npm run check           # syntax, export paths, no runtime dependencies
npm test                # deterministic controller + geometry regressions
npm run measure:size    # raw source and individual gzip sizes
npm run build:site      # static site-dist artifact
npm pack --dry-run      # inspect the distributable file list
npm run check:docs      # API/example/site-copy parity after build
npm run check:examples  # Node 22 + Chrome; set CHROME if required
npm run check:recipes   # eight practical source/built/installed recipes
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

### Source-content fallback

Before mounting, or if JavaScript is unavailable, the structural stylesheet keeps panels visible in document flow and hides inactive drag/resize grips. Mounting switches to spatial layout; `destroy()` restores the source marker and static fallback. This does not emulate spatial interactions without JavaScript or certify browsers lacking the required modern APIs. Keep essential content in the real HTML and do not author the controller-owned `data-ready` marker.

## Optional site analytics

The published showcase offers an optional Facet page/source measurement control on its seven public content routes. It stays off until allowed, honors browser privacy signals, and keeps the choice separate from other Living Things apps. The notice describes 30-day active events and up to seven additional recovery days. No visitor IDs, linked journeys, country or device details are collected. The runtime package includes no analytics; build-time site integration lives in `analytics/` and `scripts/build-site.mjs`.
