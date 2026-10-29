import { createFilter, listenParameters, readParameters } from './glass.js';

const schema = {
  specularOpacity: { type: 'number', label: 'Specular opacity', default: 0.4, min: 0, max: 1, step: 0.01, group: 'Glass' },
  specularSaturation: { type: 'number', label: 'Specular saturation', default: 7, min: 0, max: 50, step: 1, group: 'Glass' },
  refractionLevel: { type: 'number', label: 'Refraction level', default: 1, min: 0, max: 1, step: 0.01, group: 'Glass' },
  blurLevel: { type: 'number', label: 'Blur level', default: 0, min: 0, max: 40, step: 0.1, group: 'Glass' },
};
const defaults = Object.fromEntries(Object.entries(schema).map(([id, item]) => [id, item.default]));
const params = { ...defaults, ...readParameters(schema, defaults) };
const slider = document.querySelector('#slider');
const fill = document.querySelector('#sliderFill');
const thumb = document.querySelector('#sliderThumb');
const note = document.querySelector('#compatNote');
const filter = createFilter({ id: 'slider-filter', width: 90, height: 60, radius: 30, bezel: 9, profile: 'convex-circle' });
let value = 10;
let dragging = false;

function render() {
  const percent = `${value}%`;
  slider.setAttribute('aria-valuenow', String(value));
  fill.style.width = percent;
  thumb.style.left = percent;
  filter.apply(params);
}

function updateFromX(clientX) {
  const rect = slider.getBoundingClientRect();
  const next = Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100);
  if (next !== value) {
    value = next;
    render();
  }
}

slider.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  slider.setPointerCapture(event.pointerId);
  dragging = true;
  slider.dataset.dragging = 'true';
  updateFromX(event.clientX);
});
slider.addEventListener('pointermove', (event) => { if (dragging) updateFromX(event.clientX); });
function finishDrag() { dragging = false; delete slider.dataset.dragging; }
slider.addEventListener('pointerup', finishDrag);
slider.addEventListener('pointercancel', finishDrag);
slider.addEventListener('keydown', (event) => {
  const step = event.shiftKey ? 10 : 1;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') value = Math.min(100, value + step);
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') value = Math.max(0, value - step);
  else if (event.key === 'Home') value = 0;
  else if (event.key === 'End') value = 100;
  else return;
  event.preventDefault();
  render();
});

for (const id of Object.keys(schema)) {
  const input = document.querySelector(`#${id}`);
  const output = document.querySelector(`#${id}Out`);
  input.addEventListener('input', () => {
    params[id] = Number(input.value);
    output.value = id === 'specularOpacity' || id === 'refractionLevel' ? params[id].toFixed(2) : id === 'blurLevel' ? params[id].toFixed(1).replace(/\.0$/, '') : String(params[id]);
    render();
  });
}

listenParameters((values) => {
  for (const id of Object.keys(schema)) {
    if (!(id in values)) continue;
    const input = document.querySelector(`#${id}`);
    input.value = String(values[id]);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

window.addEventListener('message', (event) => {
  if (event.source !== window.parent || event.data?.type !== 'workbench-pause') return;
  document.documentElement.classList.toggle('workbench-paused', Boolean(event.data.paused));
});

if (!CSS.supports('backdrop-filter', 'url(#slider-filter)')) note.hidden = false;
render();
