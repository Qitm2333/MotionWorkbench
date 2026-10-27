export const wakeDefaults = {
  imageScale: 0.78,
  streakAngle: 90,
  streakSpread: 4.5,
  streakAnisotropy: 0,
  trail: true,
  trailRadius: 112,
  trailAmount: 0.48,
  trailDecay: 0.962,
  trailDissipate: 2.2,
  trailSmoothing: 0.32,
  trailBlur: 0.68,
  trailCurl: 0.055,
  trailLift: 0.018,
  paperSlope: 13,
  paperHighlight: 0.42,
  paperShadow: 0.48,
  meshLift: 0.2,
  meshCurl: 0.16,
  meshDrag: 0.18,
  trailWarp: 0.36,
  trailContrast: 0.95,
  trailLevels: 6,
  trailInk: '#1a1a1a',
  trailAccent: '#ffffff',
  trailPaper: '#000000',
}

const schema = {
  imageScale: { label: 'Image scale', group: 'Composition', type: 'number', default: wakeDefaults.imageScale, min: 0.45, max: 1.1, step: 0.01 },
  streakAngle: { label: 'Streak angle', group: 'Wake', type: 'number', default: wakeDefaults.streakAngle, min: 0, max: 180, step: 1 },
  streakSpread: { label: 'Streak spread', group: 'Wake', type: 'number', default: wakeDefaults.streakSpread, min: 0, max: 12, step: 0.1 },
  streakAnisotropy: { label: 'Streak cross blur', group: 'Wake', type: 'number', default: wakeDefaults.streakAnisotropy, min: 0, max: 1, step: 0.01 },
  trail: { label: 'Trail enabled', group: 'Trail', type: 'boolean', default: true },
  trailRadius: { label: 'Brush radius', group: 'Trail', type: 'number', default: wakeDefaults.trailRadius, min: 24, max: 240, step: 1 },
  trailAmount: { label: 'Trail amount', group: 'Trail', type: 'number', default: wakeDefaults.trailAmount, min: 0, max: 1.5, step: 0.01 },
  trailDecay: { label: 'Trail decay', group: 'Trail', type: 'number', default: wakeDefaults.trailDecay, min: 0.8, max: 0.999, step: 0.001 },
  trailDissipate: { label: 'Dissipation', group: 'Trail', type: 'number', default: wakeDefaults.trailDissipate, min: 0, max: 6, step: 0.1 },
  trailSmoothing: { label: 'Pointer smoothing', group: 'Trail', type: 'number', default: wakeDefaults.trailSmoothing, min: 0.02, max: 0.9, step: 0.01 },
  trailBlur: { label: 'Paper blur', group: 'Paper', type: 'number', default: wakeDefaults.trailBlur, min: 0, max: 1.5, step: 0.01 },
  trailCurl: { label: 'Paper curl', group: 'Paper', type: 'number', default: wakeDefaults.trailCurl, min: 0, max: 0.2, step: 0.001 },
  trailLift: { label: 'Paper lift', group: 'Paper', type: 'number', default: wakeDefaults.trailLift, min: 0, max: 0.08, step: 0.001 },
  paperSlope: { label: 'Paper slope', group: 'Paper', type: 'number', default: wakeDefaults.paperSlope, min: 1, max: 30, step: 0.5 },
  paperHighlight: { label: 'Highlight', group: 'Paper', type: 'number', default: wakeDefaults.paperHighlight, min: 0, max: 1, step: 0.01 },
  paperShadow: { label: 'Shadow', group: 'Paper', type: 'number', default: wakeDefaults.paperShadow, min: 0, max: 1, step: 0.01 },
  meshLift: { label: 'Mesh lift', group: 'Mesh', type: 'number', default: wakeDefaults.meshLift, min: 0, max: 0.6, step: 0.01 },
  meshCurl: { label: 'Mesh curl', group: 'Mesh', type: 'number', default: wakeDefaults.meshCurl, min: 0, max: 0.5, step: 0.01 },
  meshDrag: { label: 'Mesh drag', group: 'Mesh', type: 'number', default: wakeDefaults.meshDrag, min: 0, max: 0.6, step: 0.01 },
  trailWarp: { label: 'Warp', group: 'Dither', type: 'number', default: wakeDefaults.trailWarp, min: 0, max: 1, step: 0.01 },
  trailContrast: { label: 'Contrast', group: 'Dither', type: 'number', default: wakeDefaults.trailContrast, min: 0.1, max: 2, step: 0.01 },
  trailLevels: { label: 'Levels', group: 'Dither', type: 'number', default: wakeDefaults.trailLevels, min: 2, max: 12, step: 1 },
  trailInk: { label: 'Ink', group: 'Color', type: 'color', default: wakeDefaults.trailInk },
  trailAccent: { label: 'Accent', group: 'Color', type: 'color', default: wakeDefaults.trailAccent },
  trailPaper: { label: 'Paper', group: 'Color', type: 'color', default: wakeDefaults.trailPaper },
}

export function connectParameters(config) {
  const initial = window.workbench?.params?.define ? window.workbench.params.define(schema) : wakeDefaults
  Object.assign(config, initial)
  const onParams = (event) => Object.assign(config, event.detail || {})
  document.addEventListener('workbench:params', onParams)
  return () => document.removeEventListener('workbench:params', onParams)
}
