(() => {
  const canvas = document.querySelector('#field');
  const context = canvas.getContext('2d');
  const phrase = document.querySelector('#phrase');
  const definitions = {
    column: { type: 'number', label: 'Columns', default: 21, min: 1, max: 200, step: 1, group: 'Grid' },
    row: { type: 'number', label: 'Rows', default: 21, min: 1, max: 200, step: 1, group: 'Grid' },
    tracking: { type: 'number', label: 'Tracking', default: 5, min: -10, max: 100, step: 1, group: 'Grid' },
    lineSpace: { type: 'number', label: 'Line spacing', default: 5, min: -10, max: 100, step: 1, group: 'Grid' },
    typeX: { type: 'number', label: 'Type X-scale', default: 20, min: 0, max: 100, step: 1, group: 'Type' },
    typeY: { type: 'number', label: 'Type Y-scale', default: 40, min: 0, max: 100, step: 1, group: 'Type' },
    typeStroke: { type: 'number', label: 'Type weight', default: 2, min: 0, max: 10, step: 0.1, group: 'Type' },
    speed: { type: 'number', label: 'Wave speed', default: 2, min: -10, max: 10, step: 1, group: 'Wave' },
    xOffset: { type: 'number', label: 'Wave X size', default: 3.1, min: 0.1, max: 60, step: 1, group: 'Wave' },
    yOffset: { type: 'number', label: 'Wave Y size', default: 3.1, min: 0.1, max: 60, step: 1, group: 'Wave' },
    zWave: { type: 'number', label: 'Z-axis amplitude', default: 0, min: 0, max: 200, step: 1, group: 'Wave' },
    xWave: { type: 'number', label: 'X-axis amplitude', default: 0, min: 0, max: 200, step: 1, group: 'Wave' },
    yWave: { type: 'number', label: 'Y-axis amplitude', default: 0, min: 0, max: 200, step: 1, group: 'Wave' },
    yWavezRot: { type: 'number', label: 'Y-wave Z rotation', default: 0, min: 0, max: 60, step: 1, group: 'Wave' },
    yWavexStr: { type: 'number', label: 'Y-wave X stretch', default: 0, min: 0, max: 60, step: 1, group: 'Wave' },
    xStrechWave: { type: 'number', label: 'X stretch amplitude', default: 0, min: 0, max: 100, step: 1, group: 'Wave' },
    yStrechWave: { type: 'number', label: 'Y stretch amplitude', default: 0, min: 0, max: 100, step: 1, group: 'Wave' },
    zWavePhase: { type: 'boolean', label: 'Z-wave phase shift', default: false, group: 'Wave phase' },
    xWavePhase: { type: 'boolean', label: 'X-wave phase shift', default: false, group: 'Wave phase' },
    yWavePhase: { type: 'boolean', label: 'Y-wave phase shift', default: false, group: 'Wave phase' },
    xStretchPhase: { type: 'boolean', label: 'X-stretch phase shift', default: false, group: 'Wave phase' },
    yStretchPhase: { type: 'boolean', label: 'Y-stretch phase shift', default: false, group: 'Wave phase' },
    fullText: { type: 'boolean', label: 'Fill the full grid with text', default: false, group: 'Text' },
    xRotCamera: { type: 'number', label: 'Camera X rotation', default: 0, min: -180, max: 180, step: 1, group: 'Camera' },
    yRotCamera: { type: 'number', label: 'Camera Y rotation', default: 0, min: -180, max: 180, step: 1, group: 'Camera' },
    zRotCamera: { type: 'number', label: 'Camera Z rotation', default: 0, min: -180, max: 180, step: 1, group: 'Camera' },
    zoomCamera: { type: 'number', label: 'Camera zoom', default: 0, min: -500, max: 500, step: 1, group: 'Camera' },
    color1: { type: 'color', label: 'Layer 1 color', default: '#000000', group: 'Palette' },
    color2: { type: 'color', label: 'Layer 2 color', default: '#ff0000', group: 'Palette' },
    color3: { type: 'color', label: 'Layer 3 color', default: '#0000ff', group: 'Palette' },
    color4: { type: 'color', label: 'Layer 4 color', default: '#ffff00', group: 'Palette' },
    color5: { type: 'color', label: 'Layer 5 color', default: '#ffffff', group: 'Palette' },
    color1Enabled: { type: 'boolean', label: 'Use layer 1', default: true, group: 'Palette layers' },
    color2Enabled: { type: 'boolean', label: 'Use layer 2', default: false, group: 'Palette layers' },
    color3Enabled: { type: 'boolean', label: 'Use layer 3', default: false, group: 'Palette layers' },
    color4Enabled: { type: 'boolean', label: 'Use layer 4', default: false, group: 'Palette layers' },
    color5Enabled: { type: 'boolean', label: 'Use layer 5', default: false, group: 'Palette layers' },
    backgroundColor: { type: 'color', label: 'Background', default: '#ffffff', group: 'Palette' },
    pride: { type: 'boolean', label: 'PRIDE! six-color layers', default: false, group: 'Palette' },
    preset: { type: 'select', label: 'Field preset', default: 'Custom', group: 'Presets', options: [
      { label: 'Custom', value: 'Custom' }, { label: 'Stacks', value: 'Stacks' }, { label: 'Bricks', value: 'Bricks' },
      { label: 'Simple Z', value: 'Simple Z' }, { label: 'Complex Z', value: 'Complex Z' }, { label: 'Zebra', value: 'Zebra' }, { label: 'Harlequin', value: 'Harlequin' },
    ] },
  };
  const params = window.workbench?.params?.define?.(definitions)
    || Object.fromEntries(Object.entries(definitions).map(([id, definition]) => [id, definition.default]));
  const presets = {
    Stacks: { column: 22, row: 8, tracking: 4, lineSpace: 12, typeX: 20, typeY: 18, speed: -3, xOffset: 5.1, yOffset: 59.1, yWave: 100, yWavezRot: 35, yWavexStr: 7 },
    Bricks: { column: 20, row: 9, tracking: 17, lineSpace: 7, typeX: 13, typeY: 20, speed: -4, xWave: 86, xStrechWave: 25, xStretchPhase: true },
    'Simple Z': { column: 28, row: 15, tracking: 5, lineSpace: 5, typeX: 20, typeY: 40, speed: -4, xOffset: 9.1, zWave: 90, xRotCamera: 33, yRotCamera: -27, zRotCamera: 24 },
    'Complex Z': { column: 38, row: 10, tracking: 5, lineSpace: 6, typeX: 8, typeY: 21, typeStroke: 0.9, speed: 2, xOffset: 4.1, yOffset: 3.1, zWave: 41, xWave: 63, yWave: 25, yWavezRot: 22, xRotCamera: 26, yRotCamera: -39, zRotCamera: 15, zoomCamera: 200, yWavePhase: true },
    Zebra: { column: 50, row: 8, tracking: 7, lineSpace: 18.5, typeX: 6, typeY: 20, typeStroke: 1, speed: -4, xOffset: 6.1, yOffset: 5.1, yWave: 33, yWavezRot: 18, yStrechWave: 35 },
    Harlequin: { column: 40, row: 7, tracking: 5, lineSpace: 11, typeX: 9, typeY: 19, typeStroke: 1.1, speed: 2, xOffset: 2.1, yOffset: 59.1, yStrechWave: 58 },
  };
  let width = 0, height = 0, ratio = 1;
  let activePreset = String(params.preset || 'Custom');
  let previousValues = { ...params };
  let parameterSyncReady = false;
  function activePaletteCount() {
    for (let index = 4; index >= 0; index--) if (params[`color${index + 1}Enabled`]) return index + 1;
    return 1;
  }
  function palette() {
    if (params.pride) return [params.color1, params.color2, params.color3, params.color4, params.color5, '#760089'];
    return [params.color1, params.color2, params.color3, params.color4, params.color5].slice(0, activePaletteCount());
  }
  function publishParameters() {
    window.parent.postMessage({ type: 'workbench-parameter-values', values: { ...params } }, '*');
  }
  function setPaletteLayer(id, enabled) {
    const selected = Number(id.match(/color(\d)/)?.[1] || 1);
    for (let index = 1; index <= 5; index++) params[`color${index}Enabled`] = enabled ? index <= selected : index < selected;
  }
  function applyPreset(name, publish = true) {
    const values = presets[name];
    if (!values) { activePreset = 'Custom'; return; }
    for (const [id, definition] of Object.entries(definitions)) if (definition.type === 'number') params[id] = definition.default;
    params.xStretchPhase = false;
    params.fullText = false;
    Object.assign(params, values, { fullText: true, preset: name });
    activePreset = name;
    previousValues = { ...params };
    if (publish) publishParameters();
  }
  function rotateX(p, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
  }
  function rotateY(p, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
  }
  function rotateZ(p, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
  }
  function wave(columnIndex, rowIndex, elapsed, offset, cosine = false, doubled = false) {
    const frame = elapsed * 30;
    const phase = frame * Number(params.speed) / 100 + columnIndex / Number(params.xOffset) + rowIndex / Number(params.yOffset) + offset;
    return cosine ? Math.cos(phase * (doubled ? 2 : 1)) : Math.sin(phase);
  }
  function mapWave(value, amplitude) { return (value + 1) * Number(amplitude) / 2; }
  function point(rowIndex, columnIndex, localX, localY, elapsed, xSpace, ySpace, startX, startY, localRotation = {}) {
    let p = { x: localX, y: localY, z: 0 };
    p = rotateY(p, localRotation.y || 0);
    p = rotateX(p, localRotation.x || 0);
    p = rotateZ(p, localRotation.z || 0);
    const phase = (name, radians) => params[name] ? radians : 0;
    p.x += startX + columnIndex * xSpace + mapWave(wave(columnIndex, rowIndex, elapsed, phase('xWavePhase', Math.PI)), params.xWave);
    p.y += startY + rowIndex * ySpace + wave(columnIndex, rowIndex, elapsed, phase('yWavePhase', Math.PI)) * Number(params.yWave);
    p.z += wave(columnIndex, rowIndex, elapsed, phase('zWavePhase', Math.PI)) * Number(params.zWave);
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
  function renderGlyph(char, rowIndex, columnIndex, elapsed, xSpace, ySpace, startX, startY) {
    const yStretchOffset = (params.yStretchPhase ? Math.PI / 2 : 0) + (rowIndex % 2 ? 0 : Math.PI);
    const xStretch = mapWave(wave(columnIndex, rowIndex, elapsed, params.xStretchPhase ? Math.PI / 2 : 0), params.xStrechWave)
      + mapWave(wave(columnIndex, rowIndex, elapsed, params.yWavePhase ? Math.PI : 0, true, true), params.yWavexStr);
    const yStretch = mapWave(wave(columnIndex, rowIndex, elapsed, yStretchOffset), params.yStrechWave);
    const glyphWidth = Number(params.typeX) + xStretch;
    const glyphHeight = Number(params.typeY) + yStretch;
    if (glyphWidth <= 0.1 || glyphHeight <= 0.1 || !Number(params.typeStroke)) return;
    const safeX = Math.abs(xSpace) < 0.001 ? (xSpace < 0 ? -0.001 : 0.001) : xSpace;
    const safeY = Math.abs(ySpace) < 0.001 ? (ySpace < 0 ? -0.001 : 0.001) : ySpace;
    const zPhase = params.zWavePhase ? Math.PI : 0;
    const beforeZ = wave(columnIndex - 1, rowIndex, elapsed, zPhase) * Number(params.zWave);
    const afterZ = wave(columnIndex + 1, rowIndex, elapsed, zPhase) * Number(params.zWave);
    const beforeY = wave(columnIndex, rowIndex - 1, elapsed, zPhase) * Number(params.zWave);
    const afterY = wave(columnIndex, rowIndex + 1, elapsed, zPhase) * Number(params.zWave);
    const yRotation = Math.atan2(Math.abs(afterZ - beforeZ), 2 * safeX) * (beforeZ > afterZ ? 1 : -1);
    const xRotation = Math.atan2(Math.abs(afterY - beforeY), 2 * safeY) * (beforeY > afterY ? -1 : 1);
    const zRotation = Math.cos(elapsed * 30 * Number(params.speed) / 100 + columnIndex / Number(params.xOffset) + rowIndex / Number(params.yOffset) + (params.yWavePhase ? Math.PI : 0)) * Number(params.yWavezRot) * Math.PI / 180;
    const localRotation = { x: xRotation, y: yRotation, z: zRotation };
    const origin = project(point(rowIndex, columnIndex, 0, 0, elapsed, safeX, safeY, startX, startY, localRotation));
    const xAxis = project(point(rowIndex, columnIndex, 1, 0, elapsed, safeX, safeY, startX, startY, localRotation));
    const yAxis = project(point(rowIndex, columnIndex, 0, 1, elapsed, safeX, safeY, startX, startY, localRotation));
    const center = project(point(rowIndex, columnIndex, 0, 0, elapsed, safeX, safeY, startX, startY));
    context.save();
    context.setTransform(ratio * (xAxis.x - origin.x), ratio * (xAxis.y - origin.y),
      ratio * (yAxis.x - origin.x), ratio * (yAxis.y - origin.y), ratio * center.x, ratio * center.y);
    context.lineWidth = Number(params.typeStroke);
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = palette()[rowIndex % palette().length];
    window.drawSourceGlyph(context, char, glyphWidth, glyphHeight);
    context.restore();
  }
  function render(elapsed) {
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = params.backgroundColor;
    context.fillRect(0, 0, width, height);
    const text = [...(phrase.value || ' ')];
    const columns = Math.max(1, Math.round(Number(params.column)));
    const rows = Math.max(1, Math.round(Number(params.row)));
    const count = params.fullText ? columns * rows : text.length;
    const xSpace = Number(params.typeX) + Number(params.tracking);
    const ySpace = Number(params.typeY) + Number(params.lineSpace) + Number(params.yStrechWave) / 2;
    const visibleColumns = params.fullText ? columns : (text.length >= columns ? columns : text.length);
    const visibleRows = params.fullText ? rows : Math.floor(text.length / columns);
    const startX = -visibleColumns * xSpace / 2;
    const startY = -visibleRows * ySpace / 2;
    const cells = [];
    for (let index = 0; index < count; index++) {
      const columnIndex = index % columns;
      const rowIndex = Math.floor(index / columns);
      const center = project(point(rowIndex, columnIndex, 0, 0, elapsed, xSpace, ySpace, startX, startY));
      cells.push({ columnIndex, rowIndex, char: text[index % text.length], depth: center.depth });
    }
    cells.sort((a, b) => a.depth - b.depth);
    for (const cell of cells) renderGlyph(cell.char, cell.rowIndex, cell.columnIndex, elapsed, xSpace, ySpace, startX, startY);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  phrase.addEventListener('input', () => render(0));
  window.addEventListener('resize', resize);
  document.addEventListener('workbench:params', (event) => {
    const values = event.detail || {};
    const changed = Object.keys(definitions).filter((id) => values[id] !== previousValues[id]);
    Object.assign(params, values);
    if (!parameterSyncReady) { previousValues = { ...params }; render(0); return; }
    const presetChanged = changed.includes('preset') && values.preset !== activePreset;
    const paletteChange = changed.find((id) => /^color[1-5]Enabled$/.test(id));
    if (paletteChange) {
      setPaletteLayer(paletteChange, Boolean(values[paletteChange]));
      params.pride = false;
      params.preset = 'Custom';
      activePreset = 'Custom';
      publishParameters();
    } else if (changed.includes('pride') && params.pride) {
      for (let index = 1; index <= 5; index++) params[`color${index}Enabled`] = true;
      if (activePreset !== 'Custom') params.preset = 'Custom';
      activePreset = 'Custom';
      publishParameters();
    } else if (presetChanged && values.preset !== 'Custom') applyPreset(values.preset);
    else if (changed.some((id) => id !== 'preset') && activePreset !== 'Custom') {
      params.preset = 'Custom';
      activePreset = 'Custom';
      publishParameters();
    } else if (values.preset === 'Custom') activePreset = 'Custom';
    previousValues = { ...params };
    render(0);
  });
  resize();
  let lastDraw = 0;
  function frame(now) {
    if (now - lastDraw >= 1000 / 30) { render(now / 1000); lastDraw = now; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.setTimeout(() => {
    parameterSyncReady = true;
    activePreset = String(params.preset || 'Custom');
    previousValues = { ...params };
  }, 100);
  window.addEventListener('pagehide', () => window.removeEventListener('resize', resize), { once: true });
})();
