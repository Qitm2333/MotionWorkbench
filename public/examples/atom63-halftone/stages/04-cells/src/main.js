(() => {
  const canvas = document.querySelector('#halftone')
  const context = canvas?.getContext('2d')
  if (!canvas || !context) throw new Error('Halftone canvas is unavailable')

  const stage = 4
  const stageNames = ['Core disc', 'Ring 1', 'Ring 2', 'Cells', 'Shapes', 'Cursor trail']
  const definitions = {
    gridSpacing: { type: 'number', label: 'Grid spacing', default: 7, min: 3, max: 20, step: .5, group: 'Grid' },
    dotMin: { type: 'number', label: 'Dot minimum', default: .2, min: .1, max: 1, step: .05, group: 'Grid' },
    dotMax: { type: 'number', label: 'Dot maximum', default: 2, min: .5, max: 5, step: .1, group: 'Grid' },
    coreBreathe: { type: 'number', label: 'Core breathe', default: .045, min: 0, max: .15, step: .005, group: 'Core' },
    coreContrast: { type: 'number', label: 'Core contrast', default: 1.4, min: .5, max: 3, step: .1, group: 'Core' },
    coreDriftX: { type: 'number', label: 'Core drift X', default: .48, min: -1.2, max: 1.2, step: .02, group: 'Core' },
    coreDriftY: { type: 'number', label: 'Core drift Y', default: -.32, min: -1.2, max: 1.2, step: .02, group: 'Core' },
    coreDriftLoopSec: { type: 'number', label: 'Drift loop', default: 0, min: 0, max: 24, step: .25, group: 'Core' },
    coreFreq: { type: 'number', label: 'Core frequency', default: 16, min: 1, max: 20, step: .5, group: 'Core' },
    coreSpeed: { type: 'number', label: 'Core speed', default: .72, min: .01, max: 3, step: .01, group: 'Core' },
    innerRadius: { type: 'number', label: 'Core radius', default: .25, min: .05, max: .25, step: .001, group: 'Structure' },
    ring1Radius: { type: 'number', label: 'Ring 1 radius', default: .32, min: .1, max: .45, step: .001, group: 'Structure' },
    ring1Width: { type: 'number', label: 'Ring 1 width', default: .02, min: .005, max: .06, step: .001, group: 'Structure' },
    ring2Radius: { type: 'number', label: 'Ring 2 radius', default: .48, min: .25, max: .72, step: .001, group: 'Structure' },
    ring2Width: { type: 'number', label: 'Ring 2 width', default: .018, min: .005, max: .06, step: .001, group: 'Structure' },
    cellCount: { type: 'number', label: 'Inward cells', default: 9, min: 1, max: 20, step: 1, group: 'Cells' },
    cellSigma: { type: 'number', label: 'Cell spread', default: .026, min: .005, max: .1, step: .001, group: 'Cells' },
    outCellCount: { type: 'number', label: 'Outward cells', default: 7, min: 1, max: 20, step: 1, group: 'Cells' },
    outCellSigma: { type: 'number', label: 'Outward spread', default: .02, min: .005, max: .1, step: .001, group: 'Cells' },
    haloCellCount: { type: 'number', label: 'Halo cells', default: 14, min: 0, max: 36, step: 1, group: 'Cells' },
    haloCellSigma: { type: 'number', label: 'Halo spread', default: .0075, min: .003, max: .018, step: .0005, group: 'Cells' },
    sqCount: { type: 'number', label: 'Shape count', default: 3, min: 1, max: 8, step: 1, group: 'Shapes' },
    sqHalf: { type: 'number', label: 'Shape size', default: 28, min: 8, max: 80, step: 1, group: 'Shapes' },
    sqEdge: { type: 'number', label: 'Shape edge softness', default: 3.5, min: 1, max: 12, step: .5, group: 'Shapes' },
    minSize: { type: 'number', label: 'Shape minimum', default: 6, min: 2, max: 60, step: 1, group: 'Shapes' },
    maxSize: { type: 'number', label: 'Shape maximum', default: 90, min: 20, max: 140, step: 1, group: 'Shapes' },
    shapeDotMin: { type: 'number', label: 'Shape dot minimum', default: .2, min: .05, max: 2, step: .05, group: 'Shapes' },
    shapeDotMax: { type: 'number', label: 'Shape dot maximum', default: 2, min: .2, max: 6, step: .1, group: 'Shapes' },
    trailLife: { type: 'number', label: 'Trail life', default: 1.2, min: .3, max: 3, step: .1, group: 'Cursor trail' },
    trailSigma: { type: 'number', label: 'Trail spread', default: .025, min: .005, max: .08, step: .001, group: 'Cursor trail' },
    hoverRippleBlend: { type: 'number', label: 'Ripple blend', default: .38, min: 0, max: 1, step: .02, group: 'Cursor trail' },
    hoverRippleFade: { type: 'number', label: 'Ripple fade', default: .95, min: .25, max: 4, step: .05, group: 'Cursor trail' },
    hoverRippleGain: { type: 'number', label: 'Ripple gain', default: .62, min: 0, max: 1.6, step: .05, group: 'Cursor trail' },
    hoverRippleLag: { type: 'number', label: 'Ripple lag', default: .072, min: 0, max: .28, step: .005, group: 'Cursor trail' },
    hoverRippleSecondary: { type: 'number', label: 'Secondary ripple', default: .36, min: 0, max: 1.2, step: .05, group: 'Cursor trail' },
    hoverRippleSigma: { type: 'number', label: 'Ripple width', default: .024, min: .008, max: .07, step: .001, group: 'Cursor trail' },
    hoverRippleSpeed: { type: 'number', label: 'Ripple speed', default: .28, min: .08, max: 1.4, step: .02, group: 'Cursor trail' },
    bandVariance: { type: 'number', label: 'Entry band variance', default: 1, min: 0, max: 2, step: .05, group: 'Entry' },
    primaryPeak: { type: 'number', label: 'Entry wave gain', default: 1.3, min: .3, max: 2, step: .05, group: 'Entry' },
    rippleLag: { type: 'number', label: 'Entry wave lag', default: .15, min: .05, max: .3, step: .01, group: 'Entry' },
    secondaryPeak: { type: 'number', label: 'Secondary wave gain', default: .7, min: 0, max: 1.5, step: .05, group: 'Entry' },
    shard: { type: 'number', label: 'Entry shards', default: 1, min: 0, max: 2.5, step: .05, group: 'Entry' },
    wobble: { type: 'number', label: 'Entry wobble', default: .35, min: 0, max: 3, step: .05, group: 'Entry' },
  }
  const defaults = Object.fromEntries(Object.entries(definitions).filter(([, definition]) => definition.type !== 'action').map(([key, definition]) => [key, definition.default]))
  let values = { ...defaults, ...(window.workbench?.params?.define?.(definitions) ?? {}) }
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
  const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
  const gaussian = (distance, sigma) => sigma <= 0 ? 0 : Math.exp(-(distance * distance) / (2 * sigma * sigma))
  const hash = (x, y = 0) => { const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return value - Math.floor(value) }
  const noise = (x, y, time) => {
    const warpedX = x + .32 * Math.sin(y * 3.1 + time * .38)
    const warpedY = y + .32 * Math.cos(x * 2.7 - time * .3)
    return .28 * Math.sin(warpedX * 6.8 + time * .75)
      + .25 * Math.sin(warpedY * 5 - time * .62)
      + .22 * Math.sin((warpedX + warpedY) * 3.8 + time * .52)
      + .25 * Math.sin(Math.hypot(warpedX, warpedY) * 8.5 - time * 1.05)
  }
  const voronoiTone = (x, y) => {
    const column = Math.floor(x)
    const row = Math.floor(y)
    let nearest = Infinity
    let tone = 0
    for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) {
      const cx = column + ox
      const cy = row + oy
      const px = cx + .5 + (hash(cx * 1271 + cy * 311) - .5) * .92
      const py = cy + .5 + (hash(cx * 523 + cy * 1009) - .5) * .92
      const distance = (x - px) ** 2 + (y - py) ** 2
      if (distance < nearest) { nearest = distance; tone = hash(cx * 719 + cy * 997 + 13) }
    }
    return tone
  }
  const pointer = { x: -1, y: -1, active: false }
  let width = 1
  let height = 1
  let dpr = 1
  let time = 0
  let lastFrame = 0
  let entryProgress = 0
  let inwardCells = []
  let outwardCells = []
  let haloCells = []
  let shapes = []
  let trailSamples = []
  let ripples = []
  let lastRipple = { x: 0, y: 0, time: 0 }

  function spawnCell(kind, progress = Math.random()) {
    const inward = kind === 'inward'
    const halo = kind === 'halo'
    return {
      angle: Math.random() * Math.PI * 2,
      startRadius: halo ? .5 + Math.random() * .11 : inward ? .2 + Math.random() * .05 : .01 + Math.random() * .04,
      attractRadius: halo ? .045 + Math.random() * .055 : .32,
      sigma: halo ? values.haloCellSigma * (.62 + Math.random() * .38) : (inward ? values.cellSigma : values.outCellSigma) * (.7 + Math.random() * .4),
      progress,
      speed: halo ? .00085 + Math.random() * .00075 : inward ? .0018 + Math.random() * .0014 : .0016 + Math.random() * .0012,
      wobble: (Math.random() - .5) * (halo ? .22 : inward ? .55 : .35),
    }
  }

  function spawnShape(index, count) {
    const angle = index * 2.39996 + .7
    const radius = .08 + .27 * Math.sqrt((index + 1) / (count + 1))
    const shapeA = ['square', 'circle', 'triangle'][Math.floor(Math.random() * 3)]
    const choices = ['square', 'circle', 'triangle'].filter((shape) => shape !== shapeA)
    const t1 = .15 + Math.random() * .05
    const t2 = t1 + .18 + Math.random() * .08
    const t3 = t2 + .05 + Math.random() * .02
    const t4 = t3 + .16 + Math.random() * .08
    return {
      x: .5 + radius * Math.cos(angle) + (Math.random() - .5) * .06,
      y: .5 + radius * Math.sin(angle) + (Math.random() - .5) * .06,
      driftAmplitude: .04 + Math.random() * .06,
      driftFrequencyX: .18 + Math.random() * .22,
      driftFrequencyY: .14 + Math.random() * .2,
      driftPhaseX: Math.random() * Math.PI * 2,
      driftPhaseY: Math.random() * Math.PI * 2,
      noiseOffset: Math.random() * 100,
      sizeVariation: .55 + Math.random() * .7,
      shapeA,
      shapeB: choices[Math.floor(Math.random() * choices.length)],
      progress: index / count,
      speed: .0018 + Math.random() * .0014,
      t1, t2, t3, t4,
    }
  }

  function reset(rewind = true) {
    inwardCells = Array.from({ length: Math.round(values.cellCount) }, (_, index) => spawnCell('inward', index / values.cellCount))
    outwardCells = Array.from({ length: Math.round(values.outCellCount) }, (_, index) => spawnCell('outward', index / values.outCellCount))
    haloCells = Array.from({ length: Math.round(values.haloCellCount) }, (_, index) => spawnCell('halo', index / Math.max(1, values.haloCellCount)))
    shapes = Array.from({ length: Math.round(values.sqCount) }, (_, index) => spawnShape(index, values.sqCount))
    trailSamples = []
    ripples = []
    pointer.active = false
    lastRipple = { x: 0, y: 0, time: 0 }
    if (rewind) { time = 0; entryProgress = 0 }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect()
    dpr = Math.min(2, window.devicePixelRatio || 1)
    width = Math.max(1, rect.width)
    height = Math.max(1, rect.height)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function sampleCells(x, y, cells, targetRadius, inward) {
    let amount = 0
    for (const cell of cells) {
      const progress = cell.progress
      const eased = inward ? progress ** 3 : 1 - (1 - progress) ** 2.5
      const angle = cell.angle + cell.wobble * Math.sin(progress * Math.PI * (inward ? 2.5 : 2)) * (1 - progress) ** (inward ? 1.6 : 2)
      const radius = cell.startRadius * (1 - eased) + targetRadius * eased
      const cx = .5 + Math.cos(angle) * radius
      const cy = .5 + Math.sin(angle) * radius
      const ageEnvelope = Math.sin(progress * Math.PI) ** (inward ? 1.4 : 1.6)
      const dx = (x - cx) * width
      const dy = (y - cy) * height
      amount += gaussian(Math.hypot(dx, dy), cell.sigma * width) * ageEnvelope
    }
    return Math.min(.75, amount)
  }

  function coreField(dx, dy, radius) {
    const breathing = 1 + values.coreBreathe * Math.sin(time * 1.1) * Math.cos(time * .7)
    const edge = values.innerRadius * breathing
    if (radius >= edge) return 0
    const driftTime = values.coreDriftLoopSec > 0 ? time % values.coreDriftLoopSec : time
    const base = noise(dx * values.coreFreq + values.coreDriftX * driftTime, dy * values.coreFreq + values.coreDriftY * driftTime, time * values.coreSpeed) * .5 + .5
    const cellTone = voronoiTone(dx * values.coreFreq * .78, dy * values.coreFreq * .78)
    const varied = cellTone * (.66 + .34 * base) * values.coreContrast + base * .22
    const contrast = smooth(0, 1, varied * (.34 + .66 * varied))
    return Math.min(1, Math.max(.08, contrast)) * (1 - radius / edge) ** .35
  }

  function ringField(radius, angle, second = false) {
    const ringRadius = second ? values.ring2Radius : values.ring1Radius
    const ringWidth = second ? values.ring2Width : values.ring1Width
    const innerEdge = ringRadius - ringWidth
    if (radius <= innerEdge || radius >= ringRadius) return 0
    const radial = (radius - innerEdge) / ringWidth
    const envelope = Math.sin(radial * Math.PI)
    if (!second) {
      const wave = Math.sin(angle * 6 + time * 1.4) * .3 + Math.sin(angle * 10 - time * .9) * .25 + Math.sin(angle * 3 + time * .7) * .25 + .5
      const delta = Math.abs((angle - time * 1.8 + Math.PI * 3) % (Math.PI * 2) - Math.PI)
      return Math.max(0, wave + gaussian(delta, .12) * .7) * envelope * .9
    }
    const wave = Math.sin(angle * 8 - time * 1.1) * .28 + Math.sin(angle * 14 + time * .8) * .22 + Math.sin(angle * 4 - time * .5) * .25 + .5
    const deltaA = Math.abs((angle - time * 1.2 + Math.PI * 3) % (Math.PI * 2) - Math.PI)
    const deltaB = Math.abs((angle + time * .9 - Math.PI + Math.PI * 3) % (Math.PI * 2) - Math.PI)
    return Math.max(0, wave + gaussian(deltaA, .14) * .6 + gaussian(deltaB, .18) * .4) * envelope * .8
  }

  function sdShape(type, x, y, size) {
    if (type === 'circle') return Math.hypot(x, y) - size
    if (type === 'triangle') {
      const root3 = Math.sqrt(3)
      let px = Math.abs(x) - size
      let py = y + size / root3
      if (px + root3 * py > 0) [px, py] = [(px - root3 * py) * .5, (-root3 * px - py) * .5]
      px -= clamp(px, -2 * size, 0)
      return -Math.hypot(px, py) * Math.sign(py)
    }
    const outsideX = Math.max(Math.abs(x) - size, 0)
    const outsideY = Math.max(Math.abs(y) - size, 0)
    return Math.hypot(outsideX, outsideY) + Math.min(Math.max(Math.abs(x) - size, Math.abs(y) - size), 0)
  }

  function shapeState(shape) {
    let scale = 1
    let morph = 0
    if (shape.progress < shape.t1) {
      const t = shape.progress / shape.t1
      scale = Math.max(0, 1 + .28 * Math.sin(t * Math.PI * 4) * (1 - t) - (1 - t) ** 3 * 1.28)
    } else if (shape.progress < shape.t2) {
      scale = 1
    } else if (shape.progress < shape.t3) {
      const t = (shape.progress - shape.t2) / (shape.t3 - shape.t2)
      morph = Math.max(0, Math.min(1, 1 + .25 * Math.sin(t * Math.PI * 3) * (1 - t) - (1 - t) ** 3 * 1.25))
    } else if (shape.progress < shape.t4) {
      morph = 1
    } else {
      scale = 1 - ((shape.progress - shape.t4) / (1 - shape.t4)) ** 2
      morph = 1
    }
    return { scale, morph }
  }

  function shapeField(x, y) {
    let amount = 0
    for (const shape of shapes) {
      const { scale, morph } = shapeState(shape)
      if (scale < .01) continue
      const cx = (shape.x + Math.sin(time * shape.driftFrequencyX + shape.driftPhaseX) * shape.driftAmplitude) * width
      const cy = (shape.y + Math.sin(time * shape.driftFrequencyY + shape.driftPhaseY) * shape.driftAmplitude) * height
      const targetSize = values.minSize + shape.sizeVariation * (values.maxSize - values.minSize)
      const half = targetSize * scale
      const px = x * width - cx
      const py = y * height - cy
      const da = sdShape(shape.shapeA, px, py, half)
      const db = sdShape(shape.shapeB, px, py, half)
      const distance = Math.abs(da + (db - da) * morph)
      const edge = values.sqEdge * .55
      const intensity = gaussian(distance, edge)
      amount = Math.max(amount, Math.min(1, intensity * scale * 4))
    }
    return amount
  }

  function cursorField(x, y) {
    let trail = 0
    for (const sample of trailSamples) {
      const age = time - sample.time
      if (age < 0 || age >= values.trailLife) continue
      const weight = (1 - age / values.trailLife) ** 2 * sample.weight
      const dx = (x - sample.x) * width
      const dy = (y - sample.y) * height
      const texture = .3 + (noise(x * 4.5, y * 4.5, time * .35) * .5 + .5) * 1.5
      trail += gaussian(Math.hypot(dx, dy), values.trailSigma * width) * weight * texture
    }
    let ripple = 0
    for (const point of ripples) {
      const age = time - point.time
      if (age >= 6 || age < 0) continue
      const radius = Math.min(age * values.hoverRippleSpeed * width, Math.hypot(width, height) * 1.25)
      const distance = Math.hypot((x - point.x) * width, (y - point.y) * height)
      ripple += gaussian(distance - radius, values.hoverRippleSigma * width) * values.hoverRippleGain * Math.exp(-age * values.hoverRippleFade)
      const lag = Math.max(0, age - values.hoverRippleLag)
      if (lag > 0) ripple += gaussian(distance - Math.min(lag * values.hoverRippleSpeed * width, Math.hypot(width, height) * 1.25), values.hoverRippleSigma * width * 1.12) * values.hoverRippleGain * values.hoverRippleSecondary * Math.exp(-age * values.hoverRippleFade)
    }
    return { trail: Math.min(1, trail), ripple: Math.min(1, ripple * values.hoverRippleBlend) }
  }

  function entryWave(radius, angle) {
    if (entryProgress >= 1) return { visible: true, wave: 0, layers: [1, 1, 1, 1, 1, 1] }
    const progress = entryProgress
    const bandWobble = values.wobble * (.038 * Math.sin(angle * 3 + 1.4) + .024 * Math.sin(angle * 7 - .8) + .014 * Math.sin(angle * 11 + 2.1))
    const shard = values.shard * (((hash(Math.floor(angle * 19), Math.floor(angle * 47)) * .52) + hash(Math.floor(angle * 47), Math.floor(angle * 11)) * .33 - .5) * .15)
    const bandWidth = .09 * (1 + values.bandVariance * (.35 * Math.sin(angle * 4 + 1.7) + .15 * Math.sin(angle * 9 - 2.3)))
    let front
    let wave
    if (progress < .5) {
      const phase = progress <= .3 ? (1 - (1 - progress / .3) ** 3) * .8 : progress <= .4 ? .8 : .8 * (1 - ((progress - .4) / .1) ** 3)
      front = phase
      wave = gaussian(radius - phase, .032) * values.primaryPeak
      return { visible: Math.abs(radius - phase) <= .09, wave, layers: [0, 0, 0, 0, 0, 0] }
    }
    const phase = (progress - .5) / .5
    front = Math.max(0, phase + bandWobble + shard)
    const secondFront = Math.max(0, phase - values.rippleLag + bandWobble + shard)
    const firstWave = gaussian(radius - front, .032) * values.primaryPeak
    const secondWave = phase > values.rippleLag ? gaussian(radius - secondFront, .055) * values.secondaryPeak * smooth(values.rippleLag, values.rippleLag + .05, phase) : 0
    wave = Math.max(firstWave, secondWave)
    if (phase < .55) return { visible: Math.abs(radius - front) <= bandWidth || Math.abs(radius - secondFront) <= bandWidth, wave, layers: [0, 0, 0, 0, 0, 0] }
    const reveal = smooth(.55, 1, phase)
    const layerProgress = [smooth(.55, .7, phase), smooth(.68, .82, phase), smooth(.78, .92, phase), smooth(.86, 1, phase), smooth(.9, 1, phase), smooth(.8, .95, phase)]
    return { visible: reveal > .01, wave: wave * (1 - smooth(.55, .85, phase)) * .85, layers: layerProgress }
  }

  function fieldAt(x, y) {
    const dx = (x - .5)
    const dy = (y - .5) * height / width
    const radius = Math.hypot(dx, dy)
    const angle = Math.atan2(dy, dx)
    const entry = entryWave(radius, angle)
    if (!entry.visible) return null

    const inward = stage >= 4 ? sampleCells(x, y, inwardCells, values.ring2Radius, true) : 0
    const outward = stage >= 4 ? sampleCells(x, y, outwardCells, values.ring2Radius, false) : 0
    const halo = stage >= 4 ? sampleCells(x, y, haloCells, values.ring2Radius + .08, true) : 0
    let coreAndRings = 0
    if (stage >= 1) coreAndRings += coreField(dx, dy, radius) * entry.layers[0]
    if (stage >= 2) coreAndRings += ringField(radius, angle) * entry.layers[1]
    if (stage >= 3) coreAndRings += ringField(radius, angle, true) * entry.layers[2]
    const cells = Math.min(.75, inward + outward + halo) * entry.layers[3]
    const pointerSources = stage >= 6 ? cursorField(x, y) : { trail: 0, ripple: 0 }
    const shapesValue = stage >= 5 ? shapeField(x, y) * entry.layers[4] : 0
    return {
      structure: Math.min(1, coreAndRings + cells + entry.wave),
      trail: Math.min(1, pointerSources.trail + pointerSources.ripple) * entry.layers[5],
      shape: shapesValue,
    }
  }

  function updateEntities(frameScale) {
    const advanceCells = (cells, kind) => {
      for (let index = 0; index < cells.length; index += 1) {
        cells[index].progress += cells[index].speed * frameScale
        if (cells[index].progress >= 1) cells[index] = spawnCell(kind)
      }
    }
    advanceCells(inwardCells, 'inward')
    advanceCells(outwardCells, 'outward')
    advanceCells(haloCells, 'halo')
    for (let index = 0; index < shapes.length; index += 1) {
      shapes[index].progress += shapes[index].speed * frameScale
      if (shapes[index].progress >= 1) shapes[index] = spawnShape(index, shapes.length)
    }
  }

  function drawDot(x, y, structure, trail, shape, variation) {
    if (structure >= .012) {
      const radius = values.dotMin + structure * (values.dotMax - values.dotMin)
      context.beginPath()
      context.arc(x, y, radius * variation, 0, Math.PI * 2)
      context.fillStyle = `rgba(255,255,255,${Math.min(1, .04 + structure * .96)})`
      context.fill()
    }
    if (trail > .01) {
      const texture = .3 + (noise(x / width * 4.5, y / height * 4.5, time * .35) * .5 + .5) * 1.5
      const radius = (values.dotMin + trail * (values.dotMax - values.dotMin)) * variation * texture
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fillStyle = `rgba(255,255,255,${Math.min(1, .15 + trail * .8)})`
      context.fill()
    }
    if (shape >= .012) {
      const radius = values.shapeDotMin + Math.sqrt(shape) * (values.shapeDotMax - values.shapeDotMin)
      context.beginPath()
      context.arc(x, y, radius * variation, 0, Math.PI * 2)
      context.fillStyle = `rgba(255,255,255,${Math.min(1, .04 + shape * .96)})`
      context.fill()
    }
  }

  function draw(now) {
    const frameScale = Math.min(2, Math.max(0, (now - (lastFrame || now)) / 16.667))
    lastFrame = now
    const dt = frameScale / 60
    time += dt
    entryProgress = Math.min(1, entryProgress + dt / .2)
    updateEntities(frameScale)
    context.fillStyle = '#1c1c1c'
    context.fillRect(0, 0, width, height)
    const spacing = Math.max(3, Number(values.gridSpacing))
    const columns = Math.ceil(width / spacing) + 2
    const rows = Math.ceil(height / spacing) + 2
    for (let row = -1; row < rows; row += 1) {
      const y = row * spacing - spacing
      const offset = row % 2 === 0 ? 0 : spacing * .5
      for (let column = -1; column < columns; column += 1) {
        const x = column * spacing + offset - spacing
        const field = fieldAt(x / width, y / height)
        if (!field || (field.structure < .012 && field.trail < .01 && field.shape < .012)) continue
        const variation = .65 + hash(column, row) * .35
        drawDot(x, y, field.structure, field.trail, field.shape, variation)
      }
    }
    trailSamples = trailSamples.filter((sample) => time - sample.time < values.trailLife)
    ripples = ripples.filter((point) => time - point.time < 6)
    requestAnimationFrame(draw)
  }

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) * width / rect.width
    const y = (event.clientY - rect.top) * height / rect.height
    const active = pointer.active
    const distance = Math.hypot(x - lastRipple.x, y - lastRipple.y)
    const now = time
    pointer.x = x / width
    pointer.y = y / height
    pointer.active = true
    if (values.hoverRippleGain > 0 && values.hoverRippleBlend > 0 && (!active || distance >= 9 || now - lastRipple.time >= .048)) {
      ripples.push({ x: pointer.x, y: pointer.y, time: now })
      if (ripples.length > 36) ripples.splice(0, ripples.length - 36)
      lastRipple = { x, y, time: now }
    }
    trailSamples.push({ x: pointer.x, y: pointer.y, time: now, weight: 1 })
    if (trailSamples.length > 48) trailSamples.shift()
  }

  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerleave', () => { pointer.active = false })
  canvas.addEventListener('pointercancel', () => { pointer.active = false })
  document.querySelector('#replay')?.addEventListener('click', () => reset(true))
  document.querySelector('#reset')?.addEventListener('click', () => {
    values = { ...defaults }
    reset(true)
    parent.postMessage({ type: 'workbench-parameter-values', values }, '*')
  })
  document.addEventListener('workbench:params', (event) => {
    values = { ...values, ...(event.detail?.values || event.detail || {}) }
    const countsChanged = Math.round(values.cellCount) !== inwardCells.length
      || Math.round(values.outCellCount) !== outwardCells.length
      || Math.round(values.haloCellCount) !== haloCells.length
      || Math.round(values.sqCount) !== shapes.length
    if (countsChanged) reset(false)
    parent.postMessage({ type: 'workbench-parameter-values', values }, '*')
  })
  window.addEventListener('resize', resize)
  resize()
  reset()
  requestAnimationFrame(draw)
})()
