# Working on Strata

Strata is a dependency-free spatial UI runtime for ordinary HTML. This repository contains the runtime, documentation, examples and its interactive showcase.

- Public contract: `src/strata.d.ts`. Integration guidance: `agent-guide.md`.
- Runtime code lives in `src/`; showcase code lives in `demo/`. Keep their dependencies and performance claims separate.
- Preserve reduced-motion handling, compact layouts, native form state, keyboard access and controller cleanup.
- Never apply blur or opacity to a parent that must preserve a 3D child hierarchy.
- Do not invent npm availability: the package remains private and is distributed as source/local tarballs.
- Before committing: `npm run check`, `npm test`, `npm run build:site`, and `npm pack --dry-run`.
- Do not commit generated `site-dist/`, `artifacts/`, credentials or preview screenshots.
- Pages publishes through `.github/workflows/pages.yml`. Site URL: https://mmaxence.github.io/strata/.
- Update readable docs and the agent guide when changing the public API. The build produces `llms-full.txt`, structured metadata and a sitemap.
