# Evidence ledger

- Source: `MegD1/Ice-ascii-goldfish` at commit `8917da362744c55d2a3bc5698401949b8c65f44b`.
- Confirmed renderer: Canvas2D ASCII fish bodies, fins, water ripples, food and movement history; the DOM glass samples the pond canvas into an edge-refraction canvas.
- Confirmed state: the head drives path and speed, body points follow historical positions with a traveling wave, while feeding, avoidance and boundaries alter motion.
- Confirmed lifecycle: ResizeObserver, IntersectionObserver, visibility and reduced-motion checks gate rendering; `pagehide` disposes observers, listeners and animation frames.
- Adaptation: the original self-contained MIT HTML is preserved. A separate adapter drives its public DOM controls and mirrors count, pause, background and refraction into Workbench Parameters.
- Validation target: feed, add/remove fish, pause, reset, background cycle, dragging, resize and cleanup.

## Startup visibility audit (2026-10-27)

- Confirmed in the loaded `index.html`: `Ct` observes `#pond` during inline-script execution, and an `isIntersecting: false` callback cancels its animation frame. `wt` has nonzero initial fish speeds; there is no delayed-start timer.
- Confirmed in Chrome at a 1500 × 1000 Workbench viewport (1440 × 900 scaled preview): intermittent starts stop at simulation time `0.0333`, with `paused: false`, `document.hidden: false`, a connected full-size canvas, and the original observer's `visible: false`. A newly attached observer on the same canvas reports full intersection.
- Inferred browser integration cause: observation during the preview's `document.write` initialization can retain an obsolete non-intersection result. The engine-internal reason is unverified.
- Adaptation: attach the original intersection observer at `DOMContentLoaded` if parsing is still in progress. Keep its visibility gate, frame clock, swimming model, reduced-motion behavior and cleanup; do not substitute a timer or disable visibility checks.
- Validation: the canvas-pixel startup regression reproduced the original freeze. After the change, five consecutive Chrome runs against a `/MotionWorkbench/` production build passed opening, three resets, Apply, zoom, expanded preview, pause/resume and switching away/back. The three-example integration suite also passed. Safari was not available for this audit.
