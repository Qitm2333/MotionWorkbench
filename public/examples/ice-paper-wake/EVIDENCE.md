# Evidence ledger

- Source: `MegD1/Ice-paper-wake` at commit `df31b761b68f9bc26d67c06d020357b7b07501cf`.
- Confirmed renderer: subdivided Three.js image mesh, half-float persistent pointer trail, four-level anisotropic blur, and a final paper/dither composite shader.
- Confirmed interaction: window-level pointer samples feed a smoothed velocity trail; idle decay removes a stationary mark.
- Adaptation: the same MIT-licensed renderer and shaders are retained. Mutable per-instance configuration is synchronized with MotionWorkbench Parameters.
- Asset difference: upstream explicitly excludes its demo photograph from the MIT license. This project uses new local SVG artwork instead.
- Validation target: pointer wake, parameter updates without remount, resize, disposal, and no console errors.
