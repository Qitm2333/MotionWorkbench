import * as THREE from "three";
import {
  standaloneBlurFragment,
  standaloneCompositeFragment,
  standaloneImageFragment,
  standaloneImageVertex,
  standaloneVertex,
} from "./shaders/standalone.js";
import { createTrail } from "./trail.js";
import { hexToSRGB } from "./color.js";

const BLUR_LEVELS = 4;

export const standaloneDefaults = {
  imageScale: 0.78,
  streakAngle: 90,
  streakSpread: 4.5,
  streakAnisotropy: 0,
  trail: true,
  trailBlur: 0.68,
  trailCurl: 0.055,
  trailLift: 0.018,
  paperSlope: 13,
  paperHighlight: 0.42,
  paperShadow: 0.48,
  meshLift: 0.2,
  meshCurl: 0.16,
  meshDrag: 0.18,
  trailRadius: 112,
  trailSpeedInfluence: 0.7,
  trailSpeedRange: 5,
  trailDecay: 0.962,
  trailDissipate: 2.2,
  trailSmoothing: 0.32,
  trailIdleDelay: 220,
  trailIdleDecay: 0.869,
  trailIdleDrift: false,
  trailAmount: 0.48,
  trailCutoff: 0.125,
  trailWarp: 0.36,
  trailContrast: 0.95,
  trailScale: 8.5,
  trailLevels: 6,
  trailDissolve: 1,
  trailInk: "#1a1a1a",
  trailAccent: "#ffffff",
  trailPaper: "#000000",
  trailGamma: 2,
  trailMono: 0.29,
};

function createTarget(width = 1, height = 1) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });

  target.texture.generateMipmaps = false;
  target.texture.wrapS = THREE.ClampToEdgeWrapping;
  target.texture.wrapT = THREE.ClampToEdgeWrapping;
  return target;
}

