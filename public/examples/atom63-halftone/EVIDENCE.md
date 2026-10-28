# ATOM63 Halftone evidence ledger

- Reference: `https://atom63.io/writing` (Halftone / “Recreating Antimetal's Hero Animation With a Canvas Dot Grid”).
- Retrieval: 2026-10-28. The public route chunk `halftone-Bm9brKme.js` was inspected as evidence only (SHA-256 `10276642f47ab83fca15fbd66acd1e84ce31f64423ec64096ff00366d1c07eb1`); its source is not redistributed.
- Confirmed: the renderer is a Canvas2D hex-offset dot grid fed by multiple amplitude sources.
- Confirmed: the published construction order is core disc, ring 1, ring 2, inward/outward Gaussian cells, SDF-like shapes, then cursor trail.
- Confirmed: the public Dialkit model exposes grid spacing, dot min/max, core breathe/contrast/drift, ring radii/widths, cell counts/sigma, shape controls, trail life/sigma, replay and reset.
- Inferred: the six History snapshots are our staged reconstruction of the article's documented construction order. The public article does not expose six historical commits or complete intermediate snapshots, so the History nodes are not claims of the author's original files or exact published visuals.
- Unknown: the original project’s exact font, internal random seed, and unpublished intermediate parameter snapshots. No proprietary asset, branding file, or copied bundle code is redistributed.

The reconstruction uses one Canvas2D field sampled by a hex-offset dot renderer; Workbench parameter changes update that same field. Each imported History snapshot changes the stage level so the documented layers are revealed cumulatively. This is a source-informed reconstruction, not a pixel-identical reproduction of the live hero.
