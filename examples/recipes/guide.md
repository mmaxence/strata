# Eight practical Space recipes

Local source/private tarball alpha 0.1.0-alpha.1. Serve the repository or built site and open index.html with its selector or #workspace, #orbit, #comparison, #breakdown, #onboarding, #board, #dashboard, #stacked. All source panels remain readable without JavaScript. Examples are not shipped in the runtime tarball; the README includes the choice summary.

## Choose by the job

| Job | Supported configuration | Useful native content/action |
| --- | --- | --- |
| Workspace | workspace:true, declared assembly slots, grid | Draft/settings/notes, native text and checkbox, compose/separate and resize corners |
| Portfolio orbit | setPath('belt'), diameter 600, axis 16, speed .25, pause interaction, tilt 0 | Three original project cards, reading note/link and local shortlist action; inspect then return to the same configured path |
| Comparison | grid with explicit Before/After/Decision | Labelled lists and native decision radios; direct inspect buttons, not drag-only meaning |
| Product breakdown | workspace:true, header/body/footer slots, composed initially | One real HTML proposal separates and reassembles using declared geometry, not arbitrary showcase Explosion functions |
| Onboarding steps | rail, navigate(-1/1), focus(id) for direct step | Account field, preferences, review action; clamped previous/next and aria-current step |
| Reference board | fan plus setPileDragMode('free') | Sources, questions, notes and native links/checkboxes; optional placement with explicit grips |
| Dashboard focus | grid and focus(id) | Named output/data table/note; sample changes update HTML, not canvas-only numbers |
| Responsive stacked cards | pile/cycle on wide screens, native stack on compact/reduced | Reading note and genuine details disclosures; sendToBack and grip keys are alternatives to gestures |

These are application recipes, not eight new library layout aliases. grid/pile/fan/rail are layouts, belt is a path, and orbit(degrees) is camera yaw rather than an 'orbit' path name. Workspace assembly has explicit slots; it does not discover UI components or reproduce hero/rocket/explosion choreography. No shared runtime or new controller API is introduced.

## One state and one owner

main.js owns one active controller and a generation. mountRecipes is idempotent; disposal is idempotent, aborts application/scene listeners, removes the preference subscription and destroys the controller before hiding/replacing a scene. A late dynamic import cannot mount a retired instance. Original input, checkbox, radio, disclosure and content nodes are not cloned. Changing the fixed panel set or constructor options requires destroy/remount. Reset arrangement does not reset form values.

The public state is the selection/layout/drag/assembly source of truth. UI labels are deduplicated and omit changing velocity/phase counters, so a live region is not announced every frame. Explicit user pause is separate from system preference, native document choice, visibility and disposal. Pause/resume gates runtime scheduling; requested layout/focus updates can still render or transition. No parent/child media scheduler, universal refresh/setPointer or frame-driving API is invented.

Every case has the same Inspect/Overview/document/pause/remount/reset controls. The invoking native control is remembered only for explicit inspection. Selection is spatial presentation, not modal DOM focus, inert siblings or a focus trap. Native Tab order follows source order. Never move DOM focus in every onChange. Ordinary field editing, layout updates and pointer hover do not steal focus.

Overview, Escape and a real background click finish inspection using runtime state. The app restores the recorded invoking control after runtime event dispatch, once the controller actually reached overview. If inspection began inside a composed workspace/breakdown, dismissal restores that composition. A drag-suppressed click does not become an accidental dismissal. Changing recipes clears stale return targets; a programmatic switch away from a focused hidden panel moves focus to the recipe control. With no recorded opener, runtime Escape retains its ordinary root-focus behavior. This is an application return policy, not a new library modal API.

## Gestures, keyboard and child ownership

Move only the labelled data-drag handles. Arrow keys invoke the runtime's actual movement/path/rail/pile rules; they are not eight unrelated application drag implementations. A cycle pile sends cards behind, a free fan can detach, rail scrubs/clamps and belt changes phase. Dedicated workspace corners provide labelled keyboard/pointer resize. Direct panel/step buttons and semantic compose controls provide useful alternatives when gestures are unavailable.

The runtime excludes common input/textarea/select/link/button/contenteditable gestures; arbitrary nested widgets are not universally arbitrated. This recipe explicitly stops pointerdown/click propagation on native details summaries, preserving their activation while avoiding a parent card toggle/drag. It does not prevent native disclosure defaults. Forms, radios and links keep their native behavior. Custom menus/dialogs/competing gesture widgets still need their own ownership rules.

Interrupted/cancelled drag, selection changes, remount and disposal must release capture/scheduling through the runtime. The tests exercise actual mouse and emulated touch as well as keys, cancellation and owner teardown. Emulated touch is not a physical phone test or proof of arbitrary nested scrolling behavior.

## Responsive and reduced layouts

Normal compactWidth is 760 inside a host capped at 1100px. Small scenes use the real runtime's document layout, hide movement/resize grips and retain scrolling/forms. Reduced preference remounts the same native nodes with compactWidth:1600 so these recipes deliberately choose a flat readable stack; this is stricter than the library's default static spatial reduced presentation. The preference value comes from its change event, and manual pause/document choice are retained.

Use document layout destroys the scene and uses the scoped authored source fallback. Clearing a preference never overrides an explicit document choice or manual pause. The same input/disclosure values remain. Without JS/module loading, source content and native controls are useful; missing modern DOM/CSS APIs are not polyfilled. Animated orbit is optional and has an always-available pause/document choice.

## Layout and composition limits

Keep direct .scene > .camera > .surface[data-surface], nonempty unique IDs within each controller, data-visual leaves and semantic content before mounting. data-ready is controller-owned. No opacity/filter/blur is placed on preserving camera ancestors. This example clips its stage using overflow:clip and styles leaf visuals, not a flattened camera. Long interiors scroll; small/crowded layouts have finite capacity.

No external Type/Frame/Object child runtime is used here. Native DOM hit testing and the supported camera are different from inverse projection for arbitrary transformed descendants. Extra perspective/zoom/rotated ancestors, child media/text pointers, texture/depth sharing, arbitrary collision/packing and full six-pair composition remain separate work. Do not relabel these recipes as VIS-11/VIS-61 or physical-device qualification.

## Validate and deliver

Keep @strata-ui/core and @strata-ui/core/style.css, version/private safeguards, existing repository/browser paths and independent package boundaries. Use reviewed source or an actual locally packed tarball; no npm scope ownership, registration, CDN release or live parity is claimed. The runtime import is SSR-safe, mounting is client-only; the recipe module itself is a browser application.

Node 22 + local Chrome (CHROME selects it): npm run check, npm test, npm run build:site, npm pack --dry-run, npm run check:docs, npm run check:examples, npm run check:recipes. The new checker covers all eight source/built/installed cases, native fields/actions, focused inspection/dismiss, keyboard/mouse/emulated touch, resize/assembly/rail/pile, compact/reduced/document/no-JS, interruption/async and repeated cleanup. Existing tests remain intact. No external media/font/service or asset-rights decision. Software/emulated checks do not certify actual mobile GPUs/thermals/battery, Safari/Firefox, assistive technology or broader composition budgets.
