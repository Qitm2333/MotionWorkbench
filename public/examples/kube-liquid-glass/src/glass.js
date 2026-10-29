const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smootherstep = (x) => x * x * x * (x * (x * 6 - 15) + 10);
const convexCircle = (x) => Math.sqrt(Math.max(0, 1 - (1 - x) ** 2));
const convexSquircle = (x) => Math.pow(Math.max(0, 1 - (1 - x) ** 4), 0.25);
const concave = (x) => 1 - convexCircle(x);
const profiles = {
  'convex-circle': convexCircle,
  'convex-squircle': convexSquircle,
  concave,
  lip: (x) => {
    const blend = smootherstep(x);
    return convexSquircle(x * 2) * (1 - blend) + (concave(x) + 0.1) * blend;
  },
};

function displacementAt(profile, distance, glassThickness = 50, bezelHeight = 20, indexOfRefraction = 1.5) {
  const surface = profiles[profile];
  const t = clamp(distance, 0, 1);
  const delta = t < 1 ? 0.0001 : -0.0001;
  const height = surface(t);
  const derivative = (surface(t + delta) - height) / delta;
  const length = Math.hypot(derivative, 1) || 1;
  const normalX = -derivative / length;
  const normalY = -1 / length;
  const ratio = 1 / indexOfRefraction;
  const discriminant = 1 - ratio ** 2 * (1 - normalY ** 2);
  if (discriminant < 0) return 0;
  const correction = ratio * normalY + Math.sqrt(discriminant);
  const rayX = -correction * normalX;
  const rayY = ratio - correction * normalY;
  return rayY ? rayX * (glassThickness + height * bezelHeight) / rayY : 0;
}

function displacementTexture(width, height, bezel, radius, profile) {
  const canvas = document.createElement('canvas');
  const resolution = 2;
  canvas.width = width * resolution;
  canvas.height = height * resolution;
  const context = canvas.getContext('2d');
  const image = context.createImageData(canvas.width, canvas.height);
  const data = image.data;
  const samples = Array.from({ length: 512 }, (_, index) => displacementAt(profile, index / 512));
  const maximum = Math.max(1e-6, ...samples.map((sample) => Math.abs(sample)));
  const shapeWidth = width * resolution;
  const shapeHeight = height * resolution;
  const radiusPx = radius * resolution;
  const bezelPx = Math.min(Math.max(1, bezel * resolution), radiusPx);
  new Uint32Array(data.buffer).fill(0xff008080);
  for (let y = 0; y < shapeHeight; y++) for (let x = 0; x < shapeWidth; x++) {
    const offsetX = x < radiusPx ? x - radiusPx : x >= shapeWidth - radiusPx ? x - radiusPx - (shapeWidth - radiusPx * 2) : 0;
    const offsetY = y < radiusPx ? y - radiusPx : y >= shapeHeight - radiusPx ? y - radiusPx - (shapeHeight - radiusPx * 2) : 0;
    const distanceSquared = offsetX ** 2 + offsetY ** 2;
    if (distanceSquared > (radiusPx + 1) ** 2 || distanceSquared < (radiusPx - bezelPx) ** 2) continue;
    const pixel = (y * canvas.width + x) * 4;
    const distance = Math.sqrt(distanceSquared);
    const inward = radiusPx - distance;
    const normalX = distance ? offsetX / distance : 0;
    const normalY = distance ? offsetY / distance : 0;
    const sample = samples[Math.floor(inward / bezelPx * samples.length)] ?? 0;
    const antialias = distanceSquared < radiusPx ** 2 ? 1 : 1 - (distance - radiusPx);
    data[pixel] = clamp(Math.round(128 - normalX * sample / maximum * 127 * antialias), 0, 255);
    data[pixel + 1] = clamp(Math.round(128 - normalY * sample / maximum * 127 * antialias), 0, 255);
  }
  context.putImageData(image, 0, 0);
  return { url: canvas.toDataURL('image/png'), maximum };
}

