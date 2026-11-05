# Thinking Orbs — source evidence

## Source and provenance

- Repository: <https://github.com/Jakubantalik/thinking-orbs>
- License: MIT, Copyright (c) 2026 Jakub Antalik; retained at `LICENSE.md`.
- Inspected revision: `de85557ca220332586d070d8788c0e1d6e877a0d` (2026-08-16).
- Repository demo URL: `https://orbs.jakubantalik.com/`.
- Retrieval date: 2026-11-05.
- The former demo URL now redirects to a Libraries.dev migration notice. Its destination exposes a current public playground with seven selectable states, 64px/20px sizes, and a paused Listening preview; Weaving and Shaping are marked Pro there. This project uses only the public MIT-licensed GitHub source and does not copy or bypass the current Pro service.
- Source files copied and mechanically transpiled from TypeScript to browser JavaScript: `src/engine/{core,profiles,registry,orbits,lattice,web,braid,ribbon,morph,types,index}.ts`, `src/presets.ts`, and `src/types.ts`. Geometry and preset values were not changed by the transpilation.

## Behavior ledger

| Finding | Evidence | Status |
| --- | --- | --- |
| Nine named states map to nine procedural geometry modes; ribbon geometry is shared by composing and breathing with distinct profiles | `src/presets.ts`, `src/engine/registry.ts` | confirmed |
| Each state has separate 20px and 64px preset values for count, radius, and base speed; the speed prop multiplies the preset speed | `src/presets.ts`, `src/ThinkingOrb.tsx` | confirmed |
| Geometry produces depth-sorted dot/line records, then a plain 2D Canvas painter renders grayscale circles and connecting strokes | `src/engine/core.ts`, `src/engine/registry.ts` | confirmed |
| Theme inversion mirrors grayscale ink; `auto` additionally resolves ancestor theme and system color preference | `src/engine/core.ts`, `src/theme.ts` | confirmed |
| Reduced motion draws one deterministic representative frame at `t=0.6`; otherwise a shared performance clock drives the requested preset | `src/ThinkingOrb.tsx` | confirmed |
| React component pauses when offscreen or the document is hidden and resumes when visible | `src/ThinkingOrb.tsx` | confirmed |
| The repository Playground defaults to Listening, 64px, speed 1, paused; state, size, and speed controls update its preview | `demo/components/Playground.tsx` | confirmed |
| Current migrated public playground gates Weaving and Shaping as Pro; the MIT repo at the inspected revision contains their implementation | Live page and repository | confirmed |

## Source-to-workbench mapping

| Source responsibility | Workbench files |
| --- | --- |
| State-to-mode and all 18 size/state tunings | `src/presets.js` |
| Geometry functions and shared Canvas2D painting | `src/engine/*.js` |
| State selector, selected preview clock, pause, speed and theme controls | `src/main.js` |
| Native Web Platform / application controls | `index.html`, `style.css` |

The central preview enlarges the source's 20px or 64px logical canvas to 2x for inspection; geometry still runs at the original tuned size. The state browser uses static representative frames at `t=0.6`. These are presentation-only changes; the selected preview uses the upstream geometry and preset functions directly.

## Validation

- The live migrated playground was inspected at desktop size on 2026-11-05. It displayed the title, state controls, size controls, Cursor gravity option, and a paused Listening preview; the service marks Weaving and Shaping as Pro.
- Source repository was inspected at revision `de85557ca220332586d070d8788c0e1d6e877a0d`; the 9-state API, tuning data, render lifecycle, all geometry generators, and MIT license were read.
- `npm test`: 41 tests passed, including the new catalog/resource/license check.
- `npx playwright test tests/e2e/thinkingOrbs.spec.ts`: 2 tests passed in Chromium. The direct page was tested at `1024x820` and `390x844`; state switching, theme inversion, play, pause/frozen frame, responsive overflow, and the 9-button state browser were checked. The Workbench-hosted preview was tested for runtime loading and live state, size, speed, and theme parameter updates.
- `npm run build`: passed. `npm run lint`: passed with two pre-existing React warnings in `src/App.tsx` unrelated to this example.
- `git diff --check`: passed.
- Browser parity against the migrated site's revised, partly gated rendering is not claimed. This is a source-backed port of the public MIT repository revision listed above.
