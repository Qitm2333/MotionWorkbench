import { createFilter, listenParameters, readParameters } from './glass.js';

const schema = {
  specularOpacity: { type: 'number', label: 'Specular opacity', default: 0.4, min: 0, max: 1, step: 0.01, group: 'Glass' },
  specularSaturation: { type: 'number', label: 'Specular saturation', default: 6, min: 0, max: 50, step: 1, group: 'Glass' },
  refractionLevel: { type: 'number', label: 'Refraction level', default: 1, min: 0, max: 1, step: 0.01, group: 'Glass' },
  blurLevel: { type: 'number', label: 'Blur level', default: 1, min: 0, max: 40, step: 0.1, group: 'Glass' },
  progressiveBlurStrength: { type: 'number', label: 'Progressive blur strength', default: 1, min: 0, max: 10, step: 0.01, group: 'Glass' },
  glassBackgroundOpacity: { type: 'number', label: 'Glass background opacity', default: 0.28, min: 0, max: 1, step: 0.01, group: 'Glass' },
};
const defaults = Object.fromEntries(Object.entries(schema).map(([id, item]) => [id, item.default]));
const params = { ...defaults, ...readParameters(schema, defaults) };
const ui = {
  search: document.querySelector('#albumSearch'),
  grid: document.querySelector('#albumGrid'),
  status: document.querySelector('#searchStatus'),
  title: document.querySelector('#trackTitle'),
  artist: document.querySelector('#trackArtist'),
  artwork: document.querySelector('#trackArtwork'),
  info: document.querySelector('#trackInfo'),
  progress: document.querySelector('#trackProgress'),
  play: document.querySelector('#playButton'),
  glass: document.querySelector('#playerGlass'),
  progressiveBlur: document.querySelector('#progressiveBlur'),
  note: document.querySelector('#compatNote'),
};
const initialGlassRect = ui.glass.getBoundingClientRect();
const filter = createFilter({
  id: 'player-filter',
  width: Math.max(1, Math.round(initialGlassRect.width)),
  height: Math.max(1, Math.round(initialGlassRect.height)),
  radius: initialGlassRect.height / 2,
  bezel: Math.min(14, initialGlassRect.height / 3),
  profile: 'convex-circle',
});
new ResizeObserver(([entry]) => {
  filter.resize(entry.contentRect.width, entry.contentRect.height);
  filter.apply(params);
}).observe(ui.glass);
const demoResults = Array.from({ length: 12 }, (_, index) => ({
  collectionName: ['Electric Bloom', 'Soft Machine', 'Night Signal', 'Blue Current', 'After Image', 'Parallel Lines'][index % 6],
  artistName: ['Workbench Radio', 'Local Preview', 'Glass Studies'][index % 3],
  trackTimeMillis: 165000 + index * 9000,
  coverHue: (index * 37 + 12) % 360,
}));
let results = demoResults;
let selectedIndex = -1;
let currentTime = 0;
let duration = 180;
let playing = false;
let requestId = 0;
let searchTimer = 0;
let lastTick = 0;

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function renderProgress() {
  ui.progress.style.width = `${duration ? (currentTime / duration) * 100 : 0}%`;
}

function renderPlayer() {
  const track = results[selectedIndex];
  ui.title.textContent = track?.trackName || track?.collectionName || 'Search albums';
  ui.artist.textContent = track?.artistName || 'Choose a result to play';
  ui.artwork.src = track?.artworkUrl100?.replace('100x100bb', '300x300bb') || '';
  ui.artwork.hidden = !track?.artworkUrl100;
  ui.info.dataset.selected = String(Boolean(track));
  ui.play.textContent = playing ? 'Ⅱ' : '▶';
  ui.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  renderProgress();
  filter.apply(params);
}

function selectTrack(index) {
  if (!results[index]) return;
  selectedIndex = index;
  duration = Math.max(1, Number(results[index].trackTimeMillis || 180000) / 1000);
  currentTime = 0;
  playing = false;
  renderPlayer();
}