export function createIcePaperWake(
  canvas,
  { imageUrl = "/artwork.jpg", onReady, config: configOverrides = {} } = {}
) {
  const config = { ...standaloneDefaults, ...configOverrides };
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
  });

  renderer.setClearColor(0x000000, 1);
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  const trail = createTrail(renderer, canvas, config);

  const imageScene = new THREE.Scene();
  const postScene = new THREE.Scene();
  const camera = new THREE.Camera();
  const imageGeometry = new THREE.PlaneGeometry(2, 2, 80, 68);
  const postGeometry = new THREE.PlaneGeometry(2, 2);

  const imageMaterial = new THREE.ShaderMaterial({
    vertexShader: standaloneImageVertex,
    fragmentShader: standaloneImageFragment,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uMap: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uImageAspect: { value: 16 / 9 },
      uImageScale: { value: config.imageScale },
      uTrail: { value: null },
      uTrailCutoff: { value: config.trailCutoff },
      uMeshLift: { value: config.meshLift },
      uMeshCurl: { value: config.meshCurl },
      uMeshDrag: { value: config.meshDrag },
    },
  });

  const blurMaterial = new THREE.ShaderMaterial({
    vertexShader: standaloneVertex,
    fragmentShader: standaloneBlurFragment,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uMap: { value: null },
      uTexel: { value: new THREE.Vector2(1, 1) },
      uDirection: { value: new THREE.Vector2(0, 1) },
      uSpread: { value: config.streakSpread },
    },
  });

  const compositeMaterial = new THREE.ShaderMaterial({
    vertexShader: standaloneVertex,
    fragmentShader: standaloneCompositeFragment,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uScene: { value: null },
      uBlur1: { value: null },
      uBlur2: { value: null },
      uBlur3: { value: null },
      uBlur4: { value: null },
      uTrail: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTrailBlur: { value: config.trailBlur },
      uTrailCurl: { value: config.trailCurl },
      uTrailLift: { value: config.trailLift },
      uPaperSlope: { value: config.paperSlope },
      uPaperHighlight: { value: config.paperHighlight },
      uPaperShadow: { value: config.paperShadow },
      uTrailAmount: { value: config.trailAmount },
      uTrailCutoff: { value: config.trailCutoff },
      uTrailWarp: { value: config.trailWarp },
      uTrailContrast: { value: config.trailContrast },
      uTrailScale: { value: config.trailScale },
      uTrailLevels: { value: config.trailLevels },
      uTrailDissolve: { value: config.trailDissolve },
      uTrailInk: { value: hexToSRGB(config.trailInk) },
      uTrailAccent: { value: hexToSRGB(config.trailAccent) },
      uTrailPaper: { value: hexToSRGB(config.trailPaper) },
      uTrailGamma: { value: config.trailGamma },
      uTrailMono: { value: config.trailMono },
    },
  });

  const imageQuad = new THREE.Mesh(imageGeometry, imageMaterial);
  imageQuad.frustumCulled = false;
  imageScene.add(imageQuad);

  const postQuad = new THREE.Mesh(postGeometry, blurMaterial);
  postQuad.frustumCulled = false;
  postScene.add(postQuad);

  const sceneTarget = createTarget();
  let blurTargets = [];
  let scratchTargets = [];
  const drawingSize = new THREE.Vector2();

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    renderer.setSize(width, height, false);
    renderer.getDrawingBufferSize(drawingSize);

    const physicalWidth = Math.max(1, Math.floor(drawingSize.x));
    const physicalHeight = Math.max(1, Math.floor(drawingSize.y));
    sceneTarget.setSize(physicalWidth, physicalHeight);

    imageMaterial.uniforms.uResolution.value.set(physicalWidth, physicalHeight);
    compositeMaterial.uniforms.uResolution.value.set(
      physicalWidth,
      physicalHeight
    );

    [...blurTargets, ...scratchTargets].forEach((target) => target.dispose());
    blurTargets = [];
    scratchTargets = [];

    let levelWidth = physicalWidth;
    let levelHeight = physicalHeight;

    for (let level = 0; level < BLUR_LEVELS; level += 1) {
      levelWidth = Math.max(1, Math.floor(levelWidth / 2));
      levelHeight = Math.max(1, Math.floor(levelHeight / 2));
      blurTargets.push(createTarget(levelWidth, levelHeight));
      scratchTargets.push(createTarget(levelWidth, levelHeight));
    }

    compositeMaterial.uniforms.uScene.value = sceneTarget.texture;
    compositeMaterial.uniforms.uBlur1.value = blurTargets[0].texture;
    compositeMaterial.uniforms.uBlur2.value = blurTargets[1].texture;
    compositeMaterial.uniforms.uBlur3.value = blurTargets[2].texture;
    compositeMaterial.uniforms.uBlur4.value = blurTargets[3].texture;
    trail.setSize(width, height, pixelRatio);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const along = new THREE.Vector2();
  const across = new THREE.Vector2();

  function blurPass(source, target, direction, spread) {
    const uniforms = blurMaterial.uniforms;
    uniforms.uMap.value = source.texture;
    uniforms.uTexel.value.set(1 / target.width, 1 / target.height);
    uniforms.uDirection.value.copy(direction);
    uniforms.uSpread.value = spread;
    postQuad.material = blurMaterial;
    renderer.setRenderTarget(target);
    renderer.render(postScene, camera);
  }

  function render() {
    const imageUniforms = imageMaterial.uniforms;
    imageUniforms.uImageScale.value = config.imageScale;
    imageUniforms.uTrailCutoff.value = config.trailCutoff;
    imageUniforms.uMeshLift.value = config.meshLift;
    imageUniforms.uMeshCurl.value = config.meshCurl;
    imageUniforms.uMeshDrag.value = config.meshDrag;
    const compositeUniforms = compositeMaterial.uniforms;
    for (const key of ["trailBlur", "trailCurl", "trailLift", "paperSlope", "paperHighlight", "paperShadow", "trailAmount", "trailCutoff", "trailWarp", "trailContrast", "trailScale", "trailLevels", "trailDissolve", "trailGamma", "trailMono"]) {
      compositeUniforms[`u${key[0].toUpperCase()}${key.slice(1)}`].value = config[key];
    }
    compositeUniforms.uTrailInk.value.copy(hexToSRGB(config.trailInk));
    compositeUniforms.uTrailAccent.value.copy(hexToSRGB(config.trailAccent));
    compositeUniforms.uTrailPaper.value.copy(hexToSRGB(config.trailPaper));
    canvas.dataset.paperCurl = String(config.trailCurl);
    const trailTexture = trail.update();
    compositeMaterial.uniforms.uTrail.value = trailTexture;
    imageMaterial.uniforms.uTrail.value = trailTexture;

    renderer.setRenderTarget(sceneTarget);
    renderer.clear();
    renderer.render(imageScene, camera);

    const radians = (config.streakAngle * Math.PI) / 180;
    along.set(Math.cos(radians), Math.sin(radians));
    across.set(-along.y, along.x);

    let source = sceneTarget;
    for (let level = 0; level < BLUR_LEVELS; level += 1) {
      blurPass(
        source,
        scratchTargets[level],
        along,
        config.streakSpread
      );
      blurPass(
        scratchTargets[level],
        blurTargets[level],
        across,
        config.streakSpread * config.streakAnisotropy
      );
      source = blurTargets[level];
    }

    postQuad.material = compositeMaterial;
    renderer.setRenderTarget(null);
    renderer.render(postScene, camera);
  }

  let animationFrame = 0;
  let disposed = false;
  let texture = null;

  function frame() {
    if (disposed) return;
    render();
    canvas.dataset.renderReady = "true";
    animationFrame = requestAnimationFrame(frame);
  }

  const loader = new THREE.TextureLoader();
  loader.load(
    imageUrl,
    (loadedTexture) => {
      if (disposed) {
        loadedTexture.dispose();
        return;
      }

      texture = loadedTexture;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      const image = texture.image;
      imageMaterial.uniforms.uMap.value = texture;
      imageMaterial.uniforms.uImageAspect.value = image.width / image.height;
      onReady?.();
      frame();
    },
    undefined,
    (error) => {
      console.error("Unable to load standalone dither image", error);
    }
  );

  function dispose() {
    disposed = true;
    delete canvas.dataset.renderReady;
    cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();

    texture?.dispose();
    trail.dispose();
    sceneTarget.dispose();
    [...blurTargets, ...scratchTargets].forEach((target) => target.dispose());
    imageGeometry.dispose();
    postGeometry.dispose();
    imageMaterial.dispose();
    blurMaterial.dispose();
    compositeMaterial.dispose();
    renderer.dispose();
  }

  return { config, dispose };
}
