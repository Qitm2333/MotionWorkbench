# Ice Works showcase: source evidence

Upstream: <https://github.com/MegD1/Ice-works-showcase>  
Pinned source commit: `bed3534a43125f6ef93890c75854427ed6a261a1`  
Reviewed and adapted: 2026-10-26

## Direct source mapping

- `src/Carousel.jsx` is adapted from `components/Carousel.jsx`. It retains the
  original 18-plane layout, signed-offset fan order, GSAP entry timeline,
  wheel inertia, angle-based drag, click suppression, predicted coast and snap,
  click-to-centre selection, asymmetric hover response, and teardown path.
- `src/shaders/planeShaders.js` retains the original full-screen SDF liquid
  field, honey bridges, glass bands and refraction, cursor tag, focus particles,
  and ASCII assembly shader. Its embedded Ashima/Gustavson noise notice is
  preserved.
- `src/shaders/textShaders.js` and `src/ring/{ascii,meta,splitText,tag}.js`
  retain the source text assembly, metadata morph, alpha-threshold goo filter,
  cursor label, and accessibility announcement mechanisms.
- `src/ring/{params,gui,projects,utils}.js` retain the original parameter
  defaults, ranges, groupings, project order, easing choices, and callbacks.
  `src/parameters.js` presents those same controls through MotionWorkbench.
- `src/vendor/gsap.js` is an on-demand local ESM build of GSAP 3.15.0. Its
  licensing information is kept separately in `src/vendor/GSAP-README.md`.

## Deliberate adaptations

- The upstream Next.js wrapper is replaced by a small Workbench React entry.
- Pinterest-hosted artwork is not covered by the upstream MIT license. The
  atlas lifecycle is unchanged, but it receives local procedural canvas art.
- Upstream font files are not redistributed. UI and shader-rasterised text use
  Arial, Helvetica, or the system sans-serif fallback.
- The remote arrow SVG is replaced by a locally drawn canvas arrow.
- The intro wording is `MATERIAL STUDIES` so the example does not present the
  upstream project's identity as MotionWorkbench's own.
- Diagnostic `data-ready` and `data-active` attributes are added solely for
  deterministic interaction tests.

The upstream implementation is MIT licensed; see `LICENSE.md`. GSAP is a separate
dependency under the GreenSock Standard License described in
`src/vendor/GSAP-README.md`.
