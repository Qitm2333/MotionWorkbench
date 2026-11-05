import { paintFrame } from "./core.js";
import { frameBraid } from "./braid.js";
import { frameGlobe, frameRubik, frameWave } from "./lattice.js";
import { frameMorph } from "./morph.js";
import { frameOrbits } from "./orbits.js";
import { frameRibbon } from "./ribbon.js";
import { frameWeb } from "./web.js";
const MODE_FRAMES = {
  orbits: frameOrbits,
  globe: frameGlobe,
  rubik: frameRubik,
  wave: frameWave,
  web: frameWeb,
  braid: frameBraid,
  ribbon: frameRibbon,
  // ring shares ribbon's geometry — the `faceOn` profile flag switches it
  ring: frameRibbon,
  morph: frameMorph
};
const MODE_DRAWS = Object.fromEntries(
  Object.entries(MODE_FRAMES).map(([key, frame]) => [
    key,
    ((ctx, size, t, dark, opts) => paintFrame(ctx, frame(size, t, opts), dark))
  ])
);
export {
  MODE_DRAWS,
  MODE_FRAMES
};
