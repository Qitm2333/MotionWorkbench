const schema = {
  fishCount: { label: 'Fish count', group: 'Pond', type: 'number', default: 2, min: 0, max: 12, step: 1 },
  paused: { label: 'Paused', group: 'Pond', type: 'boolean', default: false },
  background: { label: 'Background', group: 'Scene', type: 'select', default: 'white', options: [
    { label: 'White', value: 'white' }, { label: 'Black', value: 'black' }, { label: 'Cream', value: 'cream' },
  ] },
  glassOpacity: { label: 'Refraction opacity', group: 'Glass', type: 'number', default: 0.64, min: 0, max: 1, step: 0.01 },
  feed: { label: 'Feed now', group: 'Actions', type: 'boolean', default: false },
  reset: { label: 'Reset pond', group: 'Actions', type: 'boolean', default: false },
}

const initial = window.workbench?.params?.define ? window.workbench.params.define(schema) : {
  fishCount: 2, paused: false, background: 'white', glassOpacity: 0.64, feed: false, reset: false,
}
const desired = { ...initial }
const pending = new Map()

const query = (selector) => document.querySelector(selector)
const click = (selector) => query(selector)?.click()
const readCount = () => Number(query('.glass-count')?.getAttribute('aria-label')?.match(/(?:current|当前)\s*(\d+)/i)?.[1] ?? 2)
const readPaused = () => query('.glass-pause')?.getAttribute('aria-pressed') === 'true'

function setCount(target) {
  const count = readCount()
  const selector = target > count ? '.glass-add-fish' : '.glass-remove-fish'
  for (let index = 0; index < Math.abs(Math.round(target) - count); index += 1) click(selector)
}

function setBackground(target) {
  let guard = 0
  while (document.documentElement.dataset.background !== target && guard < 3) {
    click('#background-switch')
    guard += 1
  }
}

function apply(values, ids = Object.keys(values)) {
  const changed = new Set(ids)
  for (const id of changed) {
    if (id in values) desired[id] = values[id]
    pending.set(id, performance.now() + (id === 'fishCount' ? 10_000 : 1_000))
  }
  if (changed.has('fishCount')) setCount(Number(values.fishCount))
  if (changed.has('paused') && Boolean(values.paused) !== readPaused()) click('.glass-pause')
  if (changed.has('background')) setBackground(String(values.background))
  if (changed.has('glassOpacity')) query('.glass-refraction')?.style.setProperty('opacity', String(values.glassOpacity))
  if (changed.has('feed') && values.feed) click('.glass-feed')
  if (changed.has('reset') && values.reset) query('#pond')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }))
}

const ready = setInterval(() => {
  if (!query('.glass-add-fish')) return
  clearInterval(ready)
  apply(initial)
}, 20)

const onParameters = (event) => apply(event.detail || {}, event.workbenchChange?.ids || Object.keys(event.detail || {}))
document.addEventListener('workbench:params', onParameters)

function settledValue(id, actual) {
  const deadline = pending.get(id)
  if (deadline && actual === desired[id]) pending.delete(id)
  else if (deadline && performance.now() < deadline) return desired[id]
  else if (deadline) pending.delete(id)
  desired[id] = actual
  return actual
}

const publish = setInterval(() => {
  const values = {
    fishCount: settledValue('fishCount', readCount()),
    paused: settledValue('paused', readPaused()),
    background: settledValue('background', document.documentElement.dataset.background || 'white'),
    glassOpacity: settledValue('glassOpacity', Number(query('.glass-refraction')?.style.opacity || 0.64)),
    feed: false,
    reset: false,
  }
  window.parent.postMessage({ type: 'workbench-parameter-values', values }, '*')
}, 250)

addEventListener('pagehide', () => {
  clearInterval(ready)
  clearInterval(publish)
  document.removeEventListener('workbench:params', onParameters)
}, { once: true })
