// Shared GLSL. Shaders live in template literals with no include mechanism, so
// anything two passes both need gets interpolated in from here.

// Recursive Bayer. bayer8 in [0,1) without a 64-entry lookup table. Used by the
// composite for its three dithers and by the card pass for the entry reveal —
// the same grid, so a card arrives on the cells it will later dissolve on.
export const bayerGLSL = /* glsl */ `
  float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
  }
  #define bayer4(a) (bayer2(0.5 * (a)) * 0.25 + bayer2(a))
  #define bayer8(a) (bayer4(0.5 * (a)) * 0.25 + bayer2(a))
`;

// The entry reveal: a card is absent, then materializes out from its own centre
// as a growing disc whose edge is broken up cell by cell against the Bayer
// threshold. It's a mask on presence, not a fade — a cell is either the image
// at full strength or nothing at all, which is what keeps the arrival from
// reading as an opacity ramp.
//
// The visible pass and the card buffer both include this so a card is picked
// exactly where it's drawn, and so the composite's entry channel stops at the
// same edge. uEntry is 1 for absent and 0 for arrived, matching the dim and
// hover channels either side of it.
//
// Cells are measured in device pixels off gl_FragCoord rather than in uv, so
// the grain is the same size on every card whatever depth it sits at — in uv it
// would shrink with the card and the far side of the helix would arrive on a
// pattern too fine to read.
export const revealGLSL = /* glsl */ `
  uniform float uEntry;
  uniform float uEntryScale;
  uniform float uEntrySoftness;
  uniform float uEntryAspect;

  bool entryHidden(vec2 uv) {
    if (uEntry <= 0.0) return false;

    // Aspect-corrected so the front is a circle on the card rather than an
    // ellipse stretched by its 2:1 shape, then normalized against the distance
    // to a corner so 1 is "reaches everywhere".
    vec2 offset = (uv - 0.5) * vec2(uEntryAspect, 1.0);
    float d = length(offset) / length(vec2(uEntryAspect, 1.0) * 0.5);

    // Overshoots by the softness so the front has somewhere to finish: at full
    // progress even a corner cell is a whole softness inside the edge, which is
    // what guarantees the card is solid the moment the arrival ends.
    float soft = max(uEntrySoftness, 0.001);
    float front = (1.0 - uEntry) * (1.0 + soft);
    float t = (front - d) / soft;

    return t <= bayer8(gl_FragCoord.xy / uEntryScale);
  }
`;
