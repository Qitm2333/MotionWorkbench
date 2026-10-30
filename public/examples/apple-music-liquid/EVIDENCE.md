# Apple Music liquid logo - evidence ledger

## Reference

- Provenance: **confirmed** from the deployed page, its loaded production chunks, and the linked MIT repository at the commit below.
- Live reference: <https://apple-music-effect.transitivebullsh.it/>
- Inspected: 2026-10-30
- Public source: <https://github.com/transitive-bullshit/apple-music-effect>
- Source commit: `e31a67602ea03659d60de5290f85b657d11ab27d`
- Code license: MIT, Copyright (c) 2026 Travis Fischer
- Loaded renderer chunk: `assets/resolution-BggWKuLT.js`
- Loaded renderer SHA-256: `a0cff3ba672451703a6f822d618701a95a9b9c5a80d5d4318f5bb35e664a5f64`
- Loaded application chunk: `assets/main-BZhlfnvD.js`
- Loaded application SHA-256: `2be37504d2519e276ecc73036f4fd124b634a1eb550777879dfa25cff0fda1a7`

The live DOM, network requests, compressed chunks, and linked public repository were inspected. The deployed renderer chunk contains the same readable GLSL, comments, film curves, WebGL context setup, render passes, and source file error strings as the repository commit above. Unique anchors checked in the deployed chunk include `uLensRingPhase`, the Cauchy coefficient `0.0044`, `EXT_color_buffer_float`, the `1.465` second shot boundary, and `apple/note.svg`.

## Observed rendering and interaction

- Behavior status: **confirmed** in the live reference and mapped to the local implementation.
- A four-second, 16:9 film with two shots: the Apple Music note, then the Apple Music wordmark.
- Playback starts paused at zero. Play, stage click, and Space toggle playback.
- The scrubber seeks continuously. Left and Right step one 24000/1001 fps frame; Shift steps by a beat at 114.8 BPM.
- Playback restarts from zero after reaching the end.
- The renderer lowers subframes and then resolution while live playback falls behind; a paused frame returns to full quality.
- The reference can replace each shot's logo by upload or drag and drop.
- Reference frames were inspected at 0.20, 0.60, 1.20, 1.55, 2.10, 2.70, and 3.50 seconds.

## Motion-system mapping

| Layer | Source evidence | Local file |
| --- | --- | --- |
| Time and shots | Four-second film; icon `0..1.465`, wordmark `1.465..4`; pure time-based rendering | `src/scene.js`, `src/player.js` |
| Curve driver | Monotone cubic Hermite interpolation with Fritsch-Carlson tangent limiting | `src/driver.js` |
| Oil surface | Closed-form superellipse dome, fitted crown/shoulder/edge curves, travelling rim and radial ripples | `src/dome.js`, `src/dome-data.js` |
| Spectral optics | Per-wavelength Cauchy refraction through the surface to a logo texture | `src/shaders.js`, `src/engine.js` |
| Lighting | Softboxes, horizon walls, ring light, chrome probe tip, Fresnel reflection | `src/shaders.js` |
| Presentation | Shutter subframes, bloom pyramid, exposure, saturation, black crush, cool balance, vignette | `src/engine.js`, `src/shaders.js` |
| Quality | Adaptive subframe/resolution levels while playing; full quality when paused | `src/player.js` |

The source does not implement a fluid simulation. Every frame is a deterministic function of film time: sparse fitted curves drive the surface, then the WebGL2 shader performs the optical and finishing passes.

## Workbench adaptation

- Preserved: the two shots, fitted curves, logo geometry, WebGL2 surface and spectral shaders, shutter accumulation, bloom/finish passes, original playback timing, keyboard stepping, scrubbing, image drop/upload, and adaptive quality approach.
- Adapted: TypeScript was mechanically emitted as readable browser JavaScript; JSON dome fits were moved into an editable JavaScript data module because MotionWorkbench HTML projects do not import JSON modules.
- Adapted: the source Dialkit panel is replaced by native MotionWorkbench Parameters. Values remain global multipliers over each shot's own baseline, matching the source panel semantics.
- Omitted: analytics, MP4 export, social/navigation chrome, and the optional soundtrack. None of these changes the visual motion system.
- Presentation change: the example retains the reference's manual Play behavior rather than auto-playing on open.

## Rights and attribution

The implementation code is adapted from the MIT-licensed project and retains its license in `LICENSE.md`. The Apple Music note and wordmark traces are study assets from the upstream project. Apple names, logos, trademarks, and audiovisual campaign material are not granted under the MIT license and remain the property of their respective owners. The optional campaign audio is not redistributed here.

## Validation record

- Visual parity: the live deployment and local renderer were captured on 2026-10-30 at `1200 x 675` and at `0.20`, `0.60`, `1.20`, `1.55`, `2.10`, `2.70`, and `3.50` seconds. A strided RGBA comparison across each full canvas reported a maximum channel error of `0` at every checkpoint.
- Direct-example regression: Chromium at an `800 x 600` viewport passed play, pause, end replay, continuous seek, frame stepping, icon/wordmark transition, SVG logo replacement, WebGL error, and narrow `390 x 844` resize checks.
- Workbench integration: the Example opened from the catalog using only project-local assets; all 11 Parameters were present; changing Dispersion redrew the paused frame without reloading or moving its time.
- Build: `npm run build` passed. The focused Playwright suite `tests/e2e/appleMusic.spec.ts` passed both tests.
- Console: no uncaught page errors were observed in either direct or Workbench-hosted runs.
- Not tested in this pass: physical Safari/WebKit hardware. The renderer requires WebGL2 and `EXT_color_buffer_float`, matching the upstream source's runtime requirements.
