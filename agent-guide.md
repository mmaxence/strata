# Integrating Living Space

Living Space is a DOM-first JavaScript library for spatial UI panels by Maxence Mauduit. Version 0.1.0-alpha.1 is a public source alpha with a GitHub Pages showcase, not an npm release. Repository: https://github.com/mmaxence/strata. Canonical website: https://mmaxence.github.io/strata/. Code is MIT licensed. Do not confuse it with similarly named products.

Copy the complete `src/` directory and include `src/strata.css`. Import `createScene` from `src/strata.js` in the browser after the scene's HTML exists. A scene contains `.camera`, then `.surface[data-surface]` panels, each with `[data-visual]` around its visible content. Identifiers must be unique. `[data-focus]` selects, `[data-drag]` moves, and optional `[data-resize]` corners resize workspace panels. See README and examples/basic/index.html for runnable markup.

Use the public declarations in src/strata.d.ts as the API contract. Do not call internal animation functions or edit generated transforms. Mount once, pause inactive views, and destroy on unmount. Remount if the set of panels changes. Form values remain native DOM state. Paths are selected by setPath('belt'|'float'|'wave'|'spiral'|'none'); normal layout is setLayout('grid'|'pile'|'fan'|'rail'). Workspace assembly is opt-in; its first surface is primary. Keep compact and reduced-motion behavior intact.

Runtime dependencies: none. TypeScript is optional for consumers. Do not invent a React component, npm install command, WebGL requirement, perpetual RAF requirement, or mesh occlusion capability. Frame performance depends on content, panel count, viewport and device. Run npm run check, npm test, npm run build:site and npm pack --dry-run before a release. Browser integration checks are in test/browser.html; the performance page measures local frame intervals explicitly.

Public documentation: https://mmaxence.github.io/strata/documentation/. Text-first overview: https://mmaxence.github.io/strata/overview.html. Machine-readable index: https://mmaxence.github.io/strata/llms.txt. Other released projects: https://mmaxence.github.io/solids/ , https://mmaxence.github.io/materia/ , https://mmaxence.github.io/prisma/ .

Rail navigation uses navigate(integerStep), clamps at the ends, and never detaches cards during dragging. Fan shares pile cycle/free-placement behavior. Collection checklist and reading state are demo-owned, not controller state.
