# Field source audit

- Reference: https://spacetypegenerator.com/field
- Retrieved: 2026-10-23
- Live browser check: Chrome, 1440 x 900 and 390 x 844. The route is `/field`; the full-window canvas resizes to the viewport. The shared navigation marks FIELD as the active route.
- Loaded assets: `https://spacetypegenerator.com/sketch_field.js`, `https://spacetypegenerator.com/keyboardEngine_190103.js`, `https://spacetypegenerator.com/style.css`, p5.js 1.0.0 from cdnjs, IBM Plex Mono from Google Fonts, and `assets/IBMPlexMono-Regular.otf`.
- The loaded JS declares CC BY-NC-SA 4.0. The source vector keyboard engine is bundled with its header and license. The IBM Plex Mono OTF is included under its separate SIL Open Font License 1.1 in `assets/OFL.md`.

## Behavior ledger

| Finding | Status | Evidence |
| --- | --- | --- |
| `/field` loads `sketch_field.js`, one full-window p5 WEBGL canvas, a `#textfield` textarea, and six preset buttons. | confirmed | Live page DOM, loaded script list, and `setup()`. |
| `column` and `row` are grid dimensions. The Full Text checkbox DOM defaults checked, but the backing `fullText` variable is not initialized, so the initial renderer takes the single-pass branch (`input.length` cells). Clicking the checkbox enables `row * column` repeated cells. | confirmed | `setup()` declares a checked checkbox without assigning `fullText`; `draw()` branches on `fullText==true`; live initial render and checkbox interaction. |
| Grid position is `(columnIndex * xSpace + xWaver, rowIndex * ySpace + yWaver, zWaver)`. `xSpace = typeX + tracking`; `ySpace = typeY + lineSpace + yStrechWave/2`. | confirmed | `draw()` layout calculation and per-cell transforms. |
| Wave time is `frameCount * Speed / 100`; spatial phase adds `column/xLength + row/yLength + Offset`. `sinEngine` and `cosEngine` apply signed shaping `sign * (1 - (1 - abs(value))^slopeN)`. | confirmed | Loaded helper functions and calls in `draw()`. |
| Z/X/Y wave checkboxes shift their phase by π; stretch wave checkboxes shift phase by π/2. They do not disable the corresponding amplitude. | confirmed | Checkbox callbacks assign offsets; wave calculations multiply their result by amplitudes independently. |
| Cell rotations derive from neighboring Z-wave samples; Y-wave also drives per-cell Z rotation and X stretch. | confirmed | Neighbor samples and transform chain in `draw()`. |
| Presets first call `reSetting()`, then assign source slider values; all set Full Text on. `reSetting()` clears X-stretch phase and Full Text but leaves Z/X/Y and Y-stretch phase checkboxes untouched. | confirmed | `reSetting()` and all six preset functions; repeated browser clicks confirm these phase toggles persist. |
| Palette checkboxes are cumulative: enabling palette N enables earlier colors; disabling N reverts the active count to N-1. Colors cycle by row. PRIDE sets six-color mode and assigns a sixth purple color in code. | confirmed | Palette callbacks, `setTextColor()`, and `pride()`. The sixth color has no color picker in the source UI. |
| Main glyphs are vector paths, independent of the OTF used for UI text. | confirmed | `src/keyboardEngine_190103.js` executes through `src/glyph-adapter.js`, supplying the source paths and trigonometry. |
| IBM Plex Mono is loaded by the reference for p5 UI text. | confirmed | `preload()` calls `loadFont('assets/IBMPlexMono-Regular.otf')`; `setup()` calls `textFont(font)`. The local copy retains OFL 1.1. |

## Source parameter map

Range parameters are listed in source declaration order. `PI` defaults are exposed as the browser-observed range value `3.1`.

