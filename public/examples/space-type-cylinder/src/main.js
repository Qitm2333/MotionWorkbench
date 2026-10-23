(() => {
  const canvas = document.querySelector('#cylinder');
  const context = canvas.getContext('2d');
  const phrase = document.querySelector('#phrase');
  const definitions = {
    text: { type: 'text', label: 'Text', default: 'I-TRY-ALL-THINGS;-I-ACHIEVE-WHAT-I-CAN.//', multiline: true, maxLength: 2000, group: 'Content' },
    radius: { type: 'number', label: 'Cylinder radius', default: 250, min: 0, max: 1000, step: 1, group: 'Cylinder' },
    stackNum: { type: 'number', label: 'Cylinder count', default: 1, min: 1, max: 30, step: 1, group: 'Cylinder' },
    rRotate: { type: 'number', label: 'Cylinder rotate', default: -5, min: -100, max: 100, step: 1, group: 'Cylinder' },
    rOffset: { type: 'number', label: 'Cylinder offset', default: 0, min: 0, max: Math.PI / 2, step: 0.01, group: 'Cylinder' },
    stackHeightAdjust: { type: 'number', label: 'Layer height adjustment', default: 0, min: 0, max: 100, step: 1, group: 'Cylinder' },
    rWaveCount: { type: 'number', label: 'Wave count', default: 2, min: 0, max: 10, step: 1, group: 'Wave' },
    rWaveSpeed: { type: 'number', label: 'Wave speed', default: 0, min: 0, max: 100, step: 1, group: 'Wave' },
    rWave: { type: 'number', label: 'Wave latitude', default: 0, min: 0, max: 200, step: 1, group: 'Wave' },
    rLong: { type: 'number', label: 'Wave longitude', default: 0, min: 0, max: 80, step: 1, group: 'Wave' },
    rZaxis: { type: 'number', label: 'Wave ripple', default: 0, min: 0, max: 100, step: 1, group: 'Wave' },
    strecherXsize: { type: 'number', label: 'Wave X-scale', default: 0, min: 0, max: 80, step: 1, group: 'Wave' },
    strecherYsize: { type: 'number', label: 'Wave Y-scale', default: 0, min: 0, max: 100, step: 1, group: 'Wave' },
    typeX: { type: 'number', label: 'Type X-scale', default: 20, min: 0, max: 100, step: 1, group: 'Type' },
    typeY: { type: 'number', label: 'Type Y-scale', default: 40, min: 0, max: 100, step: 1, group: 'Type' },
    typeStroke: { type: 'number', label: 'Type weight', default: 2, min: 0, max: 10, step: 0.1, group: 'Type' },
    xRotTweak: { type: 'number', label: 'Tweak X rotation', default: 0, min: 0, max: 45, step: 1, group: 'Form tweak' },
    yRotTweak: { type: 'number', label: 'Tweak Y rotation', default: 0, min: 0, max: 45, step: 1, group: 'Form tweak' },
    zRotTweak: { type: 'number', label: 'Tweak Z rotation', default: 0, min: 0, max: 45, step: 1, group: 'Form tweak' },
    xRotCamera: { type: 'number', label: 'Camera X-rotation', default: 15, min: -180, max: 180, step: 1, group: 'Camera' },
    yRotCamera: { type: 'number', label: 'Camera Y-rotation', default: 0, min: -180, max: 180, step: 1, group: 'Camera' },
    zRotCamera: { type: 'number', label: 'Camera Z-rotation', default: 0, min: -180, max: 180, step: 1, group: 'Camera' },
    zoomCamera: { type: 'number', label: 'Camera zoom', default: 0, min: -500, max: 500, step: 1, group: 'Camera' },
    typeColor: { type: 'color', label: 'Type color', default: '#000000', group: 'Color' },
    backgroundColor: { type: 'color', label: 'Background', default: '#ffffff', group: 'Color' },
    pride: { type: 'boolean', label: 'PRIDE! six-color layers', default: false, group: 'Color' },
    preset: { type: 'select', label: 'Cylinder preset', default: 'Custom', group: 'Presets', options: [
      { label: 'Custom', value: 'Custom' }, { label: 'Simple', value: 'Simple' }, { label: 'Jellyfish', value: 'Jellyfish' },
      { label: 'Crown', value: 'Crown' }, { label: 'Complex', value: 'Complex' }, { label: 'Weave', value: 'Weave' },
      { label: 'Zebra', value: 'Zebra' }, { label: 'Hoops', value: 'Hoops' },
    ] },
  };
  const params = window.workbench?.params?.define?.(definitions)
    || Object.fromEntries(Object.entries(definitions).map(([id, definition]) => [id, definition.default]));
  const presets = {
    Simple: { radius: 185, stackNum: 8, rRotate: -10, rOffset: 0.2, rWaveSpeed: 75, rWave: 41, xRotTweak: 24, yRotTweak: 27, xRotCamera: 20 },
    Jellyfish: { radius: 200, stackNum: 6, rOffset: 0.15, rWaveCount: 3, rWaveSpeed: 100, rLong: 80, strecherXsize: 23, typeX: 13, typeY: 64, typeStroke: 0.5, xRotCamera: 25 },
    Crown: { stackNum: 3, rRotate: -5, rWaveCount: 4, rWaveSpeed: 50, rZaxis: 21, strecherXsize: 0, strecherYsize: 76, typeX: 30, typeStroke: 3, zoomCamera: -500 },
    Complex: { radius: 178, stackNum: 11, rRotate: 0, rOffset: 0.16, rWaveCount: 6, rWaveSpeed: 75, rWave: 10, rLong: 31, typeX: 16, typeY: 40, typeStroke: 2, xRotTweak: 15, yRotTweak: 35, xRotCamera: -34, yRotCamera: 10, zRotCamera: 25 },
    Weave: { radius: 110, stackNum: 7, rRotate: 15, rOffset: 0.62, rWaveCount: 5, rWaveSpeed: 30, rZaxis: 15, typeX: 12, typeY: 19, typeStroke: 1, zRotTweak: 33, xRotCamera: 15 },
    Zebra: { radius: 110, stackNum: 7, rRotate: 20, rOffset: 0.3, rWaveCount: 2, rWaveSpeed: 30, rWave: 15, rZaxis: 15, strecherYsize: 33, typeX: 12, typeY: 19, typeStroke: 1, xRotTweak: 9, yRotTweak: 24, zRotTweak: 22, xRotCamera: 15 },
    Hoops: { radius: 110, stackNum: 7, rRotate: 15, rOffset: 0.62, rWaveCount: 1, rWaveSpeed: 100, rZaxis: 58, typeX: 12, typeY: 19, typeStroke: 1.5, zRotTweak: 28, xRotCamera: -10 },
  };
  const palette = ['#e70000', '#ff8c00', '#ffef00', '#00811f', '#0044ff', '#760089'];
  let width = 0;
  let height = 0;
  let ratio = 1;
  let activePreset = String(params.preset || 'Custom');
  let previousValues = { ...params };

  function publishParameters() {
    window.parent.postMessage({ type: 'workbench-parameter-values', values: { ...params } }, '*');
  }

  function applyPreset(name, publish = true) {
    const values = presets[name];
    if (!values) { activePreset = 'Custom'; return; }
    for (const [id, definition] of Object.entries(definitions)) {
      if (definition.type === 'number') params[id] = definition.default;
    }
    Object.assign(params, values, { preset: name });
    params.stackHeightAdjust = name === 'Weave' || name === 'Hoops' ? 30 : name === 'Zebra' ? 10 : 0;
    activePreset = name;
    previousValues = { ...params };
    if (publish) publishParameters();
  }

  function vector(x, y, z) { return { x, y, z }; }
  function rotateX(p, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return vector(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
  }
  function rotateY(p, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return vector(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
  }
  function rotateZ(p, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return vector(p.x * c - p.y * s, p.x * s + p.y * c, p.z);
  }
  function pointFor(row, col, localX, localY, surfaceZ, elapsed, textLength, stackHeight) {
    const frame = elapsed * 30;
    const waveOffset = (Math.PI * 2 / textLength) * Number(params.rWaveCount);
    const phase = frame * Number(params.rWaveSpeed) / 1000;
    const oddRowPhase = row % 2 ? Math.PI : 0;
    const stretchY = (Math.sin(col * waveOffset + phase + oddRowPhase) + 1) * Number(params.strecherYsize) / 2;
    const stretchX = (Math.sin(row * waveOffset + phase) + 1) * Number(params.strecherXsize) / 2;
    const longDisplacement = Math.sin(row * waveOffset + phase) * Number(params.rLong);
    const ripple = Math.sin(col * waveOffset + phase) * Number(params.rZaxis);
    const latitude = Math.sin(col * waveOffset + phase) * Number(params.rWave);
    const before = Math.sin((row - 1) * waveOffset + phase) * Number(params.rLong);
    const after = Math.sin((row + 1) * waveOffset + phase) * Number(params.rLong);
    const longTilt = Number(params.rLong) ? Math.atan2(stackHeight * 2, before - after) - Math.PI / 2 : 0;

    let p = vector(localX, localY, surfaceZ);
    p = rotateZ(p, Math.cos(col * waveOffset + phase) * Number(params.zRotTweak) * Math.PI / 180);
    p = rotateX(p, longTilt);
    p = rotateX(p, Math.cos(col * waveOffset + phase) * -Number(params.xRotTweak) * Math.PI / 180);
    p = rotateY(p, Math.cos(col * waveOffset + phase) * -Number(params.yRotTweak) * Math.PI / 180);
    p.x += Number(params.radius) + longDisplacement;
    p.z += Number(params.rWave) ? latitude : 0;
    p.y += Number(params.rZaxis) ? ripple : 0;
    p = rotateY(p, col * Math.PI * 2 / textLength);
    p.y += row * stackHeight;
    p = rotateY(p, row * Number(params.rOffset));
    p = rotateY(p, frame * Number(params.rRotate) / 1000);
    p.y -= (Number(params.stackNum) - 1) * stackHeight / 2;
    p = rotateZ(p, Number(params.zRotCamera) * Math.PI / 180);
    p = rotateY(p, Number(params.yRotCamera) * Math.PI / 180);
    p = rotateX(p, Number(params.xRotCamera) * Math.PI / 180);
    p.z += Number(params.zoomCamera);
    return p;
  }
  function project(p) {
    const focal = height / 2 / Math.tan(Math.PI / 6);
    const distance = Math.max(30, focal - p.z);
    const scale = focal / distance;
    return { x: width / 2 + p.x * scale, y: height / 2 + p.y * scale, scale, depth: p.z };
  }
  function blend(a, b, amount) {
    const aa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const bb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return '#' + aa.map((value, i) => Math.round(value * (1 - amount) + bb[i] * amount).toString(16).padStart(2, '0')).join('');
  }
  function renderGlyph(char, row, col, elapsed, textLength, stackHeight) {
    const frame = elapsed * 30;
    const waveOffset = Math.PI * 2 / textLength * Number(params.rWaveCount);
    const phase = frame * Number(params.rWaveSpeed) / 1000;
    const stretchX = (Math.sin(row * waveOffset + phase) + 1) * Number(params.strecherXsize) / 2;
    const stretchY = (Math.sin(col * waveOffset + phase + (row % 2 ? Math.PI : 0)) + 1) * Number(params.strecherYsize) / 2;
    const glyphWidth = Number(params.typeX) + stretchX;
    const glyphHeight = Number(params.typeY) + stretchY;
    if (glyphWidth <= 0.1 || glyphHeight <= 0.1 || !Number(params.typeStroke)) return;

    const origin = project(pointFor(row, col, 0, 0, 0, elapsed, textLength, stackHeight));
    const xAxis = project(pointFor(row, col, 1, 0, 0, elapsed, textLength, stackHeight));
    const yAxis = project(pointFor(row, col, 0, 1, 0, elapsed, textLength, stackHeight));
    const a = xAxis.x - origin.x, b = xAxis.y - origin.y;
    const c = yAxis.x - origin.x, d = yAxis.y - origin.y;
    const normal = rotateY(vector(0, 0, 1), col * Math.PI * 2 / textLength + row * Number(params.rOffset) + frame * Number(params.rRotate) / 1000);
    const facing = Math.max(0.12, Math.min(1, 0.22 + Math.abs(normal.z) * 0.78));
    const color = params.pride ? palette[row % palette.length] : params.typeColor;

    for (const [surface, ink, alpha] of [[0, color, facing], [-1, blend(color, params.backgroundColor, 0.75), 0.78]]) {
      const at = project(pointFor(row, col, 0, 0, surface, elapsed, textLength, stackHeight));
      context.save();
      context.setTransform(ratio * a, ratio * b, ratio * c, ratio * d, ratio * at.x, ratio * at.y);
      context.globalAlpha = alpha;
      context.lineWidth = Number(params.typeStroke);
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.strokeStyle = ink;
      window.drawSourceGlyph(context, char, glyphWidth, glyphHeight);
      context.restore();
    }
  }
  function render(elapsed) {
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = params.backgroundColor;
    context.fillRect(0, 0, width, height);
    const chars = [...(String(params.text) || ' ')];
    const count = Math.max(1, Math.min(30, Math.round(Number(params.stackNum))));
    const stackHeight = Number(params.typeY) + Number(params.strecherYsize) / 2 + 5 + Number(params.stackHeightAdjust);
    const glyphs = [];
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < chars.length; col++) {
        const center = project(pointFor(row, col, 0, 0, 0, elapsed, chars.length, stackHeight));
        glyphs.push({ row, col, char: chars[col], depth: center.depth });
      }
    }
    glyphs.sort((a, b) => a.depth - b.depth);
    for (const glyph of glyphs) renderGlyph(glyph.char, glyph.row, glyph.col, elapsed, chars.length, stackHeight);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }

  let currentElapsed = 0;
  phrase.hidden = true;
  window.addEventListener('resize', resize);
  document.addEventListener('workbench:params', (event) => {
    const values = { ...event.detail };
    if (event.workbenchChange?.restore) {
      if (values.preset !== 'Custom') applyPreset(values.preset, false);
      Object.assign(params, values);
      activePreset = params.preset;
      previousValues = { ...params };
      render(currentElapsed);
      return;
    }
    const changed = Object.keys(definitions).filter((id) => values[id] !== previousValues[id]);
    Object.assign(params, values);
    const presetChanged = changed.includes('preset') && values.preset !== activePreset;
    if (changed.includes('pride') && params.pride) {
      params.stackNum = 6;
      if (activePreset !== 'Custom') params.preset = 'Custom';
      activePreset = 'Custom';
      previousValues = { ...params };
      publishParameters();
    } else if (presetChanged && values.preset !== 'Custom') applyPreset(values.preset);
    else if (changed.some((id) => id !== 'preset' && id !== 'text') && activePreset !== 'Custom') {
      params.preset = 'Custom';
      activePreset = 'Custom';
      publishParameters();
    } else if (values.preset === 'Custom') activePreset = 'Custom';
    previousValues = { ...params };
    render(currentElapsed);
  });

  resize();
  let lastDraw = 0;
  function frame(now) {
    if (now - lastDraw >= 1000 / 30) {
      currentElapsed = now / 1000;
      render(currentElapsed);
      lastDraw = now;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener('pagehide', () => window.removeEventListener('resize', resize), { once: true });
})();
