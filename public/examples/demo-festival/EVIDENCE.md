# DEMO Festival letter motion: evidence ledger

## Scope

This editable study reconstructs the large interactive `DEMO` hero at
<https://demofestival.com/>. It preserves the source renderer's four-glyph
texture pipeline, per-letter pointer deformation, animated quadrant layout,
intro scale, idle performance, and final global deformation. It does not copy
the upstream Cables runtime or patch bundle.

Retrieved and audited on 2026-10-27.

## Loaded source

- Hero document: `https://demofestival.com/assets/motion/cbls_demo-patch/index.html`
- Loaded patch: `https://demofestival.com/assets/motion/cbls_demo-patch/cbls_demo-patch.js`
- Patch SHA-256: `60786ae996c0f72c441247defd6df28b5ebf54af2bc6acb4d8f81676eaccf5ca`
- Source glyphs: `assets/d.webp`, `e.webp`, `m.webp`, and `o.webp`, each
  1500 by 1500 pixels. These four site-served glyph images are included only
  for this attributed study; no upstream license was found in the loaded page.

## Confirmed source behavior

- The live hero is an isolated Cables WebGL canvas, not SVG text or a variable
  font. Each letter begins as an independent square texture.
- All four letters use the same two-axis cubic-Bezier UV shader. Pointer X/Y
  are smoothed with `current += (target - current) / 6`, then sent through
  letter-specific Smoothstep/Smootherstep range maps.
- D/E occupy the top row and M/O the bottom row. Top X, bottom X, and lower-row
  height are independent timelines mapped from `[0,1]` to `[5,95]` percent.
  The source subtracts five physical pixels from both sides of each split,
  making the visible separation ten pixels at the default value.
- Each letter's `ScaleTexture` runs over the full canvas-sized texture around
  its corner pivot. Its independent X/Y scales include the quadrant width and
  height multiplied by `In Scale` (the intro scale). The animated split thus
  changes the glyph's aspect ratio as well as its occupied area.
- `ScaleTexture_v3` sets alpha to zero outside its scaled UV bounds; the
  following `DrawImage_v3` operations composite that alpha. Transparent samples
  must not copy their edge-clamped RGB into the opaque composed image.
- The composed image passes through the same UV shader a fifth time, with
  anchors fixed at `0.5`; intro and idle timelines drive its handles.
- The source levels operation uses input minimum `0.53`, midpoint `0.5`, input
  maximum `0.583`, and output range `0..1`, followed by FXAA.
- The intro scale reaches 1 at 0.833333 seconds. Its global X/Y handle motion
  settles at 1.766667 seconds.
- When the pointer is idle, the source waits 2.9 seconds before starting its
  3.566667 second quadrant performance, and can retrigger on an eight-second
  timer while still idle.

## Source-to-code map

- `src/motion.js`: exact timeline keys, easing IDs used by the patch, range-map
  definitions, pointer smoothing, and idle/intro state transitions.
- `src/renderer.js`: independent letter textures, source cubic-Bezier UV
  equation with eight Newton iterations, quadrant-sized quads with corner-pivot
  intro scaling (equivalent to the source's quadrant-size-times-intro UV scale),
  alpha composition, and the final global UV/levels pass.
- `src/main.js`: asset loading, mouse/touch lifecycle, Workbench parameter
  declarations, pause-safe elapsed time, resize, and reset behavior.

## Deliberate differences and unknowns

- This study reimplements the traced graph in readable WebGL 1 instead of
  redistributing the minified Cables runtime. Its separate letter framebuffers,
  nearest-filtered intermediate textures, Levels gamma, and FXAA constants are
  taken from the loaded operation implementations. Driver-level sampling can
  still differ from the Cables renderer by a pixel at high-contrast edges.
- ScaleTexture uses `uv=(uv-center)/scale+center`; out-of-range samples have
  zero alpha. Only the composition draw uses source-alpha blending; the other
  framebuffer passes copy their shader output. The
  source cubic spline samples indices `0..31` at a `1/30` interval; the final
  sample lies beyond the segment endpoint, as in the Cables implementation.
- The four source glyph files have no license declaration in the loaded hero.
  They remain attributed here and should be replaced before redistribution in
  a context that requires an explicit reusable asset license.
- The original visual could not render in the available embedded research
  browser because WebGL context creation failed there. Source values, assets,
  graph links, and shader code were still available and were used as the
  authority; the local Workbench render is browser-tested separately.

## Intro artifact regression (2026-10-27)

- Confirmed cause: the local scale pass wrote transparent edge-clamped RGB
  directly into the composition buffer. Levels/FXAA then made those invisible
  samples visible as horizontal and vertical streaks while intro scale was
  below one. This was a composition error, not a different source glyph.
- Source anchors: `ScaleTexture_v3` / `scale_frag`, its quadrant X/Y multiplier
  nodes (for example `57kd8o95h`, `dl9kg15vi`), and the normal-alpha
  `DrawImage_v3` chain starting at `npk10q07u`.
- Regression validation uses actual WebGL pixels at intermediate intro scales,
  pointer extremes, asymmetric splits, both FXAA states and multiple sizes.
  Pixels safely outside the scaled glyph bounds must remain background, and
  the glyphs themselves must remain visible.
