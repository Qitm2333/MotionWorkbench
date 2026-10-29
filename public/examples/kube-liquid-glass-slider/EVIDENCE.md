# Liquid Glass / Slider evidence ledger

Research date: 2026-10-29

## Scope

One finished Kube article interaction: its glass slider. This is separate from the Switch and Music Player projects.

## Sources inspected

- Live reference: https://kube.io/blog/liquid-glass-css-svg/#playground
- Loaded article bundle: `https://kube.io/assets/blog-sWnMgqJX.js`
- Bundle SHA-256: `01da3b61cab80acce521028a7ff06d04001a218a594e9b187fe17a030e2344a0`
- Slider implementation located near UTF-16 offset `160146` in the loaded bundle.
- MIT comparison repository: https://github.com/ObaidQatan/liquid-glass-component-library

## Confirmed from the Kube page

- The thumb is horizontally draggable and updates the slider value while moving.
- It uses a convex bezel profile.
- Initial controls: specular opacity `0.4`, specular saturation `7`, refraction `1`, and blur `0`.
- The rendered effect uses the SVG `backdrop-filter` technique; it is not the regular SVG filter applied to a foreground image.

## MIT repository comparison

The repository includes a React LiquidGlassSlider with its own `useGlassSurface`, theme, and Framer Motion system. Its implementation uses mouse-only drag handlers and spring-driven presentation, which is not identical to the Kube article's control. Its MIT-licensed displacement/specular texture geometry was adapted for the local map generator; the notice is preserved in `LICENSE.md`.

## Adaptations and limits

- The example preserves the drag/value relationship and exposes visual filter controls in Workbench Parameters. Arrow keys, Home, and End are added for keyboard operation.
- Browser fallback uses ordinary blur when SVG `backdrop-filter` is unavailable.
- Safari and Firefox were not available for manual verification in this Windows session. No Kube bundle or branded assets are redistributed.
