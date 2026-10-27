# Ice Paperbound: source port evidence

Reference: https://github.com/MegD1/Ice-Paperbound
Retrieved and inspected: 2026-10-27, commit `731a314e9b72f24bcb287aa4354fb1d9bb216df0` (also the current upstream HEAD at inspection).

The reference was run locally at http://localhost:5196/ using its lockfile. Inspected the rendered DOM, loaded `/src/main.tsx`, `/src/BookshelfScene.tsx`, `/src/BookBinding.ts`, `/src/content.ts`, `/src/styles.css`, GSAP modules and `/textures/book-spines.webp`. At 1440 × 900, captured shelf, extraction at 600 ms, cover and open states, and checked the console. The previous simplified independent bookshelf is superseded by this source port.

## Evidence ledger recorded before replacing the implementation

| Status | Mechanism and source anchor | Port contract |
| --- | --- | --- |
| confirmed | `ARTBOARD`, `BASELINE_Y`, `volumes`, `props`, `resize` | Keep the 1672 × 941 world, individual dimensions, initial yaw/tilt, attachments and orthographic aspect fit. |
| confirmed | `createSpineTexture`, `createJacketTexture`, `createBumpTexture`, `createEndpaperTexture` | Load the local source atlas; preserve procedural cloth, paper grain, wear, cover and interior typography. |
| confirmed | `BookBinding.ts / createBookBinding` | Preserve rounded boards, binding-edge hinge, curved title page and individual leaf edges. |
| confirmed | `setPointerFromEvent` → `hitTestPointer` → `setHoveredNode` → `animateBook` | Hover raises by 16 and moves forward by 76, with yaw +0.08 and roll +0.9°, 0.28 s entering / 0.42 s leaving, power3.out. |
| confirmed | `onPointerDown` / `onDirectoryClick` → `openBook` | Extract toward y=20/z=580 over 0.55 s. Begin turning and scaling at 0.5 s for 0.85 s. Preserve power3.inOut and the calculated book-dependent centering. |
| confirmed | `toggleCover` | Only stable cover/open states accept the toggle; hinge opens by 2.82 radians with matching group recentering, 1.05 s power3.inOut. |
| confirmed | `closeBook` → `returnBook` | Close hinge 0.45 s, align/move/scale 0.62 s together, then reshelve 0.52 s. Empty-area click and Escape use this same path. |
| confirmed | `revealScene`, `render` | Wait for atlas loading before reveal; preserve 0.74 s intro with 0.045 s stagger, power4.out, and pointer-camera pursuit factor 0.045. |
| confirmed | `.shelf-a11y button[data-volume]` | Keep seven keyboard-focusable book buttons; Enter selects then opens/closes. |
| confirmed | `renderCanvasFallback`, `prefers-reduced-motion` | Preserve the upstream 2D fallback and reduced-motion behavior. The fallback is less complete than the WebGL scene. |

## Workbench adaptations

Scene sources retain upstream attribution. Root-relative atlas paths become project-relative paths so directory Save/Export and Pages work. GSAP 3.15.0 is a local editable module, with its original standard-license notice. `@gsap/react`'s scoped setup/cleanup is replaced by a small React layout-effect + `gsap.context` adapter; geometry, materials and motion still use the original scene functions. Three.js uses the Workbench bundled 0.180.0 runtime (upstream: 0.185.1). ResizeObserver additionally tracks preview resizing.

Parameters select the volume and cover state through the same source state machine. Numeric controls expose source hover lift/depth, transition speed, opening angle, camera zoom and parallax; defaults retain the reference values. A cover-open request received during extraction waits for the cover state. Pointer/keyboard selection is published back to Parameters.

## Attribution and license status

Author: MegD1. Source, material atlas and editorial content are from the reference repository. This adaptation is included at the user's explicit request. No project-level license was found at the recorded upstream commit; it is not labeled MIT, and no license has been invented. GSAP retains its separate standard-license notice. This note records provenance rather than asserting a new upstream license.

## Verification

Reference and Workbench sandbox compared in Chrome at the same native 1440 × 900 viewport: initial shelf, MATTER extraction sampled at 600 ms, settled cover and open states. Screenshots confirm the original atlas, individual sizes/attachments, framing, binding and interior typography. The intermediate snapshots preserve the lift-before-turn sequence; screenshots use wall-clock sampling rather than deterministic frame locking, so this is not a pixel-identical timing assertion. Hover/click at (710, 710) selected MATTER in both scenes; clicking empty space at (40, 40) returned it to the shelf. No page errors occurred; the standalone audit saw only an unrelated favicon 404 in each host.

Workbench end-to-end checks cover all seven volumes through extraction → cover → opening → open → close → return, keyboard Enter/Escape, two-way Parameters synchronization, a cover request queued during extraction, reset, rapid volume switching, live transition speed/zoom and preview resizing. The three-example integration check loads Paper Wake → Goldfish → Paperbound in one session, checks rendered output and parameters, and rejects console/page errors or missing resources. Unit checks load the complete editable project and material atlas under a Pages-style URL prefix. `npm run test` (24 tests), lint and production build pass.

The added camera zoom is also applied to the source's shelf hit-test coordinates. Source defaults and motion timings otherwise remain unchanged. Safari, touch interaction and a forced WebGL-unavailable fallback have not been exercised in this Windows session. Upstream's minimum 1180 × 720 layout and less complete Canvas2D fallback are retained rather than presented as new responsive/mobile support.
