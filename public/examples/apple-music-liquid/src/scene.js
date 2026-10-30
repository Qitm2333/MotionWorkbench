import { iconDome, wordmarkDome } from "./dome-data.js";
import { parseDome } from "./dome.js";
const DEFAULT_PARAMS = {
  dome: 1,
  ringWidth: 0.05,
  ringWavelength: 0,
  ringOffset: 0,
  ringSpeed: 0,
  rippleWavelength: 0.055,
  rippleSpeed: 0.4,
  rippleReach: 0.9,
  depth: 1,
  iorOil: 1.47,
  dispersion: 16,
  dispersionKnee: 0,
  maxSlope: 0,
  wavelengths: 12,
  defocus: 0.05,
  blur: 0,
  reflect: 1,
  reveal: 1,
  revealSoft: 0.06,
  softbox: 20,
  horizon: 6,
  ringLight: 0,
  ringLightWidth: 0.45,
  exposure: 1,
  logoColor: [0.93, 0.95, 1],
  floorColor: [12e-4, 14e-4, 2e-3],
  bloom: 0.03,
  bloomRadius: 1,
  // the film has none: its held frames are perfectly still
  grain: 0,
  vignette: 0.25,
  // the film's grade: richer colour than the oil gives on its own, and crushed blacks
  saturation: 1.5,
  black: 0.012,
  // the film's glows and soft edges are blue, its whites slightly cool
  glowTint: [0.55, 0.75, 1.35],
  balance: [0.97, 1, 1.03],
  shutter: 0.5,
  // enough that fast smears blur rather than stutter
  subframes: 8
};
function shotAt(film, t) {
  return film.shots.find((s) => t >= s.start && t < s.end) ?? film.shots.at(-1);
}
function paramsFor(shot) {
  return { ...DEFAULT_PARAMS, ...shot.params };
}
const APPLE_MUSIC = {
  name: "apple-music",
  duration: 4,
  fps: 24e3 / 1001,
  aspect: 16 / 9,
  shots: [
    {
      name: "icon",
      start: 0,
      end: 1.465,
      // the new note, traced from the settled frame at 1.24 s (camera zoom 0.973 there)
      logo: {
        src: "apple/note.svg",
        mode: "alpha",
        center: [-0.0143, -38e-4],
        width: 263 / 540 / 0.973
      },
      // a bubble that grows into the icon's rounded square, magnifying the note, then settles
      // into a flat top with a steep rim that smears the note's flag and head into the corners,
      // and falls to a thin layer whose rim outlines the tile
      dome: parseDome(iconDome),
      ball: null,
      // the film's first bubble brightens over its first six frames
      fade: [
        [0.04, 0],
        [0.25, 1]
      ],
      // the small early dome's rim carries only thin colour in the film
      colour: [
        [0.1, 0.3],
        [0.21, 1]
      ],
      // a ripple runs just ahead of the bubble's rim while it grows; then a wave of displaced oil
      // leaves the tile's edge (0.55-1 s), travelling outward at about 0.5 units/s and fading,
      // its flanks catching the side lights (measured off the film's outer lines)
      ring: [
        [0.1, 0],
        [0.2, 0.012],
        [0.3, 8e-3],
        [0.42, 0],
        [0.5, 0],
        [0.62, 0.012],
        [0.85, 8e-3],
        [1, 0]
      ],
      ringReach: [
        [0.1, 0.05],
        [0.42, 0.05],
        [0.55, 0.03],
        [0.63, 0.07],
        [0.8, 0.16],
        [1, 0.26]
      ],
      // the camera holds; from 1.2 s the note recedes into the dark, accelerating into the cut,
      // while the tile's outline keeps its size and fades (measured off the note's size)
      zoom: [[0, 1]],
      recede: [
        [1.2, 1],
        [1.24, 0.973],
        [1.273, 0.926],
        [1.307, 0.87],
        [1.34, 0.814],
        [1.373, 0.743],
        [1.407, 0.612],
        [1.44, 0.426],
        [1.465, 0.3]
      ],
      // colour gathers on the steep rim, as in the film, where the smears of the note's flag and head
      // carry it while the magnified interior stays clean; the studio's key light barely shows in
      // the film's oil
      params: {
        dispersion: 100,
        dispersionKnee: 0.9,
        maxSlope: 1.4,
        softbox: 4,
        ringWidth: 0.02,
        // the fitted dome a little lower: the registration over-reads the smears' width, and 0.9
        // brings the lit area, colour and sharpness closest to the film's (by the scorecard)
        dome: 0.9
      }
    },
    {
      name: "wordmark",
      start: 1.465,
      end: 4,
      logo: {
        src: "apple/wordmark.svg",
        mode: "alpha",
        center: [(960 - 960) / 540, -(534.5 - 540) / 540],
        width: 588 / 540
      },
      // an orb around the rig's chrome tip that widens and settles into a wide, low dome whose
      // soft rim lies on the wordmark's ends, smearing them outward, then falls flat
      dome: parseDome(wordmarkDome),
      // the echoes on the dome's edge (shot time = reel time - 1.465), from about 2.3 s as in the
      // film: gentle while the wide dome stands, so they bend only the wordmark's ends; then, as it
      // flattens and its edge pulls in, the copies of the ends that drift and fade by 3.08 s
      ring: [
        [0.7, 0],
        [0.9, 3e-3],
        [1, 3e-3],
        [1.2, 35e-4],
        [1.45, 25e-4],
        [1.62, 0]
      ],
      // the orb's rings, strongest as it appears
      ripple: { height: 5e-3, decay: 0.5 },
      // the rig's chrome tip stands in the orb's crown, then sinks out of sight as it widens
      ball: {
        radius: 0.065,
        lift: [
          [0.25, 0],
          [0.4, -0.2]
        ]
      },
      fade: [
        [0, 0.3],
        [0.035, 1]
      ],
      // the orb's rings are nearly white in the film; the smeared ends carry strong colour
      colour: [
        [0.375, 0.2],
        [0.58, 1]
      ],
      // the orb's ripples and round outline reflect the studio, fading from 1.7 s and nearly gone by
      // 1.9 s, as the film's round light does (measured off the band, frame by frame), leaving the
      // ripple only where it bends the wordmark's ends
      gloss: [
        [0.25, 1],
        [0.42, 0.1],
        [0.6, 0]
      ],
      zoom: [[0, 1]],
      params: {
        // the film's wordmark barely glows
        bloom: 0.012,
        ringWavelength: 0.06,
        ringWidth: 0.06,
        // the wave travels outward, so the echo bars keep moving as they fade
        ringSpeed: 0.08,
        // the film's key and walls barely show in this dome; a broad, soft ring light around the
        // lens draws the orb's ripples as rings all the way round, and its outline as a soft halo
        // (see gloss for how that fades)
        softbox: 2,
        horizon: 0.25,
        ringLight: 1.3,
        rippleWavelength: 0.08,
        dispersion: 60,
        dispersionKnee: 0.3
      }
    }
  ]
};
export {
  APPLE_MUSIC,
  DEFAULT_PARAMS,
  paramsFor,
  shotAt
};
