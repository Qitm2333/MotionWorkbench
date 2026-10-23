# Crash source audit

- Reference: https://spacetypegenerator.com/crash
- Retrieved: 2026-10-23
- Loaded local sources: `sketch_crash.js`, `crash_script/animators.js`, `crash_script/class_0boundary.js`, `crash_script/class_0circle.js`, `crash_script/class_1all.js`, `crash_script/class_2line.js`, `crash_script/class_3letter.js`, `crash_script/class_3debris.js`, `crash_script/class_3word.js`, `crash_script/update.js`, `crash_script/recording.js`, `style_crash.css`, `style_crash_mobile.css`
- Source license marker: CC BY-NC-SA 4.0 found in the loaded source.
- Workbench bridge: 0 dynamically created controls were found in source. After p5 setup, actual DOM range, checkbox, radio, color, select, and string controls are mirrored into Parameters.
- Boundary: the route keeps its own source renderer and control lifecycle. Analytics and Cloudflare instrumentation are removed. Third-party CDN libraries retain the exact versions requested by the live page.

## Workbench control integration

- Confirmed source presets/actions: No preset buttons in this route; none invented.
- Input chain: Workbench parameter event -> source DOM input/change or p5 mousePressed (mousedown) / HTML click callback -> source renderer state -> source controls read back into Parameters. Only changed fields are replayed; batched restoration applies the preset before saved overrides.
- Dynamic p5 controls bind to their source variables rather than generated random checkbox names, keeping saved parameter IDs stable across iframe reloads.
- Original DOM controls and navigation are hidden before setup; local sketch copies also suppress canvas-painted labels. Source rendering remains active.
- Source palette count, where present, is authoritative over inconsistent preset checkbox state and is saved explicitly. String strip counts and choices are synchronized from the source lexical state.
- Browser regression: tests/e2e/typography.spec.ts exercises initial canvas creation, every string control and source preset, hidden controls, panel readback, paused changes, and reapply at 1500 x 1000. This does not establish pixel-identical rendering or Safari support.
