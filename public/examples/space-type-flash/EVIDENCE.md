# Flash source audit

- Reference: https://spacetypegenerator.com/flash
- Retrieved: 2026-10-23
- Loaded local sources: `flash_script/sketch_flash.js`, `flash_script/update.js`, `flash_script/textures.js`, `flash_script/animators.js`, `flash_script/recording.js`, `flash_script/0_riseSun.js`, `flash_script/0_cloud.js`, `flash_script/0_arcer.js`, `flash_script/0_snap.js`, `flash_script/0_split.js`, `flash_script/0_bend.js`, `flash_script/0_shutters.js`, `flash_script/0_shuttersEE.js`, `flash_script/0_shutters2.js`, `flash_script/0_slotMachine.js`, `flash_script/0_bugEyes.js`, `flash_script/0_bugEyesEE.js`, `flash_script/0_twist.js`, `flash_script/0_halo.js`, `flash_script/0_grid.js`, `flash_script/0_starburst.js`, `flash_script/0_box.js`, `flash_script/0_blank.js`, `style_flash.css`
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
