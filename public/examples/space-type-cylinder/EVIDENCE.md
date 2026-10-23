# Cylinder source audit

- Reference: https://spacetypegenerator.com/
- Retrieved: 2026-10-23
- Live browser check: Chrome, 1440 x 900, current root route; 23 navigation links are present, with `/` selected as CYLINDER.
- Loaded source: `https://spacetypegenerator.com/sketch.js`, `https://spacetypegenerator.com/keyboardEngine_190103.js`, `https://spacetypegenerator.com/style.css`, p5.js 1.0.0 from cdnjs, and `assets/IBMPlexMono-Regular.otf`.
- License notice in both JavaScript files: CC BY-NC-SA 4.0. The source code and font are not copied into this study.

## Evidence ledger

| Finding | Status | Evidence |
| --- | --- | --- |
| The root route is the Cylinder study and creates one full-window WEBGL canvas. | confirmed | Live DOM and `sketch.js` `setup()` (`createCanvas(windowWidth, windowHeight, WEBGL)`). |
| The text input is `#textfield`; its observed initial value is `I-TRY-ALL-THINGS;-I-ACHIEVE-WHAT-I-CAN.//`. | confirmed | Live DOM and `index.html`; `draw()` reads `String(inp.value())` every frame. |
| There are 21 range controls, two color pickers, a `PRIDE!` action, and seven preset buttons. | confirmed | Live DOM and `sketch.js` `setup()`; the canvas paints the control labels in `draw()`. |
| Ring angle is `ringSpot * (2π / text.length)`; the layer index is `floor(i / text.length)`. | confirmed | `sketch.js` `draw()` loop. |
| Layer height is `(typeY + strecherYsize / 2) + 5 + stackHeightAdjust`; each layer rotates by `rOffset`; the complete cylinder rotates by `frameCount * (rRotate / 1000)`. | confirmed | `sketch.js` `draw()` transform chain. |
| Wave phase is `2π / text.length * rWaveCount`; frame phase is `frameCount * (rWaveSpeed / 1000)`. Layer parity offsets the Y stretch wave by π. | confirmed | `sketch.js` `draw()` before and inside the character loop. |
| `rLong` varies by layer and changes radial position; `rZaxis` and `rWave` vary by character and displace the glyph on separate axes. X/Y stretch and X/Y/Z glyph tweaks are also computed in the source loop. | confirmed | `sketch.js` per-character transform chain. |
| Each glyph is drawn twice: the outer stroke and a second stroke translated by z = -1 for the inner/back surface. | confirmed | `sketch.js` calls `keyboardEngine()` on both surfaces. |
| `PRIDE!` sets stack count to 6, switches `inpNumber` to 6, and selects six layer colors. It is an action, not a reversible source toggle. | confirmed | Live DOM interaction and `sketch.js` `pride()`. A reversible Workbench boolean is a deliberate usability adaptation. |
| Presets call `reSetting()` then assign the values below. `reSetting()` resets sliders and `stackHeightAdjust`, but does not reset `inpNumber`. | confirmed | Live DOM slider values after clicking each preset and `sketch.js` preset functions. |
| The reference glyph engine is a custom vector keyboard engine; it is not ordinary font text. | confirmed | Loaded `keyboardEngine_190103.js` dispatches characters to individual path functions. |
| Reproducing the exact proprietary OTF glyph contours without bundling the referenced font/source code. | unknown / omitted | The study uses a local system font and documents the resulting glyph-shape difference. |

## Reference parameter map

The following controls are in source order. Defaults and ranges are read from the loaded `createSlider()` declarations; the visible labels are painted by `draw()`.

