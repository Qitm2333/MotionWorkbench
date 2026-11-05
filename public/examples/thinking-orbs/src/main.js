import { MODE_FRAMES } from './engine/registry.js';
import { paintFrame } from './engine/core.js';
import { resolvePreset } from './presets.js';

const STATES = [
  ['working', 'Particles on tilted orbits'],
  ['searching', 'A scan sweeps a dotted globe'],
  ['solving', 'Bands scramble, then solve'],
  ['listening', 'A waveform rolls through rings'],
  ['connecting', 'A constellation wires itself'],
  ['weaving', 'Three strands plait around a sphere'],
  ['composing', 'An undulating multi-band sash'],
  ['breathing', 'A ring slowly changes shape'],
  ['shaping', 'Circle → triangle → square'],
];
const LABELS = Object.fromEntries(STATES.map(([state]) => [state, state[0].toUpperCase() + state.slice(1)]));
const root = document.querySelector('.workbench-orbs');
const hero = document.querySelector('.hero-orb');
const heroContext = hero.getContext('2d');
const speedInput = document.querySelector('[data-speed]');
const speedOutput = document.querySelector('[data-speed-output]');
const playButton = document.querySelector('[data-play]');
const stateName = document.querySelector('[data-state-name]');
const presetSize = document.querySelector('[data-preset-size]');
const stateList = document.querySelector('[data-states]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const values = {
  state: 'listening',
  size: '64',
  speed: 1,
  theme: 'dark',
  paused: true,
};
const schema = {
  state: { type: 'select', label: 'Motion state', default: values.state, group: 'Orb', options: STATES.map(([value]) => ({ label: value[0].toUpperCase() + value.slice(1), value })) },
  size: { type: 'select', label: 'Tuned size preset', default: values.size, group: 'Orb', options: [{ label: '20 px · inline', value: '20' }, { label: '64 px · avatar', value: '64' }] },
  speed: { type: 'number', label: 'Speed multiplier', default: values.speed, min: 0.25, max: 3, step: 0.05, group: 'Motion' },
  theme: { type: 'select', label: 'Ink theme', default: values.theme, group: 'Appearance', options: [{ label: 'Dark substrate', value: 'dark' }, { label: 'Light substrate', value: 'light' }] },
  paused: { type: 'boolean', label: 'Paused', default: values.paused, group: 'Motion' },
};
Object.assign(values, window.workbench?.params?.define?.(schema) || {});

let clockOrigin = performance.now();
let frameHandle = 0;
let running = false;
let frozenTime = 0.6;
let lastTime = 0;
let lastState = '';
let lastSize = '';

function draw(ctx, size, state, seconds, multiplier, theme) {
  const { mode, speed, opts } = resolvePreset(state, size);
  const frame = MODE_FRAMES[mode](size, seconds * speed * multiplier, opts);
  paintFrame(ctx, frame, theme === 'dark');
}

function refreshControls() {
  root.dataset.theme = values.theme;
  stateName.textContent = LABELS[values.state];
  presetSize.textContent = `${values.size} px preset`;
  speedInput.value = String(Math.round(Number(values.speed) * 100));
  speedOutput.value = `${Number(values.speed).toFixed(2)}×`;
  playButton.textContent = values.paused ? 'Play' : 'Pause';
  playButton.setAttribute('aria-pressed', String(!values.paused));
  hero.setAttribute('aria-label', `${LABELS[values.state]} animation`);
  for (const button of stateList.querySelectorAll('[data-state]')) {
    button.setAttribute('aria-pressed', String(button.dataset.state === values.state));
  }
  for (const button of document.querySelectorAll('[data-theme-choice]')) {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === values.theme));
  }
}

function drawHero(seconds, force = false) {
  if (!force && values.paused && seconds === lastTime && values.state === lastState && values.size === lastSize) return;
  const size = Number(values.size);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const backingSize = Math.round(128 * dpr);
  if (hero.width !== backingSize || hero.height !== backingSize) {
    hero.width = backingSize;
    hero.height = backingSize;
  }
  const zoom = 128 / size;
  heroContext.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
  heroContext.clearRect(0, 0, size, size);
  draw(heroContext, size, values.state, reducedMotion.matches ? 0.6 : seconds, Number(values.speed), values.theme);
  lastTime = seconds;
  lastState = values.state;
  lastSize = values.size;
}

function renderStateChoices() {
  stateList.replaceChildren();
  const size = 20;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  for (const [state, description] of STATES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'state-button';
    button.dataset.state = state;
    button.setAttribute('aria-pressed', String(values.state === state));
    button.setAttribute('aria-label', `${state}: ${description}`);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, size, state, 0.6, 1, values.theme);
    const copy = document.createElement('span');
    copy.className = 'state-copy';
    const title = document.createElement('strong');
    title.textContent = LABELS[state];
    const note = document.createElement('small');
    note.textContent = description;
    copy.append(title, note);
    button.append(canvas, copy);
    button.addEventListener('click', () => setValues({ state }));
    stateList.append(button);
  }
}

function setValues(next) {
  if (next.paused === true && !values.paused) frozenTime = (performance.now() - clockOrigin) / 1000;
  Object.assign(values, next);
  refreshControls();
  drawHero(reducedMotion.matches ? 0.6 : values.paused ? frozenTime : (performance.now() - clockOrigin) / 1000, true);
  if (values.paused || reducedMotion.matches || document.visibilityState === 'hidden') stop();
  else start();
  window.parent.postMessage({ type: 'workbench-parameter-values', values: { ...values } }, '*');
}

speedInput.addEventListener('input', () => setValues({ speed: Number(speedInput.value) / 100 }));
playButton.addEventListener('click', () => setValues({ paused: !values.paused }));
document.querySelectorAll('[data-theme-choice]').forEach((button) => {
  button.addEventListener('click', () => {
    setValues({ theme: button.dataset.themeChoice });
    renderStateChoices();
  });
});
document.addEventListener('workbench:params', (event) => setValues(event.detail || {}));
window.addEventListener('message', (event) => {
  if (event.data?.type === 'workbench-reset') {
    clockOrigin = performance.now();
    frozenTime = 0.6;
    setValues({ ...schemaDefaults(), paused: true });
  }
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    stop();
    drawHero(0.6, true);
  } else if (!values.paused) start();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') stop();
  else if (!values.paused && !reducedMotion.matches) start();
});

function schemaDefaults() {
  return Object.fromEntries(Object.entries(schema).map(([id, definition]) => [id, definition.default]));
}

function tick(now) {
  const seconds = (now - clockOrigin) / 1000;
  if (!running) return;
  drawHero(seconds);
  frameHandle = requestAnimationFrame(tick);
}

function start() {
  if (running || values.paused || reducedMotion.matches || document.visibilityState === 'hidden') return;
  running = true;
  frameHandle = requestAnimationFrame(tick);
}

function stop() {
  running = false;
  cancelAnimationFrame(frameHandle);
}

renderStateChoices();
refreshControls();
drawHero(0.6, true);
window.addEventListener('pagehide', stop, { once: true });