function renderResults() {
  ui.grid.replaceChildren();
  for (const [index, item] of results.entries()) {
    const button = document.createElement('button');
    button.className = 'album';
    button.type = 'button';
    button.setAttribute('aria-label', `Play ${item.collectionName || item.trackName} by ${item.artistName}`);
    const cover = document.createElement('span');
    cover.className = 'cover-wrap';
    const image = document.createElement('img');
    image.src = item.artworkUrl100?.replace('100x100bb', '300x300bb') || '';
    image.hidden = !item.artworkUrl100;
    image.alt = '';
    image.loading = 'lazy';
    cover.style.setProperty('--cover-hue', String(item.coverHue ?? index * 37));
    const play = document.createElement('span');
    play.className = 'cover-play';
    play.setAttribute('aria-hidden', 'true');
    play.textContent = '▶';
    cover.append(image, play);
    const title = document.createElement('span');
    title.className = 'album-title';
    title.textContent = `${item.collectionName || item.trackName} · ${item.artistName}`;
    button.append(cover, title);
    button.addEventListener('click', () => selectTrack(index));
    ui.grid.append(button);
  }
}

async function searchAlbums(term) {
  const searchId = ++requestId;
  if (!term.trim()) {
    results = [];
    selectedIndex = -1;
    ui.status.textContent = 'Enter an artist or album to search.';
    renderResults();
    renderPlayer();
    return;
  }
  ui.status.textContent = 'Searching…';
  try {
    const url = new URL('https://itunes.apple.com/search');
    url.search = new URLSearchParams({ term, entity: 'album', limit: '24' }).toString();
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`Search failed (${response.status})`);
    const payload = await response.json();
    if (searchId !== requestId) return;
    results = Array.isArray(payload.results) ? payload.results : [];
    selectedIndex = -1;
    ui.status.textContent = results.length ? `${results.length} results` : 'No albums found.';
    renderResults();
    renderPlayer();
  } catch {
    if (searchId !== requestId) return;
    results = demoResults;
    selectedIndex = -1;
    ui.status.textContent = 'Offline preview · search service unavailable';
    renderResults();
    renderPlayer();
  }
}

ui.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => searchAlbums(ui.search.value), 250);
});
document.querySelector('#playButton').addEventListener('click', () => {
  if (selectedIndex < 0 && results.length) selectTrack(0);
  playing = !playing;
  lastTick = performance.now();
  renderPlayer();
  if (playing) requestAnimationFrame(tick);
});
document.querySelector('#previousButton').addEventListener('click', () => selectTrack(Math.max(0, selectedIndex - 1)));
document.querySelector('#nextButton').addEventListener('click', () => selectTrack(Math.min(results.length - 1, selectedIndex + 1)));
document.querySelector('#shuffleButton').addEventListener('click', () => {
  if (results.length) selectTrack(Math.floor(Math.random() * results.length));
});
document.querySelector('#repeatButton').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const enabled = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(enabled));
});
document.querySelector('#trackProgress').parentElement.addEventListener('click', (event) => {
  if (!duration) return;
  const rect = event.currentTarget.getBoundingClientRect();
  currentTime = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * duration;
  renderProgress();
});

function tick(now) {
  if (!playing || document.documentElement.classList.contains('workbench-paused')) return;
  currentTime += Math.min((now - lastTick) / 1000, 0.1);
  lastTick = now;
  if (currentTime >= duration) {
    currentTime = 0;
    playing = false;
    renderPlayer();
    return;
  }
  renderProgress();
  requestAnimationFrame(tick);
}

for (const id of Object.keys(schema)) {
  const input = document.querySelector(`#${id}`);
  const output = document.querySelector(`#${id}Out`);
  input.addEventListener('input', () => {
    params[id] = Number(input.value);
    output.value = id === 'blurLevel' ? params[id].toFixed(1).replace(/\.0$/, '') : params[id].toFixed(2);
    ui.progressiveBlur.style.setProperty('--progressive-blur', `${params.progressiveBlurStrength * 3}px`);
    ui.progressiveBlur.style.opacity = String(Math.min(1, params.progressiveBlurStrength / 4));
    ui.glass.style.backgroundColor = `rgba(255,255,255,${params.glassBackgroundOpacity})`;
    renderPlayer();
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
  if (!event.data.paused && playing) { lastTick = performance.now(); requestAnimationFrame(tick); }
});

if (!CSS.supports('backdrop-filter', 'url(#player-filter)')) ui.note.hidden = false;
ui.progressiveBlur.style.setProperty('--progressive-blur', `${params.progressiveBlurStrength * 3}px`);
ui.progressiveBlur.style.opacity = String(Math.min(1, params.progressiveBlurStrength / 4));
ui.glass.style.backgroundColor = `rgba(255,255,255,${params.glassBackgroundOpacity})`;
renderPlayer();
renderResults();
searchAlbums(ui.search.value);
