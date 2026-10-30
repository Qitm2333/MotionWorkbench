import { Engine } from './engine.js';
import { createPlayer } from './player.js';
import { drawingSize } from './resolution.js';
import { APPLE_MUSIC } from './scene.js';

const definitions = {
  dome: { type: 'number', label: 'Dome', default: 1, min: 0, max: 2, step: 0.01, group: 'Oil' },
  depth: { type: 'number', label: 'Depth', default: 1, min: 0.3, max: 2, step: 0.01, group: 'Oil' },
  dispersion: { type: 'number', label: 'Dispersion', default: 1, min: 0, max: 2.5, step: 0.01, group: 'Oil' },
  highlights: { type: 'number', label: 'Highlights', default: 1, min: 0, max: 2.5, step: 0.01, group: 'Light' },
  rims: { type: 'number', label: 'Rims', default: 1, min: 0, max: 3, step: 0.01, group: 'Light' },
  exposure: { type: 'number', label: 'Exposure', default: 1, min: 0.3, max: 2, step: 0.01, group: 'Light' },
  bloom: { type: 'number', label: 'Bloom', default: 1, min: 0, max: 5, step: 0.01, group: 'Light' },
  grain: { type: 'number', label: 'Grain', default: 0, min: 0, max: 0.06, step: 0.001, group: 'Light' },
  vignette: { type: 'number', label: 'Vignette', default: 0.25, min: 0, max: 1, step: 0.01, group: 'Light' },
  wavelengths: { type: 'number', label: 'Wavelengths', default: 12, min: 3, max: 32, step: 1, group: 'Quality' },
  motionBlur: { type: 'number', label: 'Motion blur', default: 8, min: 1, max: 16, step: 1, group: 'Quality' },
};
const values = window.workbench?.params?.define?.(definitions)
  || Object.fromEntries(Object.entries(definitions).map(([id, definition]) => [id, definition.default]));
const canvas = document.querySelector('canvas');
const status = document.querySelector('[data-status]');

try {
  const [width, height] = drawingSize(canvas, { aspect: APPLE_MUSIC.aspect });
  const engine = await Engine.create(canvas, APPLE_MUSIC, {
    width,
    height,
    preserveDrawingBuffer: true,
  });
  window.__appleMusicStudy = createPlayer(engine, APPLE_MUSIC, values);
  window.dispatchEvent(new Event('apple-music-ready'));
} catch (error) {
  status.textContent = error instanceof Error ? error.message : String(error);
  status.dataset.error = 'true';
  console.error(error);
}