function specularTexture(width, height, bezel, radius, profile, lightAngle = -150) {
  const canvas = document.createElement('canvas');
  const resolution = 2;
  canvas.width = width * resolution;
  canvas.height = height * resolution;
  const context = canvas.getContext('2d');
  const image = context.createImageData(canvas.width, canvas.height);
  const data = image.data;
  const surface = profiles[profile];
  const light = (lightAngle * Math.PI) / 180;
  const lightX = Math.sin(light);
  const lightY = Math.cos(light);
  const radiusPx = radius * resolution;
  const bezelPx = Math.min(Math.max(1, bezel * resolution), radiusPx);
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const i = (y * canvas.width + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255;
    const offsetX = x < radiusPx ? x - radiusPx : x >= canvas.width - radiusPx ? x - radiusPx - (canvas.width - radiusPx * 2) : 0;
    const offsetY = y < radiusPx ? y - radiusPx : y >= canvas.height - radiusPx ? y - radiusPx - (canvas.height - radiusPx * 2) : 0;
    const distance = Math.hypot(offsetX, offsetY);
    const inward = radiusPx - distance;
    if (inward < 0 || inward > bezelPx) { data[i + 3] = 0; continue; }
    const t = inward / bezelPx;
    const slope = (surface(Math.min(1, t + 0.001)) - surface(Math.max(0, t - 0.001))) / 0.002;
    const angle = Math.atan2(1, -slope);
    const nx = -(offsetX / (distance || 1)) * 0.7 + Math.cos(angle) * 0.3;
    const ny = -(offsetY / (distance || 1)) * 0.7 + Math.sin(angle) * 0.3;
    const len = Math.hypot(nx, ny) || 1;
    const intensity = Math.max(0, (nx / len) * lightX + (ny / len) * lightY) ** 6;
    data[i + 3] = Math.round(intensity * (1 - Math.sqrt(t)) * 255);
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

export function createFilter({ id, width, height, radius, bezel, profile = 'convex-circle' }) {
  const displacement = displacementTexture(width, height, bezel, radius, profile);
  const specular = specularTexture(width, height, bezel, radius, profile);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `<defs><filter id="${id}" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="0.2" result="blurred_source"/><feImage href="${displacement.url}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="displacement_map"/><feDisplacementMap in="blurred_source" in2="displacement_map" scale="55.65161904498752" xChannelSelector="R" yChannelSelector="G" result="displaced"/><feColorMatrix in="displaced" type="saturate" values="6" result="displaced_saturated"/><feImage href="${specular}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="specular_layer"/><feComposite in="displaced_saturated" in2="specular_layer" operator="in" result="specular_saturated"/><feComponentTransfer in="specular_layer" result="specular_faded"><feFuncA id="${id}-opacity" type="linear" slope="0.5"/></feComponentTransfer><feBlend in="specular_saturated" in2="displaced" mode="normal" result="withSaturation"/><feBlend in="specular_faded" in2="withSaturation" mode="normal"/></filter></defs>`;
  document.body.append(svg);
  const filter = svg.querySelector('filter');
  const blur = filter.querySelector('feGaussianBlur');
  const displacementMap = filter.querySelector('feDisplacementMap');
  const saturation = filter.querySelector('feColorMatrix');
  const opacity = filter.querySelector('feFuncA');
  return { maximum: displacement.maximum, apply(params, scaleRatio = 1) {
    blur.setAttribute('stdDeviation', String(params.blurLevel));
    displacementMap.setAttribute('scale', String(55.65161904498752 * params.refractionLevel * scaleRatio));
    saturation.setAttribute('values', String(params.specularSaturation));
    opacity.setAttribute('slope', String(params.specularOpacity));
  } };
}

export function readParameters(schema, defaults) {
  return window.workbench?.params?.define ? window.workbench.params.define(schema) : { ...defaults };
}

export function listenParameters(callback) {
  const handler = (event) => callback(event.detail || {});
  document.addEventListener('workbench:params', handler);
  return () => document.removeEventListener('workbench:params', handler);
}

export function animateSpring(readTarget, onFrame, { stiffness = 1000, damping = 80 } = {}) {
  let value = readTarget();
  let velocity = 0;
  let frame = 0;
  let previous = performance.now();
  const tick = (now) => {
    const dt = Math.min((now - previous) / 1000, 0.032);
    previous = now;
    const target = readTarget();
    velocity += (stiffness * (target - value) - damping * velocity) * dt;
    value += velocity * dt;
    if (Math.abs(target - value) < 0.001 && Math.abs(velocity) < 0.01) { value = target; velocity = 0; frame = 0; }
    else frame = requestAnimationFrame(tick);
    onFrame(value);
  };
  return {
    start() { if (!frame) { previous = performance.now(); frame = requestAnimationFrame(tick); } },
    cancel() { if (frame) cancelAnimationFrame(frame); frame = 0; },
  };
}