| Parameter | Label | Default | Range | Step |
| --- | --- | ---: | ---: | ---: |
| `radius` | Cylinder radius | 250 | 0..1000 | 1 |
| `stackNum` | Cylinder count | 1 | 1..30 | 1 |
| `rRotate` | Cylinder rotate | -5 | -100..100 | 1 |
| `rOffset` | Cylinder offset | 0 | 0..π/2 | 0.01 |
| `rWaveCount` | Wave count | 2 | 0..10 | 1 |
| `rWaveSpeed` | Wave speed | 0 | 0..100 | 1 |
| `rWave` | Wave latitude | 0 | 0..200 | 1 |
| `rLong` | Wave longitude | 0 | 0..80 | 1 |
| `rZaxis` | Wave ripple | 0 | 0..100 | 1 |
| `strecherXsize` | Wave X-scale | 0 | 0..80 | 1 |
| `strecherYsize` | Wave Y-scale | 0 | 0..100 | 1 |
| `typeX` | Type X-scale | 20 | 0..100 | 1 |
| `typeY` | Type Y-scale | 40 | 0..100 | 1 |
| `typeStroke` | Type weight | 2 | 0..10 | 0.1 |
| `xRotTweak` | Tweak X rotation | 0 | 0..45 | 1 |
| `yRotTweak` | Tweak Y rotation | 0 | 0..45 | 1 |
| `zRotTweak` | Tweak Z rotation | 0 | 0..45 | 1 |
| `xRotCamera` | Camera X-rotation | 15 | -180..180 | 1 |
| `yRotCamera` | Camera Y-rotation | 0 | -180..180 | 1 |
| `zRotCamera` | Camera Z-rotation | 0 | -180..180 | 1 |
| `zoomCamera` | Camera zoom | 0 | -500..500 | 1 |

## Source preset values

Unlisted values remain at the `reSetting()` defaults shown above.

| Preset | Overrides |
| --- | --- |
| Simple | radius=185, stackNum=8, rRotate=-10, rOffset=0.2, rWaveSpeed=75, rWave=41, xRotTweak=24, yRotTweak=27, xRotCamera=20 |
| Jellyfish | radius=200, stackNum=6, rOffset=0.15, rWaveCount=3, rWaveSpeed=100, rLong=80, strecherXsize=23, typeX=13, typeY=64, typeStroke=0.5, xRotCamera=25 |
| Crown | stackNum=3, rRotate=-5, rWaveCount=4, rWaveSpeed=50, rZaxis=21, strecherYsize=76, typeX=30, typeStroke=3, zoomCamera=-500. The source attempts `strecherXsize=-25`, but the live range clamps it to 0 because its minimum is 0. |
| Complex | radius=178, stackNum=11, rRotate=0, rOffset=0.16, rWaveCount=6, rWaveSpeed=75, rWave=10, rLong=31, typeX=16, typeY=40, typeStroke=2, xRotTweak=15, yRotTweak=35, xRotCamera=-34, yRotCamera=10, zRotCamera=25 |
| Weave | stackHeightAdjust=30, radius=110, stackNum=7, rRotate=15, rOffset=0.62, rWaveCount=5, rWaveSpeed=30, rZaxis=15, typeX=12, typeY=19, typeStroke=1, zRotTweak=33, xRotCamera=15 |
| Zebra | stackHeightAdjust=10, radius=110, stackNum=7, rRotate=20, rOffset=0.3, rWaveCount=2, rWaveSpeed=30, rWave=15, rZaxis=15, strecherYsize=33, typeX=12, typeY=19, typeStroke=1, xRotTweak=9, yRotTweak=24, zRotTweak=22, xRotCamera=15 |
| Hoops | stackHeightAdjust=30, radius=110, stackNum=7, rRotate=15, rOffset=0.62, rWaveCount=1, rWaveSpeed=100, rZaxis=58, typeX=12, typeY=19, typeStroke=1.5, zRotTweak=28, xRotCamera=-10 |

## Implementation boundary

- This study implements the confirmed cylinder/layer/wave/camera dataflow with Canvas2D projection so it runs inside Workbench's existing HTML project sandbox. The reference uses p5 WEBGL; projection and antialiasing will therefore differ.
- The reference draws its own vector glyphs from `keyboardEngine_190103.js` and loads IBM Plex Mono. This project does not copy either asset; the local system monospace glyph contours are an explicit approximation.
- The original visible preset buttons are represented as a Parameters-panel select. Preset changes are synchronized back to the Workbench parameter model so the displayed controls match the active values.
- The text remains an editable textarea in the preview because Workbench HTML parameters currently support number, boolean, color, and select values, but not free-form text.
- Browser comparison target: 1440 x 900. The live reference was also inspected at 390 x 844; it keeps the fixed-position controls and full-window canvas and does not switch to a separate mobile layout.
