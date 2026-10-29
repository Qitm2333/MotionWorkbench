import { animateSpring, createFilter, listenParameters, readParameters } from './glass.js';

const schema = {
  specularOpacity: { type: 'number', label: 'Specular opacity', default: 0.5, min: 0, max: 1, step: 0.01, group: 'Glass' },
  specularSaturation: { type: 'number', label: 'Specular saturation', default: 6, min: 0, max: 50, step: 1, group: 'Glass' },
  refractionLevel: { type: 'number', label: 'Refraction level', default: 1, min: 0, max: 1, step: 0.01, group: 'Glass' },
  blurLevel: { type: 'number', label: 'Blur level', default: 0.2, min: 0, max: 40, step: 0.1, group: 'Glass' },
};
const defaults = Object.fromEntries(Object.entries(schema).map(([id, item]) => [id, item.default]));
const params = { ...defaults, ...readParameters(schema, defaults) };
const ui = {
  stage: document.querySelector('#switchStage'),
  button: document.querySelector('#glassSwitch'),
  thumb: document.querySelector('#switchThumb'),
  force: document.querySelector('#forceActive'),
  note: document.querySelector('#compatNote'),
};
const filter = createFilter({ id: 'switch-filter', width: 146, height: 92, radius: 46, bezel: 20, profile: 'lip' });
let checked = true;
let dragging = false;
let moved = false;
let dragStartX = 0;
let dragStartValue = 0;
let dragTarget = 0;
let currentPosition = 1;

const spring = animateSpring(() => dragging ? dragTarget : Number(checked), (value) => {
  currentPosition = value;
  render();
});

function render() {
  const active = ui.force.checked || dragging;
  const targetScale = active ? 0.9 : 0.65;
  const surfaceOpacity = 1 - 0.9 * Number(active);
  const refractionRatio = 0.4 + 0.5 * Number(active);
  ui.button.setAttribute('aria-checked', String(checked));
  ui.thumb.style.transform = `translate(${currentPosition * 57.9}px, -50%) scale(${targetScale})`;
  ui.thumb.style.backgroundColor = `rgba(255, 255, 255, ${surfaceOpacity})`;
  ui.thumb.style.boxShadow = active
    ? '0 4px 22px rgba(0,0,0,.1), inset 2px 7px 24px rgba(0,0,0,.09), inset -2px -7px 24px rgba(255,255,255,.09)'
    : '0 4px 22px rgba(0,0,0,.1)';
  filter.apply(params, refractionRatio);
}

ui.button.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  ui.button.setPointerCapture(event.pointerId);
  dragging = true;
  moved = false;
  dragStartX = event.clientX;
  dragStartValue = Number(checked);
  dragTarget = dragStartValue;
  spring.start();
  render();
});

ui.button.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const delta = event.clientX - dragStartX;
  if (Math.abs(delta) > 4) moved = true;
  const raw = dragStartValue + delta / 57.9;
  const overshoot = raw < 0 ? -raw : raw > 1 ? raw - 1 : 0;
  dragTarget = Math.max(0, Math.min(1, raw)) + Math.sign(raw < 0 ? -1 : raw > 1 ? 1 : 0) * overshoot / 22;
});

function finishPointer() {
  if (!dragging) return;
  dragging = false;
  if (moved) {
    checked = dragTarget > 0.5;
    spring.start();
    setTimeout(() => { moved = false; }, 0);
  }
  render();
}
ui.button.addEventListener('pointerup', finishPointer);
ui.button.addEventListener('pointercancel', finishPointer);
ui.button.addEventListener('click', (event) => {
  if (moved) { event.preventDefault(); moved = false; return; }
  checked = !checked;
  spring.start();
  render();
});
ui.force.addEventListener('change', render);

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
    params[id] = Number(values[id]);
    const input = document.querySelector(`#${id}`);
    input.value = String(params[id]);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

window.addEventListener('message', (event) => {
  if (event.source !== window.parent || event.data?.type !== 'workbench-pause') return;
  document.documentElement.classList.toggle('workbench-paused', Boolean(event.data.paused));
  if (event.data.paused) spring.cancel();
  else spring.start();
});

if (!CSS.supports('backdrop-filter', 'url(#switch-filter)')) ui.note.hidden = false;
render();
