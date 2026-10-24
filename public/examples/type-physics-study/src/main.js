(() => {
  const canvas = document.querySelector('#physics');
  const ctx = canvas.getContext('2d');
  const diagnostics = document.querySelector('#diagnostics');
  const PAD = 120;
  let W = 1920;
  let H = 1920;
  const fontFamily = 'Georgia, serif';

  const definitions = {
    text: { type: 'text', label: 'Text', default: 'type.today', multiline: true, maxLength: 300, group: 'Content' },
    canvasRatio: { type: 'select', label: 'Canvas ratio', default: '1:1', group: 'Canvas', options: [
      { label: '1 : 1', value: '1:1' }, { label: '3 : 4', value: '3:4' },
      { label: '9 : 16', value: '9:16' }, { label: '16 : 9', value: '16:9' },
    ] },
    layout: { type: 'select', label: 'Layout direction', default: 'diag-dl', group: 'Layout', options: [
      { label: 'Left to right', value: 'right' }, { label: 'Top to bottom', value: 'down' },
      { label: 'Diagonal down-right', value: 'diag-dl' }, { label: 'Diagonal up-right', value: 'diag-ur' },
      { label: 'Circle', value: 'circle' }, { label: 'Spiral', value: 'spiral' },
      { label: 'Wave horizontal', value: 'wave-h' }, { label: 'Wave vertical', value: 'wave-v' },
      { label: 'Rays', value: 'rays' },
    ] },
    fontSize: { type: 'number', label: 'Type size', default: 260, min: 20, max: 640, step: 1, group: 'Typography' },
    spacing: { type: 'number', label: 'Spacing', default: 0, min: -30, max: 200, step: 1, group: 'Typography' },
    canvasColor: { type: 'color', label: 'Canvas', default: '#000000', group: 'Color' },
    textColor: { type: 'color', label: 'Text', default: '#ffffff', group: 'Color' },
    outerColor: { type: 'color', label: 'Outer contour', default: '#ffffff', group: 'Color' },
    innerColor: { type: 'color', label: 'Inner contour', default: '#000000', group: 'Color' },
    outerWidth: { type: 'number', label: 'Outer width', default: 130, min: 0, max: 400, step: 1, group: 'Stroke' },
    innerWidth: { type: 'number', label: 'Inner width', default: 25, min: 0, max: 120, step: 1, group: 'Stroke' },
    lineJoin: { type: 'select', label: 'Corners', default: 'miter', group: 'Stroke', options: [
      { label: 'Miter', value: 'miter' }, { label: 'Bevel', value: 'bevel' }, { label: 'Round', value: 'round' },
    ] },
    joinAmount: { type: 'number', label: 'Corner amount', default: 2.5, min: 0.5, max: 20, step: 0.5, group: 'Stroke' },
    smooth: { type: 'number', label: 'Blob smooth', default: 20, min: 0, max: 80, step: 1, group: 'Stroke' },
    colliderPad: { type: 'number', label: 'Collider padding', default: 0, min: 0, max: 300, step: 1, group: 'Collider' },
    damping: { type: 'number', label: 'Damping', default: 0.87, min: 0.5, max: 0.99, step: 0.01, group: 'Physics' },
    gravity: { type: 'number', label: 'Gravity', default: 0, min: 0, max: 4, step: 0.1, group: 'Physics' },
    chaos: { type: 'number', label: 'Chaos', default: 0, min: 0, max: 12, step: 0.5, group: 'Physics' },
    force: { type: 'number', label: 'Force', default: 4, min: 1, max: 20, step: 1, group: 'Effects' },
    heldForce: { type: 'select', label: 'Held force', default: 'none', group: 'Effects', options: [
      { label: 'None', value: 'none' }, { label: 'Explode', value: 'explode' },
      { label: 'Implode', value: 'implode' }, { label: 'Vortex', value: 'vortex' },
      { label: 'Shake', value: 'shake' }, { label: 'Gravity down', value: 'gravity' },
    ] },
    vortexSpeed: { type: 'number', label: 'Vortex speed', default: 1, min: 0.1, max: 5, step: 0.1, group: 'Effects' },
    oneShot: { type: 'select', label: 'One-shot action', default: 'none', group: 'Effects', options: [
      { label: 'None', value: 'none' }, { label: 'Scatter', value: 'scatter' },
      { label: 'Bounce', value: 'bounce' }, { label: 'Stack', value: 'stack' },
      { label: 'Ping', value: 'ping' }, { label: 'Freeze', value: 'freeze' },
    ] },
    wave: { type: 'boolean', label: 'Wave', default: false, group: 'Passive effects' },
    orbit: { type: 'select', label: 'Orbit', default: 'off', group: 'Passive effects', options: [
      { label: 'Off', value: 'off' }, { label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' },
    ] },
    orbitShape: { type: 'number', label: 'Orbit ellipse shape', default: 0.5, min: 0.05, max: 1, step: 0.05, group: 'Passive effects' },
    orbitSize: { type: 'number', label: 'Orbit size', default: 32, min: 5, max: 90, step: 1, group: 'Passive effects' },
    orbitSpeed: { type: 'number', label: 'Orbit speed', default: 0.3, min: 0.1, max: 5, step: 0.1, group: 'Passive effects' },
    drift: { type: 'boolean', label: 'Drift', default: false, group: 'Passive effects' },
    pulse: { type: 'boolean', label: 'Pulse', default: false, group: 'Passive effects' },
    circulate: { type: 'boolean', label: 'Circulate', default: false, group: 'Passive effects' },
    repel: { type: 'boolean', label: 'Repel pointer', default: false, group: 'Pointer effects' },
    attract: { type: 'boolean', label: 'Attract pointer', default: false, group: 'Pointer effects' },
  };
  const params = window.workbench?.params?.define?.(definitions)
    || Object.fromEntries(Object.entries(definitions).map(([id, definition]) => [id, definition.default]));

  const makeCanvas = () => document.createElement('canvas');
  const mask = makeCanvas();
  const filtered = makeCanvas();
  const maskCtx = mask.getContext('2d');
  const filteredCtx = filtered.getContext('2d');
  let letters = [];
  let dragging = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let previousPointerX = W / 2;
  let previousPointerY = H / 2;
  let dragVelocityX = 0;
  let dragVelocityY = 0;
  const pointer = { x: W / 2, y: H / 2 };
  let spiralInward = false;
  let raysAngle = 0;
  let orbitAngle = 0;
  let waveTime = 0;
  let pulseTime = 0;
  let circulateTime = 0;
  let circulateRadius = 0;
  let driftVectors = [];
  let frameCount = 0;

  function fitCanvas() {
    const availableWidth = Math.max(1, window.innerWidth - 56);
    const availableHeight = Math.max(1, window.innerHeight - 56);
    const scale = Math.min(availableWidth / W, availableHeight / H, 1);
    canvas.style.width = `${Math.round(W * scale)}px`;
    canvas.style.height = `${Math.round(H * scale)}px`;
  }

  function resizeCanvas() {
    const sizes = {
      '1:1': [1920, 1920], '3:4': [1080, 1440],
      '9:16': [1080, 1920], '16:9': [1920, 1080],
    };
    [W, H] = sizes[params.canvasRatio] || sizes['1:1'];
    canvas.width = W;
    canvas.height = H;
    for (const target of [mask, filtered]) {
      target.width = W + PAD * 2;
      target.height = H + PAD * 2;
    }
    pointer.x = W / 2;
    pointer.y = H / 2;
    fitCanvas();
  }

  function publish() {
    parent.postMessage({ type: 'workbench-parameter-values', values: { ...params } }, '*');
  }

  function font(context) {
    context.font = `${Number(params.fontSize)}px ${fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    context.lineJoin = params.lineJoin;
    context.lineCap = params.lineJoin === 'round' ? 'round' : 'butt';
    context.miterLimit = Number(params.joinAmount);
  }

  function measure(char) {
    font(ctx);
    const metrics = ctx.measureText(char);
    const ascent = metrics.actualBoundingBoxAscent || Number(params.fontSize) * 0.75;
    const descent = metrics.actualBoundingBoxDescent || Number(params.fontSize) * 0.22;
    return { char, width: metrics.width + Number(params.spacing), height: ascent + descent, ascent };
  }

  function computeLayout(text) {
    const data = text.replace(/\n/g, '').split('').map(measure);
    const glyphs = data.filter((item) => item.char !== ' ');
    const count = glyphs.length;
    if (!count) return [];

    if (params.layout === 'circle') {
      const average = glyphs.reduce((sum, item) => sum + item.width, 0) / count;
      const radius = Math.min(count * average / (Math.PI * 2), Math.min(W, H) * 0.44);
      return glyphs.map((item, index) => {
        const angle = index / count * Math.PI * 2 - Math.PI / 2;
        return { ...item, tx: W / 2 + Math.cos(angle) * radius, ty: H / 2 + Math.sin(angle) * radius };
      });
    }
    if (params.layout === 'spiral') {
      const maxRadius = Math.min(W, H) * 0.44;
      const minRadius = maxRadius * 0.1;
      const turns = Math.max(1.5, count / 5);
      const growth = (maxRadius - minRadius) / (turns * Math.PI * 2);
      let theta = -Math.PI / 2;
      return glyphs.map((item) => {
        const offset = theta + Math.PI / 2;
        const radius = spiralInward ? Math.min(maxRadius, minRadius + growth * offset) : Math.max(minRadius, maxRadius - growth * offset);
        const result = { ...item, tx: W / 2 + Math.cos(theta) * radius, ty: H / 2 + Math.sin(theta) * radius };
        theta += item.width * 1.55 / Math.max(radius, 1);
        return result;
      });
    }
    if (params.layout === 'wave-h') {
      const span = glyphs.reduce((sum, item) => sum + item.width, 0);
      const amplitude = Math.min(W, H) * 0.18;
      let x = W / 2 - span / 2;
      return glyphs.map((item, index) => {
        const progress = count > 1 ? index / (count - 1) : 0.5;
        const result = { ...item, tx: x + item.width / 2, ty: H / 2 + Math.sin(progress * Math.PI * 2) * amplitude };
        x += item.width;
        return result;
      });
    }
    if (params.layout === 'wave-v') {
      const span = glyphs.reduce((sum, item) => sum + item.height * 1.2, 0);
      const amplitude = Math.min(W, H) * 0.18;
      let y = H / 2 - span / 2;
      return glyphs.map((item, index) => {
        const progress = count > 1 ? index / (count - 1) : 0.5;
        const result = { ...item, tx: W / 2 + Math.sin(progress * Math.PI * 2) * amplitude, ty: y + item.height * 0.6 };
        y += item.height * 1.2;
        return result;
      });
    }
    if (params.layout === 'rays') {
      const rayCount = Math.max(3, Math.min(8, Math.round(Math.sqrt(count * 1.5))));
      const positions = new Array(rayCount).fill(0);
      return glyphs.map((item, index) => {
        const ray = index % rayCount;
        const position = positions[ray]++;
        const angle = raysAngle + ray / rayCount * Math.PI * 2;
        const radius = Number(params.fontSize) * (0.9 + position * 1.15);
        return { ...item, tx: W / 2 + Math.cos(angle) * radius, ty: H / 2 + Math.sin(angle) * radius };
      });
    }

    const directions = {
      right: { x: 1, y: 0 }, down: { x: 0, y: 1 },
      'diag-dl': { x: 0.707, y: 0.707 }, 'diag-ur': { x: 0.707, y: -0.707 },
    };
    const direction = directions[params.layout] || directions.right;
    const step = (item) => direction.y === 0 ? item.width : direction.x === 0 ? item.height * 1.2 : (item.width + item.height * 1.2) * 0.5;
    const total = data.reduce((sum, item) => sum + step(item), 0);
    const maxAscent = Math.max(...data.map((item) => item.ascent));
    const maxDescent = Math.max(...data.map((item) => item.height - item.ascent));
    const sharedBaseline = H / 2 + (maxAscent - maxDescent) / 2;
    let x = W / 2 - direction.x * total / 2;
    let y = H / 2 - direction.y * total / 2;
    const result = [];
    for (const item of data) {
      const distance = step(item);
      if (item.char !== ' ') result.push({ ...item, tx: x + direction.x * distance / 2, ty: direction.y === 0 ? sharedBaseline : y + direction.y * distance / 2 });
      x += direction.x * distance;
      y += direction.y * distance;
    }
    const minimumAscent = Number(params.fontSize) * 1.05;
    const minimumDescent = Number(params.fontSize) * 0.3;
    for (const item of result) {
      const descent = item.height - item.ascent;
      const safeTop = Math.max(item.ascent, minimumAscent) + 12;
      const safeBottom = H - Math.max(descent, minimumDescent) - 12;
      item.ty = Math.max(safeTop, Math.min(safeBottom, item.ty));
    }
    return result;
  }

  function rebuildText(text, respawn = false) {
    const layout = computeLayout(text);
    const pool = respawn ? [] : letters.map((letter) => ({ ...letter, available: true }));
    letters = layout.map((target) => {
      const previous = pool.find((letter) => letter.available && letter.char === target.char);
      if (previous) {
        previous.available = false;
        return { ...previous, ...target, arriving: true, settled: false };
      }
      const margin = 80;
      return {
        ...target,
        x: margin + Math.random() * (W - margin * 2), y: margin + Math.random() * (H - margin * 2),
        vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
        rotation: (Math.random() - 0.5) * 0.7, scale: 0, scaleVelocity: 0,
        arriving: true, settled: false,
      };
    });
    driftVectors = letters.map(() => ({ x: (Math.random() - 0.5) * 1.2, y: (Math.random() - 0.5) * 1.2 }));
  }

  function recomputeTargets() {
    const layout = computeLayout(String(params.text));
    layout.forEach((target, index) => {
      const letter = letters[index];
      if (!letter) return;
      const dx = target.tx - letter.tx;
      const dy = target.ty - letter.ty;
      Object.assign(letter, target, { arriving: false, settled: false });
      letter.vx += dx * 0.18;
      letter.vy += dy * 0.18;
    });
    if (layout.length !== letters.length) rebuildText(String(params.text));
  }

  const radiusX = (letter) => letter.width * 0.52 + Number(params.colliderPad);
  const radiusY = (letter) => letter.height * 0.52 + Number(params.colliderPad);

  function solvePair(a, b, aFixed, bFixed) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const combinedX = radiusX(a) + radiusX(b);
    const combinedY = radiusY(a) + radiusY(b);
    const normalized = dx * dx / (combinedX * combinedX) + dy * dy / (combinedY * combinedY);
    if (normalized >= 1) return;
    const distance = Math.hypot(dx, dy) || 0.001;
    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = Math.sqrt(combinedX * combinedY) * (1 - Math.sqrt(normalized));
    if (aFixed) {
      b.x += nx * overlap; b.y += ny * overlap;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) { b.vx -= 1.8 * dot * nx; b.vy -= 1.8 * dot * ny; }
    } else if (bFixed) {
      a.x -= nx * overlap; a.y -= ny * overlap;
      const dot = a.vx * nx + a.vy * ny;
      if (dot > 0) { a.vx -= 1.8 * dot * nx; a.vy -= 1.8 * dot * ny; }
    } else {
      a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;
      const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (relative < 0) {
        const impulse = relative * 1.3;
        a.vx += impulse * nx * 0.5; a.vy += impulse * ny * 0.5;
        b.vx -= impulse * nx * 0.5; b.vy -= impulse * ny * 0.5;
      }
    }
  }

  function updatePhysics() {
    for (const letter of letters) if (letter.settled && letter !== dragging) {
      letter.x = letter.tx; letter.y = letter.ty; letter.vx = 0; letter.vy = 0;
    }
    for (const letter of letters) {
      letter.scaleVelocity += (1 - letter.scale) * 0.12;
      letter.scaleVelocity *= 0.82;
      letter.scale += letter.scaleVelocity;
      if (Math.abs(letter.scale - 1) < 0.001 && Math.abs(letter.scaleVelocity) < 0.001) {
        letter.scale = 1; letter.scaleVelocity = 0;
      }
      if (letter === dragging) {
        letter.x = pointer.x + dragOffsetX; letter.y = pointer.y + dragOffsetY; letter.settled = false;
        continue;
      }
      if (letter.settled) continue;
      const dx = letter.tx - letter.x;
      const dy = letter.ty - letter.y;
      const distance = Math.hypot(dx, dy);
      const speed = Math.hypot(letter.vx, letter.vy);
      if (!letter.arriving && distance < 1.5 && speed < 1) {
        letter.x = letter.tx; letter.y = letter.ty; letter.vx = 0; letter.vy = 0; letter.settled = true;
        continue;
      }
      const spring = letter.arriving ? 0.055 : 0.008;
      letter.vx += dx * spring; letter.vy += dy * spring;
      if (distance < 3 && speed < 1) letter.arriving = false;
      letter.vy += Number(params.gravity) * 0.28;
      if (Number(params.chaos) > 0) {
        letter.vx += (Math.random() - 0.5) * Number(params.chaos) * 0.25;
        letter.vy += (Math.random() - 0.5) * Number(params.chaos) * 0.25;
      }
      letter.vx *= Number(params.damping); letter.vy *= Number(params.damping);
      letter.x += letter.vx; letter.y += letter.vy;
    }

    const active = letters.filter((letter) => !letter.settled || letter === dragging);
    const walls = letters.filter((letter) => letter.settled && letter !== dragging);
    const iterations = active.length ? Math.min(8, 3 + active.length) : 0;
    for (let iteration = 0; iteration < iterations; iteration++) {
      if (dragging) { dragging.x = pointer.x + dragOffsetX; dragging.y = pointer.y + dragOffsetY; }
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) solvePair(active[i], active[j], active[i] === dragging, active[j] === dragging);
        for (const wall of walls) solvePair(active[i], wall, false, true);
      }
    }

    for (const letter of letters) {
      if (letter === dragging) continue;
      const padding = Number(params.colliderPad);
      const ascent = Math.max(letter.ascent, Number(params.fontSize) * 1.05) + padding;
      const descent = Math.max(letter.height - letter.ascent, Number(params.fontSize) * 0.3) + padding;
      const halfWidth = letter.width * 0.5 + padding;
      if (!letter.settled) {
        if (letter.x - halfWidth < 0) { letter.x = halfWidth; letter.vx = Math.abs(letter.vx) * 0.35; }
        if (letter.x + halfWidth > W) { letter.x = W - halfWidth; letter.vx = -Math.abs(letter.vx) * 0.35; }
        if (letter.y - ascent < 0) { letter.y = ascent; letter.vy = Math.abs(letter.vy) * 0.35; }
        if (letter.y + descent > H) { letter.y = H - descent; letter.vy = -Math.abs(letter.vy) * 0.35; }
      } else {
        if (letter.y - ascent < 0) letter.y = ascent;
        if (letter.y + descent > H) letter.y = H - descent;
      }
    }

    for (const letter of letters) if (letter.settled && letter !== dragging) {
      letter.x = letter.tx; letter.y = letter.ty; letter.vx = 0; letter.vy = 0;
    }

    const force = Number(params.force) * 0.5;
    if (params.heldForce !== 'none') for (const letter of letters) {
      if (letter === dragging) continue;
      const dx = letter.x - W / 2;
      const dy = letter.y - H / 2;
      const distance = Math.hypot(dx, dy) || 1;
      if (params.heldForce === 'explode') { letter.vx += dx / distance * force; letter.vy += dy / distance * force; }
      if (params.heldForce === 'implode') { letter.vx -= dx / distance * force * 0.8; letter.vy -= dy / distance * force * 0.8; }
      if (params.heldForce === 'vortex') { letter.vx += -dy / distance * force * Number(params.vortexSpeed); letter.vy += dx / distance * force * Number(params.vortexSpeed); }
      if (params.heldForce === 'shake') { letter.vx += (Math.random() - 0.5) * force * 2.4; letter.vy += (Math.random() - 0.5) * force * 2.4; }
      if (params.heldForce === 'gravity') letter.vy += force * 0.6;
      letter.arriving = false; letter.settled = false; letter.tx = letter.x; letter.ty = letter.y;
    }
    if (params.heldForce === 'vortex' && params.orbit !== 'off') orbitAngle += Number(params.force) * 0.003 * Number(params.vortexSpeed);

    if (params.wave) {
      waveTime += 0.04;
      letters.forEach((letter, index) => {
        if (letter === dragging) return;
        letter.rotation = Math.sin(waveTime + index * 0.6) * 0.35;
        if (!letter.settled) letter.y = letter.ty + Math.sin(waveTime + index * 0.5) * Number(params.fontSize) * 0.15;
      });
    }
    if (params.orbit !== 'off' && letters.length) {
      orbitAngle += 0.018 * Number(params.orbitSpeed);
      const major = Math.min(W, H) * Number(params.orbitSize) / 100;
      const minor = major * Number(params.orbitShape);
      letters.forEach((letter, index) => {
        if (letter === dragging) return;
        const angle = orbitAngle + index / letters.length * Math.PI * 2;
        const horizontal = params.orbit === 'horizontal';
        const x = W / 2 + Math.cos(angle) * (horizontal ? major : minor);
        const y = H / 2 + Math.sin(angle) * (horizontal ? minor : major);
        letter.tx = x; letter.ty = y; letter.vx += (x - letter.x) * 0.06; letter.vy += (y - letter.y) * 0.06;
        letter.settled = false; letter.arriving = false;
      });
    }
    if (params.repel || params.attract) for (const letter of letters) {
      if (letter === dragging) continue;
      const dx = (params.repel ? letter.x - pointer.x : pointer.x - letter.x);
      const dy = (params.repel ? letter.y - pointer.y : pointer.y - letter.y);
      const distance = Math.hypot(dx, dy) || 1;
      const radius = Number(params.fontSize) * (params.repel ? 3 : 5);
      if (params.repel && distance >= radius) continue;
      const strength = distance < radius ? (1 - distance / radius) * Number(params.force) * 0.6 : Number(params.force) * 0.04;
      letter.vx += dx / distance * strength; letter.vy += dy / distance * strength;
      letter.settled = false;
      if (params.orbit === 'off') { letter.arriving = false; letter.tx = letter.x; letter.ty = letter.y; }
    }
    if (params.drift) letters.forEach((letter, index) => {
      if (letter === dragging || letter.settled) return;
      const velocity = driftVectors[index] || { x: 0, y: 0 };
      letter.x += velocity.x; letter.y += velocity.y; letter.tx = letter.x; letter.ty = letter.y;
      if (letter.x < 0 || letter.x > W) velocity.x *= -1;
      if (letter.y < 0 || letter.y > H) velocity.y *= -1;
    });
    if (params.pulse) {
      pulseTime += 0.06;
      const base = 1 + Math.sin(pulseTime) * 0.18 * (Number(params.force) / 10);
      letters.forEach((letter, index) => { letter.scale = base + Math.sin(pulseTime + index * 0.4) * 0.08; });
    }
    const circulateTarget = params.circulate ? Number(params.fontSize) * 0.1 * (Number(params.force) / 5) : 0;
    circulateRadius += (circulateTarget - circulateRadius) * 0.06;
    if (circulateRadius > 0.3) {
      circulateTime += 0.03;
      letters.forEach((letter, index) => {
        if (letter === dragging) return;
        const angle = circulateTime + index * (Math.PI * 2 / Math.max(letters.length, 1)) * 2;
        letter.vx += (letter.tx + Math.cos(angle) * circulateRadius - letter.x) * 0.12;
        letter.vy += (letter.ty + Math.sin(angle) * circulateRadius - letter.y) * 0.12;
        letter.settled = false;
      });
    }
  }

  function drawGlyphs(target, fill, stroke, strokeWidth, offset = 0) {
    font(target);
    target.fillStyle = fill;
    target.strokeStyle = stroke;
    target.lineWidth = strokeWidth;
    for (const letter of letters) {
      if (letter.scale < 0.01) continue;
      target.save();
      target.translate(letter.x + offset, Math.max(letter.y, Math.max(letter.ascent, Number(params.fontSize) * 1.05) + 8) + offset);
      target.rotate(letter.rotation || 0);
      target.scale(letter.scale, letter.scale);
      if (strokeWidth > 0) target.strokeText(letter.char, 0, 0);
      if (fill) target.fillText(letter.char, 0, 0);
      target.restore();
    }
  }

  function drawContour(width, color, blur) {
    if (width <= 0) return;
    // Safari versions without CanvasRenderingContext2D.filter cannot run the
    // blurred luminance-mask pipeline. Keep the contour visible with a native
    // text stroke; the final fill pass in render() covers its inner half.
    if (typeof filteredCtx.filter !== 'string') {
      ctx.save();
      ctx.lineJoin = params.lineJoin;
      ctx.miterLimit = Number(params.joinAmount);
      drawGlyphs(ctx, null, color, width * 2);
      ctx.restore();
      return;
    }
    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(0, 0, mask.width, mask.height);
    drawGlyphs(maskCtx, '#ffffff', '#ffffff', width * 2, PAD);
    filteredCtx.clearRect(0, 0, filtered.width, filtered.height);
    filteredCtx.filter = `blur(${Math.max(0.5, blur)}px) contrast(22)`;
    filteredCtx.drawImage(mask, 0, 0);
    filteredCtx.filter = 'none';
    maskCtx.clearRect(0, 0, mask.width, mask.height);
    maskCtx.filter = 'url(#_lum2a)';
    maskCtx.drawImage(filtered, 0, 0);
    maskCtx.filter = 'none';
    maskCtx.globalCompositeOperation = 'source-in';
    maskCtx.fillStyle = color;
    maskCtx.fillRect(0, 0, mask.width, mask.height);
    maskCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(mask, PAD, PAD, W, H, 0, 0, W, H);
  }

  function render() {
    ctx.fillStyle = String(params.canvasColor);
    ctx.fillRect(0, 0, W, H);
    drawContour(Number(params.outerWidth), String(params.outerColor), Number(params.smooth));
    drawContour(Number(params.innerWidth), String(params.innerColor), Number(params.smooth) * 0.5);
    drawGlyphs(ctx, String(params.textColor), null, 0);
    if (frameCount++ % 6 === 0) {
      diagnostics.value = JSON.stringify({
        letters: letters.length, layout: params.layout, heldForce: params.heldForce, oneShot: params.oneShot,
        canvas: { width: W, height: H }, dragging: Boolean(dragging), wave: params.wave,
        first: letters[0] ? { x: Number(letters[0].x.toFixed(2)), y: Number(letters[0].y.toFixed(2)), tx: Number(letters[0].tx.toFixed(2)), ty: Number(letters[0].ty.toFixed(2)) } : null,
      });
    }
  }

  function runOneShot(action) {
    if (action === 'scatter') {
      letters.forEach((letter) => {
        letter.tx = W * 0.1 + Math.random() * W * 0.8; letter.ty = H * 0.1 + Math.random() * H * 0.8;
        letter.vx = (Math.random() - 0.5) * 8; letter.vy = (Math.random() - 0.5) * 8;
        letter.arriving = true; letter.settled = false;
      });
    }
    if (action === 'bounce') letters.forEach((letter, index) => {
      const force = Number(params.force) * 3.5;
      letter.vy -= force * 3 + Math.random() * force * 2;
      letter.vx += (Math.random() - 0.5) * force * 0.8;
      letter.arriving = false; letter.settled = false; letter.tx = letter.x; letter.ty = letter.y;
      setTimeout(() => { letter.scale = 0.4 + Math.random() * 0.15; letter.scaleVelocity = 0.12 + Math.random() * 0.06; }, index * 12);
    });
    if (action === 'stack') letters.forEach((letter, index) => {
      letter.tx = W / 2 + (index - letters.length / 2) * Number(params.fontSize) * 0.6;
      letter.ty = H * 0.85; letter.vx = 0; letter.vy = -(8 + Math.random() * 12); letter.arriving = true; letter.settled = false;
    });
    if (action === 'ping') letters.forEach((letter) => {
      const dx = letter.x - W / 2; const dy = letter.y - H / 2; const distance = Math.hypot(dx, dy) || 1;
      setTimeout(() => {
        letter.vx += dx / distance * Number(params.force) * 1.5; letter.vy += dy / distance * Number(params.force) * 1.5;
        letter.arriving = false; letter.settled = false; letter.tx = letter.x; letter.ty = letter.y;
      }, distance / Math.max(W, H) * 800);
    });
    if (action === 'freeze') letters.forEach((letter) => {
      letter.vx = 0; letter.vy = 0; letter.tx = letter.x; letter.ty = letter.y; letter.arriving = false; letter.settled = true;
    });
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * W, y: (event.clientY - rect.top) / rect.height * H };
  }
  function hitTest(x, y) {
    for (let index = letters.length - 1; index >= 0; index--) {
      const letter = letters[index];
      if (Math.hypot(x - letter.x, y - letter.y) < (radiusX(letter) + radiusY(letter)) * 0.5 + Math.max(Number(params.colliderPad), 12)) return letter;
    }
    return null;
  }
  canvas.addEventListener('pointerdown', (event) => {
    canvas.focus();
    const at = pointerPosition(event);
    Object.assign(pointer, at); previousPointerX = at.x; previousPointerY = at.y; dragVelocityX = 0; dragVelocityY = 0;
    dragging = hitTest(at.x, at.y);
    if (!dragging) return;
    dragOffsetX = dragging.x - at.x; dragOffsetY = dragging.y - at.y;
    canvas.dataset.dragging = 'true'; canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    const at = pointerPosition(event);
    dragVelocityX = at.x - previousPointerX; dragVelocityY = at.y - previousPointerY;
    previousPointerX = at.x; previousPointerY = at.y; Object.assign(pointer, at);
    canvas.dataset.pointer = hitTest(at.x, at.y) ? 'letter' : '';
  });
  const drop = () => {
    if (!dragging) return;
    dragging.vx = dragVelocityX * 0.85; dragging.vy = dragVelocityY * 0.85;
    dragging.tx = dragging.x; dragging.ty = dragging.y; dragging.arriving = false; dragging.settled = false;
    dragging = null; canvas.dataset.dragging = 'false';
  };
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);

  let previousValues = { ...params };
  document.addEventListener('workbench:params', (event) => {
    const incoming = { ...event.detail };
    const changed = event.workbenchChange?.ids || Object.keys(definitions).filter((id) => incoming[id] !== previousValues[id]);
    const previousLayout = params.layout;
    Object.assign(params, incoming);
    if (params.attract && params.repel) {
      if (changed.includes('attract')) params.repel = false;
      else params.attract = false;
      publish();
    }
    if (changed.includes('layout')) {
      if (params.layout === 'spiral') spiralInward = !spiralInward;
      if (params.layout === 'rays') raysAngle += 2.3998;
    }
    if (changed.includes('text')) rebuildText(String(params.text));
    else if (changed.includes('canvasRatio')) { resizeCanvas(); recomputeTargets(); }
    else if (changed.some((id) => ['layout', 'fontSize', 'spacing'].includes(id)) || previousLayout !== params.layout) recomputeTargets();
    if (changed.includes('drift') && params.drift) driftVectors = letters.map(() => ({ x: (Math.random() - 0.5) * 1.2, y: (Math.random() - 0.5) * 1.2 }));
    if (changed.includes('wave') && !params.wave) letters.forEach((letter) => { letter.rotation = 0; });
    if (changed.includes('oneShot') && params.oneShot !== 'none') {
      runOneShot(params.oneShot);
      params.oneShot = 'none';
      publish();
    }
    if (event.workbenchChange?.reset) rebuildText(String(params.text), true);
    previousValues = { ...params };
  });

  function changeParameters(values) {
    document.dispatchEvent(new CustomEvent('workbench:params', { detail: { ...params, ...values } }));
    publish();
  }

  const layoutKeys = {
    Digit1: 'right', Digit2: 'down', Digit3: 'diag-dl', Digit4: 'diag-ur', Digit5: 'circle',
    Digit6: 'spiral', Digit7: 'wave-h', Digit8: 'wave-v', Digit9: 'rays',
  };
  const heldKeys = { KeyE: 'explode', KeyI: 'implode', KeyV: 'vortex', KeyH: 'shake', KeyG: 'gravity' };
  const actionKeys = { KeyX: 'scatter', KeyB: 'bounce', KeyT: 'stack', KeyP: 'ping', KeyF: 'freeze' };
  const toggleKeys = {
    KeyW: () => ({ wave: !params.wave }),
    KeyO: () => ({ orbit: params.orbit === 'off' ? 'horizontal' : 'off' }),
    KeyD: () => ({ drift: !params.drift }),
    KeyU: () => ({ pulse: !params.pulse }),
    KeyC: () => ({ circulate: !params.circulate }),
    KeyR: () => ({ repel: !params.repel }),
    KeyA: () => ({ attract: !params.attract }),
  };
  document.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
    if (layoutKeys[event.code]) changeParameters({ layout: layoutKeys[event.code] });
    else if (heldKeys[event.code]) changeParameters({ heldForce: heldKeys[event.code] });
    else if (!event.repeat && actionKeys[event.code]) changeParameters({ oneShot: actionKeys[event.code] });
    else if (!event.repeat && toggleKeys[event.code]) changeParameters(toggleKeys[event.code]());
    else return;
    event.preventDefault();
  });
  document.addEventListener('keyup', (event) => {
    if (heldKeys[event.code] && params.heldForce === heldKeys[event.code]) changeParameters({ heldForce: 'none' });
  });
  window.addEventListener('blur', () => {
    if (params.heldForce !== 'none') changeParameters({ heldForce: 'none' });
  });

  resizeCanvas();
  window.addEventListener('resize', fitCanvas);
  rebuildText(String(params.text), true);
  let lastFrameTime = 0;
  function frame(time) {
    requestAnimationFrame(frame);
    if (time - lastFrameTime > 100) { lastFrameTime = time; return; }
    lastFrameTime = time;
    updatePhysics();
    render();
  }
  requestAnimationFrame(frame);
})();