| Parameter | Label | Default | Range | Step |
| --- | --- | ---: | ---: | ---: |
| `column` | Columns | 21 | 1..200 | 1 |
| `row` | Rows | 21 | 1..200 | 1 |
| `tracking` | Tracking | 5 | -10..100 | 1 |
| `lineSpace` | Line spacing | 5 | -10..100 | 1 |
| `typeX` | Type X-scale | 20 | 0..100 | 1 |
| `typeY` | Type Y-scale | 40 | 0..100 | 1 |
| `typeStroke` | Type weight | 2 | 0..10 | 0.1 |
| `speed` | Wave speed | 2 | -10..10 | 1 |
| `xOffset` | Wave X size | 3.1 | 0.1..60 | 1 |
| `yOffset` | Wave Y size | 3.1 | 0.1..60 | 1 |
| `zWave`, `xWave`, `yWave` | Z/X/Y amplitude | 0 | 0..200 | 1 |
| `yWavezRot`, `yWavexStr` | Y-wave Z rotation / X stretch | 0 | 0..60 | 1 |
| `xStrechWave`, `yStrechWave` | X/Y stretch amplitude | 0 | 0..100 | 1 |
| `xRotCamera`, `yRotCamera`, `zRotCamera` | Camera rotations | 0 | -180..180 | 1 |
| `zoomCamera` | Camera zoom | 0 | -500..500 | 1 |

Additional controls: the DOM Full Text checkbox is checked while effective initial `fullText` is false; phase booleans `zWavePhase`, `xWavePhase`, `yWavePhase`, `xStretchPhase`, `yStretchPhase` all false; five palette colors default `#000000`, `#ff0000`, `#0000ff`, `#ffff00`, `#ffffff`, with only the first palette layer enabled; white background; PRIDE false; six source presets: Stacks, Bricks, Simple Z, Complex Z, Zebra, Harlequin.

## Preset values

Unlisted values return to `reSetting()` defaults. Source phase checkbox state and active palette count are not reset; they are intentionally retained when reproducing preset transitions.

| Preset | Overrides |
| --- | --- |
| Stacks | column=22, row=8, tracking=4, lineSpace=12, typeX=20, typeY=18, speed=-3, xOffset=5.1, yOffset=59.1, yWave=100, yWavezRot=35, yWavexStr=7 |
| Bricks | column=20, row=9, tracking=17, lineSpace=7, typeX=13, typeY=20, speed=-4, xWave=86, xStretch=25, xStretchPhase=true |
| Simple Z | column=28, row=15, tracking=5, lineSpace=5, typeX=20, typeY=40, speed=-4, xOffset=9.1, zWave=90, xRotCamera=33, yRotCamera=-27, zRotCamera=24 |
| Complex Z | column=38, row=10, tracking=5, lineSpace=6, typeX=8, typeY=21, typeStroke=0.9, speed=2, xOffset=4.1, yOffset=3.1, zWave=41, xWave=63, yWave=25, yWavezRot=22, xRotCamera=26, yRotCamera=-39, zRotCamera=15, zoomCamera=200, yWavePhase=true |
| Zebra | column=50, row=8, tracking=7, lineSpace=18.5, typeX=6, typeY=20, typeStroke=1, speed=-4, xOffset=6.1, yOffset=5.1, yWave=33, yWavezRot=18, yStretch=35 |
| Harlequin | column=40, row=7, tracking=5, lineSpace=11, typeX=9, typeY=19, typeStroke=1.1, speed=2, xOffset=2.1, yOffset=59.1, yStretch=58 |

## Implementation boundary

- Workbench uses Canvas2D projection and the source vector keyboard paths; reference uses p5 WEBGL. Projection, surface rendering, and antialiasing still differ.
- The reference text is not copied; an original neutral sample of similar length is provided. Workbench Full Text defaults off to match the actual initial `draw()` branch rather than the source checkbox's inconsistent checked appearance. All source range controls, phase toggles, five editable source palette colors, background, Full Text mode, PRIDE behavior, and source presets are exposed through Workbench Parameters.
- The source hides some state in preset callbacks rather than sliders; those retained phase and palette states are kept separate from numeric parameter values.
- The source glyph engine retains its CC BY-NC-SA 4.0 notice and bundled license. The OTF retains OFL 1.1. Text is now editable in Parameters; the preview input is hidden. Updates retain the current animation time, and batched restore does not replay palette checkbox actions.
- Tested source viewport: 1440 x 900 and 390 x 844. The narrow page retains the same fixed UI positions and its preset controls extend beyond the viewport; the drawing canvas itself resizes to 390 x 844.
