const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smootherstep = (x) => x * x * x * (x * (x * 6 - 15) + 10);
const circle = (x) => Math.sqrt(Math.max(0, 1 - (1 - x) ** 2));
const squircle = (x) => Math.pow(Math.max(0, 1 - (1 - x) ** 4), 0.25);
const concave = (x) => 1 - circle(x);
const profiles = {
  'convex-circle': circle,
  'convex-squircle': squircle,
  concave,
  lip: (x) => { const mix = smootherstep(x); return squircle(x * 2) * (1 - mix) + (concave(x) + 0.1) * mix; },
};

function sdf(x, y, width, height, radius) {
  const cx = width / 2, cy = height / 2;
  const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
  const r = Math.min(radius, width / 2, height / 2);
  const cornerX = width / 2 - r, cornerY = height / 2 - r;
  const vx = Math.max(0, dx - cornerX), vy = Math.max(0, dy - cornerY);
  const cornerDistance = Math.hypot(vx, vy);
  let nx = 0, ny = 0;
  if (dx > cornerX && dy > cornerY) { const len = cornerDistance || 1; nx = vx / len; ny = vy / len; }
  else if (dx > cornerX) nx = 1;
  else if (dy > cornerY) ny = 1;
  else { const ax = dx - cornerX, ay = dy - cornerY, len = Math.hypot(ax, ay) || 1; nx = ax / len; ny = ay / len; }
  return { distance: cornerDistance - r, nx: nx * (x < cx ? -1 : 1), ny: ny * (y < cy ? -1 : 1) };
}

function displacementAt(profile, t, glassThickness = 50, bezelHeight = 20, indexOfRefraction = 1.5) {
  const surface = profiles[profile];
  const delta = t < 1 ? 0.0001 : -0.0001;
  const height = surface(t);
  const slope = (surface(t + delta) - height) / delta;
  const len = Math.hypot(slope, 1) || 1;
  const normalX = -slope / len;
  const normalY = -1 / len;
  const ratio = 1 / indexOfRefraction;
  const discriminant = 1 - ratio ** 2 * (1 - normalY ** 2);
  if (discriminant < 0) return 0;
  const correction = ratio * normalY + Math.sqrt(discriminant);
  const rayX = -correction * normalX;
  const rayY = ratio - correction * normalY;
  return rayY ? rayX * (glassThickness + height * bezelHeight) / rayY : 0;
}

function makeMaps(width, height, radius, bezel, profile) {
  const displacementCanvas = document.createElement('canvas');
  const specularCanvas = document.createElement('canvas');
  const resolution = 2;
  for (const canvas of [displacementCanvas, specularCanvas]) { canvas.width = width * resolution; canvas.height = height * resolution; }
  const displacementContext = displacementCanvas.getContext('2d');
  const specularContext = specularCanvas.getContext('2d');
  const displacementImage = displacementContext.createImageData(displacementCanvas.width, displacementCanvas.height);
  const specularImage = specularContext.createImageData(specularCanvas.width, specularCanvas.height);
  const samples = Array.from({ length: 512 }, (_, i) => displacementAt(profile, i / 511));
  const maximum = Math.max(1e-6, ...samples.map(Math.abs));
  const light = -150 * Math.PI / 180, lightX = Math.sin(light), lightY = Math.cos(light);
  for (let y = 0; y < displacementCanvas.height; y++) for (let x = 0; x < displacementCanvas.width; x++) {
    const i = (y * displacementCanvas.width + x) * 4;
    const point = sdf(x, y, displacementCanvas.width, displacementCanvas.height, radius * resolution);
    const disp = displacementImage.data, spec = specularImage.data;
    spec[i] = spec[i + 1] = spec[i + 2] = 255;
    if (point.distance >= 0) {
      disp[i] = disp[i + 1] = disp[i + 2] = 128; disp[i + 3] = 255; spec[i + 3] = 0; continue;
    }
    const t = clamp(-point.distance / Math.max(1, bezel * resolution), 0, 1);
    const sample = t * (samples.length - 1), low = Math.floor(sample), high = Math.min(samples.length - 1, low + 1);
    const magnitude = (samples[low] + (samples[high] - samples[low]) * (sample - low)) / maximum;
    disp[i] = Math.round(128 - point.nx * magnitude * 127);
    disp[i + 1] = Math.round(128 - point.ny * magnitude * 127);
    disp[i + 2] = 128; disp[i + 3] = 255;
    const slope = (profiles[profile](Math.min(1, t + 0.001)) - profiles[profile](Math.max(0, t - 0.001))) / 0.002;
    const angle = Math.atan2(1, -slope);
    const nx = -point.nx * 0.7 + Math.cos(angle) * 0.3;
    const ny = -point.ny * 0.7 + Math.sin(angle) * 0.3;
    const normalLength = Math.hypot(nx, ny) || 1;
    const intensity = Math.max(0, nx / normalLength * lightX + ny / normalLength * lightY) ** 6;
    spec[i + 3] = Math.round(intensity * (1 - Math.sqrt(t)) * 255);
  }
  displacementContext.putImageData(displacementImage, 0, 0);
  specularContext.putImageData(specularImage, 0, 0);
  return { displacement: displacementCanvas.toDataURL('image/png'), specular: specularCanvas.toDataURL('image/png') };
}

