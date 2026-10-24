# Type Physics+ mechanism study

- Reference: https://typephysics.type.today/
- Retrieved: 2026-10-23
- Current document SHA-256: `5A938F222EE97230004CD8078F716222BBF726BF62FFAF24112B7327360C641B`
- Inspected source: the live document's inline CSS and JavaScript; no external application bundle was loaded at inspection time.
- Browser observations: Chrome at 1440 x 900 and 390 x 844. The narrow page retains two fixed 256 px / 240 px control panels, leaving the canvas wrapper with zero width; this study intentionally lets Workbench own the controls and keeps the canvas usable.

## Evidence ledger

| Finding | Status | Evidence |
| --- | --- | --- |
| Physics+ uses fixed pixel dimensions for four ratios and scales the canvas to the available viewport. | confirmed | Live `resize()` sets 1920 x 1920, 1080 x 1440, 1080 x 1920, or 1920 x 1080. |
| Initial text is `type.today`, initial layout is diagonal down-right, and the fallback font before a collection font loads is `Georgia, serif`. | confirmed | Live DOM values and global initialization. |
| Text is flattened into glyphs; spaces affect linear spacing but are not rendered. New glyphs spawn randomly inside an 80 px margin with random velocity and rotation. | confirmed | `computeLayout()` and `rebuildText()`. |
| Layouts are right, down, two diagonals, circle, alternating Archimedean spiral, horizontal/vertical wave, and rotating rays. | confirmed | `setDir()` and `computeLayout()`. The formulas and constants are retained here. |
| Scale uses a `0.12` spring and `0.82` damping. Arrival and resting position springs are `0.055` and `0.008`. | confirmed | `updatePhysics()`. |
| Per-glyph colliders are ellipses sized from measured glyph width/height plus collider padding. Active collisions use up to eight solver passes and settled glyphs become immovable walls. | confirmed | `glyphRx()`, `glyphRy()`, and the collision loops in `updatePhysics()`. |
| Wall rebound keeps 35% velocity. Drag release keeps 85% of the last pointer delta and makes the release location the new target. | confirmed | Bounds and pointer `drop()` logic. |
| Outer and inner contours use separate black/white blur-and-contrast masks, SVG luminance-to-alpha conversion, recoloring, and a final sharp text pass. | confirmed | Physics+ render passes A, B, and C. This study preserves the same padded three-pass relationship and SVG filter stage. |
| Hold forces, Wave, Orbit, Drift, Pulse, Circulate, Repel, Attract, Scatter, Bounce, Stack, Ping, and Freeze update the same glyph state consumed by physics and rendering. | confirmed | Effect functions and `updatePhysics()`. |
| The source has no built-in visual presets; its Presets panel stores user-created state in localStorage. | confirmed | `collectState()`, `savePreset()`, and `loadPreset()`. Workbench project parameter values provide the corresponding saved state here; no invented presets were added. |

## Workbench mapping

- The controls represented by this Workbench study are in Parameters: text, nine layouts, typography, four colors, outer/inner contours, collision, physics, force, orbit, and passive effects.
- Source hold buttons are represented by the `Held force` select because Workbench Parameters currently has no momentary button type. `None` stops the force.
- Source one-shot buttons are represented by `One-shot action`; after firing, it publishes itself back to `None`, preserving action semantics across save/reload.
- Pointer and touch dragging use the source hit radius and release velocity relationship.
- Source hotkeys `1`-`9`, `E/I/V/H/G`, `X/B/T/P/F`, and `W/O/D/U/C/R/A` operate the corresponding layouts and effects while focus is inside the preview; held keys release back to `None`, and every shortcut publishes the resulting value to Workbench Parameters.
- The source page's own panels, localStorage preset manager, export, recording, tours, glyph browser, audio sampler/mixer, Variable+ mode, font upload, remote Type.Today catalog, and background upload are outside this behavior slice.

## Rights and assets

The live page describes tool and pre-installed font usage, but it does not provide a source-code redistribution license. This project therefore does not contain the downloaded page, Type.Today fonts, soundbank, logos, or copied UI. It is a clean readable implementation of the traced interaction relationships and uses the reference's own `Georgia, serif` fallback. The reference remains credited in project metadata.

## Verification target

The focused browser test passes initial rendering, all 32 parameter definitions, all nine layouts, text replacement, gravity state, one-shot reset, real pointer dragging, hotkey-to-Parameter synchronization, reapply state, and checks for page errors at 1500 x 1000. Unit tests, lint, and the production build also pass. The wider existing browser regression first reported 27 of 30; its three Space Type p5 canvas-visibility timeouts passed on isolated reruns, indicating intermittent test/resource timing rather than a reproduced project error. This verification does not establish pixel identity, audio correspondence, Variable+ behavior, or Safari support.
