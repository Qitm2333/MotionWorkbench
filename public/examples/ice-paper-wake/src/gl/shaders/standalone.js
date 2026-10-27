import { bayerGLSL } from "./dither.js";

export const standaloneVertex = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const standaloneImageVertex = /* glsl */ `
  uniform sampler2D uTrail;
  uniform vec2 uResolution;
  uniform float uTrailCutoff;
  uniform float uMeshLift;
  uniform float uMeshCurl;
  uniform float uMeshDrag;

  varying vec2 vUv;
  varying float vPaperLift;
  varying float vFoldFacing;

  void main() {
    vUv = uv;

    vec4 trail = texture2D(uTrail, uv);
    float lift = smoothstep(uTrailCutoff, 0.82, trail.r);
    vec2 texel = vec2(5.0) / uResolution;
    float leftMask = texture2D(uTrail, uv - vec2(texel.x, 0.0)).r;
    float rightMask = texture2D(uTrail, uv + vec2(texel.x, 0.0)).r;
    float downMask = texture2D(uTrail, uv - vec2(0.0, texel.y)).r;
    float upMask = texture2D(uTrail, uv + vec2(0.0, texel.y)).r;
    vec2 gradient = vec2(
      rightMask - leftMask,
      upMask - downMask
    );

    vec2 velocityDirection = normalize(trail.gb + vec2(0.0001));
    vec2 foldDirection = normalize(gradient + vec2(0.0001));
    float arch = sin(lift * 3.14159265);

    vec3 paper = position;
    paper.xy += trail.gb * uMeshDrag * lift;
    paper.xy += foldDirection * uMeshCurl * arch;

    // Lower clip-space w locally to bring the raised patch toward the viewer.
    // Because the plane is subdivided, this changes the actual silhouette and
    // reads as a flexible sheet instead of a displaced texture sample.
    float perspective = max(0.72, 1.0 - arch * uMeshLift);
    vPaperLift = lift;
    vFoldFacing = dot(foldDirection, velocityDirection);
    gl_Position = vec4(paper.xy, 0.0, perspective);
  }
`;

export const standaloneImageFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uResolution;
  uniform float uImageAspect;
  uniform float uImageScale;

  varying vec2 vUv;
  varying float vPaperLift;
  varying float vFoldFacing;

  vec4 containedImage(vec2 uv) {
    float viewportAspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 imageUv = uv;
    float inside = 1.0;

    if (viewportAspect > uImageAspect) {
      float width = (uImageAspect / viewportAspect) * uImageScale;
      imageUv.x = (uv.x - 0.5) / width + 0.5;
      inside = step(abs(uv.x - 0.5), width * 0.5);
    } else {
      float height = (viewportAspect / uImageAspect) * uImageScale;
      imageUv.y = (uv.y - 0.5) / height + 0.5;
      inside = step(abs(uv.y - 0.5), height * 0.5);
    }

    if (viewportAspect > uImageAspect) {
      float height = uImageScale;
      imageUv.y = (uv.y - 0.5) / height + 0.5;
      inside *= step(abs(uv.y - 0.5), height * 0.5);
    } else {
      float width = uImageScale;
      imageUv.x = (uv.x - 0.5) / width + 0.5;
      inside *= step(abs(uv.x - 0.5), width * 0.5);
    }

    return vec4(texture2D(uMap, imageUv).rgb * inside, inside);
  }

  void main() {
    vec4 paper = containedImage(vUv);
    float raisedShade = mix(
      0.62,
      1.24,
      smoothstep(-0.85, 0.85, vFoldFacing)
    );
    paper.rgb *= mix(1.0, raisedShade, vPaperLift * 0.72);
    gl_FragColor = paper;
  }
`;

export const standaloneBlurFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uTexel;
  uniform vec2 uDirection;
  uniform float uSpread;

  varying vec2 vUv;

  void main() {
    vec2 stride = uDirection * uTexel * uSpread;
    vec4 sum = vec4(0.0);
    float total = 0.0;

    for (int i = -8; i <= 8; i++) {
      float fi = float(i);
      float weight = exp(-fi * fi / 18.0);
      sum += texture2D(uMap, vUv + stride * fi) * weight;
      total += weight;
    }

    gl_FragColor = sum / total;
  }
`;