export function createFilter({ id, width, height, radius, bezel, profile = 'convex-circle' }) {
  let currentWidth = width;
  let currentHeight = height;
  let maps = makeMaps(width, height, radius, bezel, profile);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `<defs><filter id="${id}" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blurred_source"/><feImage href="${maps.displacement}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="displacement_map"/><feDisplacementMap in="blurred_source" in2="displacement_map" scale="55.65161904498752" xChannelSelector="R" yChannelSelector="G" result="displaced"/><feColorMatrix in="displaced" type="saturate" values="6" result="displaced_saturated"/><feImage href="${maps.specular}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="specular_layer"/><feComposite in="displaced_saturated" in2="specular_layer" operator="in" result="specular_saturated"/><feComponentTransfer in="specular_layer" result="specular_faded"><feFuncA id="${id}-opacity" type="linear" slope="0.4"/></feComponentTransfer><feBlend in="specular_saturated" in2="displaced" mode="normal" result="withSaturation"/><feBlend in="specular_faded" in2="withSaturation" mode="normal"/></filter></defs>`;
  document.body.append(svg);
  const filter = svg.querySelector('filter');
  const blur = filter.querySelector('feGaussianBlur');
  const map = filter.querySelector('feDisplacementMap');
  const saturation = filter.querySelector('feColorMatrix');
  const opacity = filter.querySelector('feFuncA');
  const displacementImage = filter.querySelector('feImage[result="displacement_map"]');
  const specularImage = filter.querySelector('feImage[result="specular_layer"]');
  return { apply(params) {
    blur.setAttribute('stdDeviation', String(params.blurLevel));
    map.setAttribute('scale', String(55.65161904498752 * params.refractionLevel));
    saturation.setAttribute('values', String(params.specularSaturation));
    opacity.setAttribute('slope', String(params.specularOpacity));
  }, resize(nextWidth, nextHeight) {
    const roundedWidth = Math.max(1, Math.round(nextWidth));
    const roundedHeight = Math.max(1, Math.round(nextHeight));
    if (roundedWidth === currentWidth && roundedHeight === currentHeight) return;
    currentWidth = roundedWidth;
    currentHeight = roundedHeight;
    maps = makeMaps(currentWidth, currentHeight, currentHeight / 2, Math.min(14, currentHeight / 3), profile);
    for (const image of [displacementImage, specularImage]) {
      image.setAttribute('width', String(currentWidth));
      image.setAttribute('height', String(currentHeight));
    }
    displacementImage.setAttribute('href', maps.displacement);
    specularImage.setAttribute('href', maps.specular);
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
