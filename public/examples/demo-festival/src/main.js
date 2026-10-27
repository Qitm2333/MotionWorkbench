(() => {
  const canvas = document.querySelector('#stage');
  const status = document.querySelector('#status');
  const definitions = {
    autoPlay: { type: 'boolean', label: 'Idle performance', default: true, group: 'Motion' },
    speed: { type: 'number', label: 'Timeline speed', default: 1, min: 0.1, max: 3, step: 0.05, group: 'Motion' },
    idleDelay: { type: 'number', label: 'Idle delay', default: 2.9, min: 0, max: 10, step: 0.1, group: 'Motion' },
    cycleInterval: { type: 'number', label: 'Idle interval', default: 8, min: 3.7, max: 20, step: 0.1, group: 'Motion' },
    pointerStrength: { type: 'number', label: 'Pointer influence', default: 1, min: 0, max: 2, step: 0.05, group: 'Interaction' },
    smoothing: { type: 'number', label: 'Pointer smoothing', default: 6, min: 1, max: 24, step: 1, group: 'Interaction' },
    globalWarp: { type: 'number', label: 'Global warp', default: 1, min: 0, max: 2, step: 0.05, group: 'Interaction' },
    gap: { type: 'number', label: 'Letter gap', default: 5, min: 0, max: 60, step: 1, group: 'Layout' },
    foreground: { type: 'color', label: 'Letters', default: '#ffffff', group: 'Appearance' },
    background: { type: 'color', label: 'Background', default: '#000000', group: 'Appearance' },
    inputMin: { type: 'number', label: 'Levels input min', default: 0.53, min: 0, max: 1, step: 0.001, group: 'Appearance' },
    midpoint: { type: 'number', label: 'Levels midpoint', default: 0.5, min: 0, max: 1, step: 0.001, group: 'Appearance' },
    inputMax: { type: 'number', label: 'Levels input max', default: 0.583, min: 0, max: 1, step: 0.001, group: 'Appearance' },
    outputMin: { type: 'number', label: 'Levels output min', default: 0, min: 0, max: 1, step: 0.001, group: 'Appearance' },
    outputMax: { type: 'number', label: 'Levels output max', default: 1, min: 0, max: 1, step: 0.001, group: 'Appearance' },
    antialiasing: { type: 'boolean', label: 'Source FXAA', default: true, group: 'Rendering' },
    pixelRatio: { type: 'number', label: 'Pixel ratio limit', default: 2, min: 0.5, max: 2, step: 0.25, group: 'Rendering' },
  };
  const params = window.workbench?.params?.define?.(definitions)
    || Object.fromEntries(Object.entries(definitions).map(([id, definition]) => [id, definition.default]));
  const motion = window.DemoFestivalMotion.createMotion();
  let renderer = null;
  let lastTime = performance.now();
  let frameHandle = 0;
  let touchPointer = null;

  function loadImage(path) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load ${path}`));
      image.src = path;
    });
  }

  function resize() {
    if (!renderer) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, Math.max(0.5, Number(params.pixelRatio)));
    renderer.resize(Math.max(1, Math.round(rect.width * ratio)), Math.max(1, Math.round(rect.height * ratio)));
  }

  function pointer(event) {
    if (event.pointerType === 'touch' && event.pointerId !== touchPointer) return;
    const rect = canvas.getBoundingClientRect();
    motion.move((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
  }

  function animate(now) {
    const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (renderer) renderer.render(motion.update(delta, params), params);
    frameHandle = requestAnimationFrame(animate);
  }

  function reset() {
    motion.reset();
    lastTime = performance.now();
  }

  canvas.addEventListener('pointermove', pointer);
  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') touchPointer = event.pointerId;
    canvas.setPointerCapture?.(event.pointerId);
    pointer(event);
  });
  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerId === touchPointer) touchPointer = null;
  });
  canvas.addEventListener('pointercancel', (event) => {
    if (event.pointerId === touchPointer) touchPointer = null;
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(frameHandle);
    status.textContent = 'WebGL context lost. Reset the preview to restore it.';
  });
  window.addEventListener('resize', resize);
  document.addEventListener('workbench:params', (event) => {
    Object.assign(params, event.detail);
    if (Number(params.inputMax) <= Number(params.inputMin)) params.inputMax = Math.min(1, Number(params.inputMin) + 0.001);
    resize();
  });
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'workbench-reset') reset();
  });

  Promise.all(['d', 'e', 'm', 'o'].map(async (letter) => [letter, await loadImage(`./assets/${letter}.webp`)]))
    .then((entries) => {
      renderer = window.DemoFestivalRenderer.createRenderer(canvas, Object.fromEntries(entries));
      resize();
      reset();
      status.textContent = '';
      frameHandle = requestAnimationFrame(animate);
    })
    .catch((error) => {
      status.textContent = error.message;
      console.error(error);
    });

  window.addEventListener('pagehide', () => cancelAnimationFrame(frameHandle), { once: true });
  window.addEventListener('pagehide', () => renderer?.dispose(), { once: true });
})();