export const standaloneCompositeFragment = /* glsl */ `
  uniform sampler2D uScene;
  uniform sampler2D uBlur1;
  uniform sampler2D uBlur2;
  uniform sampler2D uBlur3;
  uniform sampler2D uBlur4;
  uniform sampler2D uTrail;

  uniform vec2 uResolution;
  uniform float uTrailBlur;
  uniform float uTrailCurl;
  uniform float uTrailLift;
  uniform float uPaperSlope;
  uniform float uPaperHighlight;
  uniform float uPaperShadow;
  uniform float uTrailAmount;
  uniform float uTrailCutoff;
  uniform float uTrailWarp;
  uniform float uTrailContrast;
  uniform float uTrailScale;
  uniform float uTrailLevels;
  uniform float uTrailDissolve;
  uniform vec3 uTrailInk;
  uniform vec3 uTrailAccent;
  uniform vec3 uTrailPaper;
  uniform float uTrailGamma;
  uniform float uTrailMono;

  varying vec2 vUv;

  ${bayerGLSL}

  float luma(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
  }

  vec3 linearToSRGB(vec3 color) {
    return mix(
      color * 12.92,
      1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
      step(vec3(0.0031308), color)
    );
  }

  vec3 composed(vec2 uv, float level) {
    vec3 color = texture2D(uScene, uv).rgb;
    color = mix(color, texture2D(uBlur1, uv).rgb, clamp(level, 0.0, 1.0));
    color = mix(color, texture2D(uBlur2, uv).rgb, clamp(level - 1.0, 0.0, 1.0));
    color = mix(color, texture2D(uBlur3, uv).rgb, clamp(level - 2.0, 0.0, 1.0));
    color = mix(color, texture2D(uBlur4, uv).rgb, clamp(level - 3.0, 0.0, 1.0));
    return color;
  }

  vec2 cellUv(float cellSize, vec2 offset) {
    return (floor(gl_FragCoord.xy / cellSize) + 0.5)
      * cellSize / uResolution + offset;
  }

  struct Palette {
    vec3 ink;
    vec3 accent;
    vec3 paper;
    float gamma;
    float mono;
  };

  vec3 ramp(Palette palette, float tone) {
    return tone < 0.5
      ? mix(palette.ink, palette.accent, tone * 2.0)
      : mix(palette.accent, palette.paper, (tone - 0.5) * 2.0);
  }

  vec3 posterize(
    Palette palette,
    vec3 color,
    float threshold,
    float levels
  ) {
    float steps = max(levels - 1.0, 1.0);
    float tone = pow(clamp(luma(color), 0.0, 1.0), palette.gamma);
    vec3 toned = ramp(
      palette,
      floor(tone * steps + threshold) / steps
    );
    vec3 quantized = floor(color * steps + threshold) / steps;
    return mix(quantized, toned, palette.mono);
  }

  float ditherMask(float drive, float threshold, float dissolve) {
    return mix(drive, drive > threshold ? 1.0 : 0.0, dissolve);
  }

  vec3 grade(vec3 color, float amount) {
    return clamp(
      (color - 0.5) * (1.0 + uTrailContrast * amount) + 0.5,
      0.0,
      1.0
    );
  }

  void main() {
    vec4 trail = texture2D(uTrail, vUv);
    float presence = smoothstep(
      0.015,
      0.3,
      texture2D(uBlur1, vUv).a
    );
    float trailMask = clamp(trail.r, 0.0, 1.0) * presence;

    // A lifted sheet needs a fold, not only a translated sample. The trail
    // gradient supplies the fold normal; stored velocity decides which side is
    // the bright leading face and which side falls into self-shadow.
    vec2 trailTexel = 4.0 / uResolution;
    float trailLeft = texture2D(
      uTrail,
      vUv - vec2(trailTexel.x, 0.0)
    ).r;
    float trailRight = texture2D(
      uTrail,
      vUv + vec2(trailTexel.x, 0.0)
    ).r;
    float trailDown = texture2D(
      uTrail,
      vUv - vec2(0.0, trailTexel.y)
    ).r;
    float trailUp = texture2D(
      uTrail,
      vUv + vec2(0.0, trailTexel.y)
    ).r;
    vec2 trailGradient = vec2(
      trailRight - trailLeft,
      trailUp - trailDown
    );
    float foldEdge = smoothstep(0.018, 0.19, length(trailGradient));

    vec2 velocityDirection = normalize(trail.gb + vec2(0.0001));
    vec2 curlDirection = vec2(
      -velocityDirection.y,
      velocityDirection.x
    );
    vec2 foldDirection = normalize(trailGradient + vec2(0.0001));
    float foldCrest = sin(clamp(trailMask, 0.0, 1.0) * 3.14159265);

    vec2 push = trail.gb * uTrailWarp * trailMask;
    push += curlDirection * foldCrest * uTrailCurl;
    push += foldDirection * foldEdge * uTrailLift;
    float blurLevel = trailMask * uTrailBlur * 4.0;
    vec3 result = linearToSRGB(
      composed(vUv + push * 0.5, blurLevel)
    );

    // Ported from the source trail: velocity drags the photograph, while a
    // separate hard Bayer dissolve breaks the traveled segment into cells.
    float trailThreshold = bayer8(gl_FragCoord.xy / uTrailScale);
    float trailShaped =
      smoothstep(uTrailCutoff, 0.8, trailMask) * uTrailAmount;
    vec3 trailSource = linearToSRGB(
      composed(
        cellUv(uTrailScale, push),
        blurLevel
      )
    );
    trailSource = grade(trailSource, trailMask);
    Palette trailPalette = Palette(
      uTrailInk,
      uTrailAccent,
      uTrailPaper,
      uTrailGamma,
      uTrailMono
    );
    result = mix(
      result,
      posterize(
        trailPalette,
        trailSource,
        trailThreshold,
        uTrailLevels
      ),
      ditherMask(
        trailShaped,
        trailThreshold,
        uTrailDissolve
      )
    );

    // Moving highlight and occlusion bands provide the missing height cue.
    // They follow the fold normal, so reversing pointer direction also reverses
    // which face catches light instead of leaving a static glossy stripe.
    float facing = dot(foldDirection, velocityDirection);
    float leadingFace =
      foldEdge * smoothstep(-0.15, 0.85, facing) * trailMask;
    float trailingFace =
      foldEdge * smoothstep(-0.15, 0.85, -facing) * trailMask;
    vec3 paperNormal = normalize(vec3(
      -trailGradient * uPaperSlope,
      1.0
    ));
    float surfaceLight = clamp(
      dot(paperNormal, normalize(vec3(-0.42, 0.58, 0.7))),
      0.0,
      1.0
    );
    float liftedLight = mix(0.82, 1.16, surfaceLight);
    result *= mix(1.0, liftedLight, trailMask * 0.62);
    result *= 1.0 - trailingFace * uPaperShadow;
    result += vec3(1.0, 0.94, 0.98)
      * leadingFace * uPaperHighlight;

    gl_FragColor = vec4(result, 1.0);
  }
`;
