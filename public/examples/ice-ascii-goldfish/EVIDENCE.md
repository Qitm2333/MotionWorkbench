# Evidence ledger

- Source: `MegD1/Ice-ascii-goldfish` at commit `8917da362744c55d2a3bc5698401949b8c65f44b`.
- Confirmed renderer: Canvas2D ASCII fish bodies, fins, water ripples, food and movement history; the DOM glass samples the pond canvas into an edge-refraction canvas.
- Confirmed state: the head drives path and speed, body points follow historical positions with a traveling wave, while feeding, avoidance and boundaries alter motion.
- Confirmed lifecycle: ResizeObserver, IntersectionObserver, visibility and reduced-motion checks gate rendering; `pagehide` disposes observers, listeners and animation frames.
- Adaptation: the original self-contained MIT HTML is preserved. A separate adapter drives its public DOM controls and mirrors count, pause, background and refraction into Workbench Parameters.
- Validation target: feed, add/remove fish, pause, reset, background cycle, dragging, resize and cleanup.
