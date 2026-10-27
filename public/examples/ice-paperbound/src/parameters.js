export const defaults = {
  selectedBook: 'none',
  coverOpen: false,
  hoverLift: 16,
  hoverDepth: 76,
  coverAngle: 2.82,
  motionSpeed: 1,
  cameraZoom: 1,
  parallaxStrength: 1,
  reset: false,
}

const options = ['none', 'form', 'light', 'color', 'matter', 'field', 'notes', 'index'].map((value) => ({ label: value === 'none' ? 'Shelf' : value.toUpperCase(), value }))
const schema = {
  selectedBook: { label: 'Selected volume', group: 'Selection', type: 'select', default: 'none', options },
  coverOpen: { label: 'Cover open', group: 'Selection', type: 'boolean', default: false },
  hoverLift: { label: 'Hover lift', group: 'Motion', type: 'number', default: defaults.hoverLift, min: 0, max: 60, step: 1 },
  hoverDepth: { label: 'Hover depth', group: 'Motion', type: 'number', default: defaults.hoverDepth, min: 0, max: 180, step: 1 },
  coverAngle: { label: 'Cover angle (radians)', group: 'Motion', type: 'number', default: defaults.coverAngle, min: 0.5, max: 3.1, step: 0.01 },
  motionSpeed: { label: 'Motion speed', group: 'Motion', type: 'number', default: defaults.motionSpeed, min: 0.25, max: 3, step: 0.05 },
  cameraZoom: { label: 'Camera zoom', group: 'Camera', type: 'number', default: defaults.cameraZoom, min: 0.7, max: 1.5, step: 0.01 },
  parallaxStrength: { label: 'Pointer parallax', group: 'Camera', type: 'number', default: defaults.parallaxStrength, min: 0, max: 3, step: 0.1 },
  reset: { label: 'Reset shelf', group: 'Actions', type: 'boolean', default: false },
}

export function connectParameters(state, onChange) {
  const initial = window.workbench?.params?.define ? window.workbench.params.define(schema) : defaults
  Object.assign(state, initial)
  const handler = (event) => {
    const next = event.detail || {}
    const changed = new Set(event.workbenchChange?.ids || Object.keys(next))
    for (const id of changed) if (id in schema && id in next) state[id] = next[id]
    if (changed.has('reset') && next.reset) {
      Object.assign(state, { selectedBook: 'none', coverOpen: false, reset: false })
      changed.add('selectedBook')
      changed.add('coverOpen')
    }
    onChange(changed)
    publish(state)
  }
  document.addEventListener('workbench:params', handler)
  onChange(new Set(Object.keys(initial)))
  publish(state)
  return () => document.removeEventListener('workbench:params', handler)
}

export function publish(state) {
  window.parent.postMessage({ type: 'workbench-parameter-values', values: { ...state, reset: false } }, '*')
}
