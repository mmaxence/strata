# Integrating Living Space

Living Things · **@strata-ui/core 0.1.0-alpha.1**. Formerly Strata. Public source alpha/local tarballs, **private:true**, not an npm/CDN release or verified registry identity. Keep existing repository, browser paths, package names and CSS imports. Code is [MIT licensed](LICENSE); demo assets have [separate notices](ASSETS.md). Runtime dependencies, WebGL and telemetry: none.

## Start from actual HTML and the public contract

Copy the complete src directory with LICENSE, or pack the reviewed repository and install its actual local tarball path. A bundler uses @strata-ui/core and @strata-ui/core/style.css. Native browser pages require an import map or real .js source URLs plus a stylesheet link. Do not invent a registry install, framework component or missing API polyfill. Imports are SSR-safe; mount in the client after real panel nodes exist.

[Basic example](examples/basic/index.html) demonstrates selection, grips, path/pause, native fields and destroy/remount. [Workspace example](examples/workspace/index.html) demonstrates public assembly slots, resize corners and native input/textarea state. Both use only original HTML/CSS/system fonts and include an import map. Example snapshotExample/disposeExample functions are application helpers, not package exports. [README recipes](README.md#practical-integration-recipes) and [strata.d.ts](src/strata.d.ts) define this version's integration contract.

Use a .scene root, direct .camera, then uniquely named .surface[data-surface] panels with [data-visual] leaves. Structural CSS is required. The first panel is primary when workspace is enabled. Keep source content/labels readable before mount; do not pre-author data-ready. A duplicate controller throws. Panel membership/IDs are fixed until destroy/remount; do not replace them through framework rerenders under a live controller.

## Supported runtime versus custom showcase

The controller has 19 members: focus, setMode, setLayout, setPath, setAssembled, sendToBack, navigate, setPileDragMode, resizeSurface, setDepth, setDepthOfField, orbit, pause, resume, reset, destroy, state, stats and isPaused. No explode, refresh, update, mesh camera, ray casting, texture sharing or generic media-playback method exists.

Layouts: grid, pile, fan, rail. Paths: none, belt, float, wave, spiral. orbit(degrees) changes camera yaw (±12°); it is not setPath('orbit'). navigate(integerStep) is rail-only and clamps. Pile/fan cycle/free placement is separate from workspace assembly. Constructor fields: workspace, compactWidth, referenceWidth, observeVisibility, assembly, onChange. Use declared public setters for updates; changing constructor/panel structure requires cleanup/remount.

setAssembled(true/false) only works in workspace mode and arranges existing panels into declared slots; it clears path motion/changes selection. It does not discover arbitrary UI layers or reproduce the demo Explosion. Rocket flight/depth, hero chapter timers, nested References orbit/Working stack, selection-to-camera choreography and collection checklist data are demo/application code. Keep their state and scheduling outside the library. The runtime's declaration file, not similar-looking demo functions, is authoritative.

## Focus, input and gestures

focus(id) selects spatial presentation, not native DOM focus or a modal trap. It does not mark every other panel inert. Native tab order follows authored DOM. Escape returns to overview and focuses the scene; applications own route/dialog/invoking-control focus restoration and actions hiding a focused field. Do not steal focus on every onChange callback. Meaningful controls need labels and keyboard alternatives independent of spatial position.

Use labelled data-focus/data-drag buttons; workspace resize corners use data-resize=nw/ne/sw/se. Arrow keys on grips/corners move/resize. Ordinary surface handling excludes native inputs/links/contenteditable; custom nested widgets may need application gesture arbitration. Pointer capture/cancel/drag thresholds are owned by the runtime for its supported gestures. Compact mode hides handles and keeps document scrolling. Pile surfaces reserve touch-action:none; do not assume nested scrollers/child-library gestures work without tests.

Native inputs/textarea stay the same nodes and retain values across supported layout/assembly/resize/reset/destroy. They are not serialized into scene.state. Content, focus and form-reset behavior remain application-owned. Keep long interiors scrollable; provide useful data-summary content and a route back to full content when panels compact.

## Motion, resizing and disposal

pause/resume apply only to this controller's scheduling. Hidden document, observed offscreen, reduced preference and compact width are independent gates. A parent's pause does not pause child effects/media or arbitrary CSS/demo timers. Preserve explicit user pause across visibility/preferences. The examples keep that choice across their controller remount and cached-page lifecycle; this is narrow application code, not a shared scheduler.

Root ResizeObserver handles container geometry; no generic refresh or DPR/canvas option exists. Use resizeSurface for explicit panel sizes where appropriate. Font/content/transform-only changes and crowded layouts need their own validation or remount plan. Reduced motion suppresses decorative depth/tilt/blur/path work; compact mode uses normal document flow. Updates/native actions can still change visible state while paused.

Destroy before removing/reparenting root/panels; it is idempotent and restores captured owned styles/data/attributes without cloning forms. Later methods are inert. Also remove your application listeners, pending async work and child-library controllers. Direct uninitialized/destroyed camera panels have scoped readable fallback; custom nested cameras retain their authored transforms. This is not a spatial-interaction or missing-modern-CSS/DOM polyfill.

## Preserve the 3D hierarchy and limits

Do not apply opacity, filter or blur to ancestors preserving a 3D hierarchy. Space owns surface transform/z-index; theme visual leaves, and put application-wide overlays outside transformed roots where appropriate. Depth blur belongs on [data-visual]. Arbitrary nested 3D children may be flattened by visual-leaf clipping/blur; there is no automatic cross-library composition guarantee.

Drag-plane calculations do not model every decorative tilt, zoom, perspective ancestor or nested scroll. Browser bounding rectangles are not general inverse projections. Do not claim accurate child text/media/object pointers or physical-device performance from a basic scene, byte size or software-renderer test. Test content/zoom/contrast, native keyboard/touch/focus, reduced/compact/no-JS, repeated cleanup and your actual browsers/devices. Current Chromium emulation is not physical phone/Safari/Firefox/assistive-tech certification.

## Develop and migrate the alpha

Keep legacy filenames/imports; use workspace:true rather than depending on legacy data-case=creative for new code (legacy remains accepted). Keep data-ready controller-owned and scoped source fallback when upgrading older prototypes. [README alpha notes](README.md#alpha-migration-and-geometry-limits) explain demo-to-runtime boundaries. Public site docs/source can lag a local candidate; deployment and registry publication are separate decisions. Preserve optional site-consent integration during any later reviewed reconciliation; the library runtime sends no telemetry.

From the repository: npm ci, npm run check, npm test, npm run build:site, npm pack --dry-run, npm run check:docs, npm run check:examples. Node 22 + local Chrome are needed for the example check; set CHROME to its executable. TypeScript is a development-only checker, not a consumer/runtime dependency. Retain LICENSE/ASSETS and private safeguards.

## Practical recipes (local candidate)

[Eight recipes](examples/recipes/index.html) · [Choice/ownership guide](examples/recipes/guide.md). Workspace, portfolio belt, comparison, declared breakdown, rail onboarding, reference fan, dashboard focus and responsive pile use existing APIs. One owner/generation, native content/fields, explicit inspection-return context, actual grip keys/touch, child disclosure arbitration and cleanup. Reduced preference intentionally remounts a flat compact layout, preserving manual pause/document intent. No new controller/export, child renderer, arbitrary Explosion or physical-device/projected composition claim. Examples remain outside the private runtime tarball; local copies are not live parity. Run check:recipes after building.
