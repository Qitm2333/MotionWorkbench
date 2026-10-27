import * as THREE from "three";
import { standaloneVertex as fullscreenVertex } from "./shaders/standalone.js";
import { trailFragment } from "./shaders/trail.js";

// How long the pointer sits still before the idle animation takes over. Much
// longer than trailIdleDelay on purpose — that one means "you stopped", this
// one means "you've gone".
const DRIFT_DELAY = 2500;

// Signed velocity rides in gb, so this can't be an 8-bit target.
const TARGET_OPTIONS = {
  type: THREE.HalfFloatType,
  format: THREE.RGBAFormat,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  depthBuffer: false,
  stencilBuffer: false,
  generateMipmaps: false,
};

// A cursor trail painted into a persistent buffer that the composite reads.
// It's its own pass rather than something the composite derives, because the
// trail has to remember — each frame is the last one decayed and smeared plus a
// stroke along the segment the cursor covered, and no single frame's state can
// reconstruct that.
export function createTrail(renderer, canvas, config) {
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);

  const material = new THREE.ShaderMaterial({
    vertexShader: fullscreenVertex,
    fragmentShader: trailFragment,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uPrev: { value: null },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uPrevMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uVelocity: { value: new THREE.Vector2() },
      uTexel: { value: new THREE.Vector2() },
      uSize: { value: new THREE.Vector2(1, 1) },
      uRadius: { value: config.trailRadius },
      uDecay: { value: config.trailDecay },
      uDissipate: { value: config.trailDissipate },
      uActive: { value: 0 },
    },
  });

  const quad = new THREE.Mesh(geometry, material);
  quad.frustumCulled = false;
  scene.add(quad);

  let read = new THREE.WebGLRenderTarget(1, 1, TARGET_OPTIONS);
  let write = new THREE.WebGLRenderTarget(1, 1, TARGET_OPTIONS);

  let width = 1;
  let height = 1;

  function setSize(w, h, pixelRatio) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    material.uniforms.uSize.value.set(width, height);

    // Half resolution is plenty for a soft mask and keeps the ping-pong cheap.
    const tw = Math.max(1, Math.round((width * pixelRatio) / 2));
    const th = Math.max(1, Math.round((height * pixelRatio) / 2));
    read.setSize(tw, th);
    write.setSize(tw, th);
    material.uniforms.uTexel.value.set(1 / tw, 1 / th);
  }

  // --- pointer --------------------------------------------------------------
  const target = new THREE.Vector2(0.5, 0.5);
  const current = new THREE.Vector2(0.5, 0.5);
  const previous = new THREE.Vector2(0.5, 0.5);
  const velocity = new THREE.Vector2();

  let hasPointer = false;
  let lastMove = -Infinity;

  // On window, not the canvas. Listening on the element freezes the coordinates
  // the moment the cursor crosses its edge, so the trail stops dead at the
  // border instead of carrying on out of frame. Off-canvas positions land
  // outside 0..1 and the brush slides away cleanly.
  const onPointerMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    target.set(
      (event.clientX - rect.left) / rect.width,
      // Flipped to match GL's bottom-left origin, so the composite can sample
      // this with its own uv and not flip again.
      1 - (event.clientY - rect.top) / rect.height
    );

    if (!hasPointer) {
      // Jump on the first sample, or the trail whips in from centre screen.
      hasPointer = true;
      current.copy(target);
      previous.copy(target);
    }

    lastMove = performance.now();
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerMove, { passive: true });

  let speed = 0;
  let idleness = 0;
  let lastTime = performance.now();

  function update() {
    const now = performance.now();
    // Clamped so a backgrounded tab does not resume with one enormous step.
    const dt = Math.min((now - lastTime) / 1000, 1 / 20);
    lastTime = now;

    const still = now - lastMove;

    // With no pointer activity, drift a virtual cursor so the effect is visible
    // on load and on touch devices.
    const drifting = config.trailIdleDrift && still > DRIFT_DELAY;
    if (drifting) {
      const t = now * 0.00035;
      target.set(
        0.5 + Math.sin(t * 1.3) * 0.28 + Math.sin(t * 0.7) * 0.08,
        0.5 + Math.cos(t * 0.9) * 0.22 + Math.cos(t * 1.7) * 0.06
      );
    }

    // Stop painting and clear out once the pointer goes still. Ramped in rather
    // than switched so the fade picks up speed instead of visibly changing
    // gear, but dropped to zero the instant the pointer moves — easing out of
    // idle as well would swallow the first tenth of a second of every new
    // stroke, which just reads as the trail failing to keep up.
    const idling = !drifting && still > config.trailIdleDelay;
    idleness = idling
      ? idleness + (1 - idleness) * (1 - Math.pow(0.85, dt * 60))
      : 0;

    previous.copy(current);
    // Frame-rate independent, authored against 60fps.
    current.lerp(target, 1 - Math.pow(1 - config.trailSmoothing, dt * 60));

    velocity.subVectors(current, previous).multiplyScalar(9).clampLength(0, 1);

    // Client pixels per frame. Scaling the uv delta back up by the canvas size
    // recovers the real pointer delta, so the reading doesn't shift with the
    // viewport's shape.
    const speedPx = Math.hypot(
      (current.x - previous.x) * width,
      (current.y - previous.y) * height
    );
    const reach = Math.min(speedPx / Math.max(config.trailSpeedRange, 0.01), 1);
    // Smoothed, or bursty pointer events make the brush flicker.
    speed += (reach - speed) * (1 - Math.pow(0.75, dt * 60));

    const live = drifting || hasPointer ? 1 : 0;
    // At influence 1 a parked cursor paints nothing and the trail decays out;
    // at 0 the brush ignores speed entirely.
    const speedFactor =
      1 - config.trailSpeedInfluence + config.trailSpeedInfluence * speed;

    const u = material.uniforms;
    u.uMouse.value.copy(current);
    u.uPrevMouse.value.copy(previous);
    u.uVelocity.value.copy(velocity);
    // Idleness gates the brush as well as driving the decay below. Without it
    // any speed influence under 1 keeps painting under a parked cursor, and the
    // stroke laid down each frame is exactly what the decay is trying to
    // remove — so the blob under the cursor never clears at all.
    u.uActive.value =
      live * speedFactor * (1 - idleness) * (config.trail ? 1 : 0);
    // Floored at 1px, since a zero radius makes the smoothstep degenerate.
    u.uRadius.value = Math.max(1, config.trailRadius * speedFactor);
    u.uDissipate.value = config.trailDissipate;
    // Frame-rate independent, authored against 60fps. Decay is exponential and
    // never truly reaches zero, so leaning toward the much steeper idle rate is
    // what gives the trail a definite end instead of a smear that sits there
    // for a second after you stop.
    const decay =
      config.trailDecay +
      (config.trailIdleDecay - config.trailDecay) * idleness;
    u.uDecay.value = Math.pow(decay, dt * 60);
    u.uPrev.value = read.texture;

    renderer.setRenderTarget(write);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    const swap = read;
    read = write;
    write = swap;

    return read.texture;
  }

  function dispose() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerdown", onPointerMove);
    read.dispose();
    write.dispose();
    geometry.dispose();
    material.dispose();
  }

  return { setSize, update, dispose };
}
