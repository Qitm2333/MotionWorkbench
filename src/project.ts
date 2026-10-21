export type ProjectManifest = {
  formatVersion: 1
  name: string
  entry: string
  projectType: 'canvas2d' | 'html'
  renderer: { type: 'canvas2d'; width: number; height: number; background: string } | { type: 'html' }
  sourceFiles?: string[]
  parameterValues?: Record<string, number | boolean | string>
  curves?: CurveResource[]
}

export type CurveResource =
  | { id: string; name: string; type: 'linear' }
  | { id: string; name: string; type: 'cubic-bezier'; points: [number, number, number, number] }
  | { id: string; name: string; type: 'spring'; mass: number; stiffness: number; damping: number }

export type CurvePreset = {
  id: string
  label: string
  group: 'Basic' | 'Ease' | 'Expressive'
  curve: CurveResource
}

export const curvePresets: CurvePreset[] = [
  { id: 'linear', label: 'Linear', group: 'Basic', curve: { id: '', name: 'Linear', type: 'linear' } },
  { id: 'ease', label: 'Ease', group: 'Ease', curve: { id: '', name: 'Ease', type: 'cubic-bezier', points: [0.25, 0.1, 0.25, 1] } },
  { id: 'ease-in', label: 'Ease in', group: 'Ease', curve: { id: '', name: 'Ease in', type: 'cubic-bezier', points: [0.42, 0, 1, 1] } },
  { id: 'ease-out', label: 'Ease out', group: 'Ease', curve: { id: '', name: 'Ease out', type: 'cubic-bezier', points: [0, 0, 0.58, 1] } },
  { id: 'ease-in-out', label: 'Ease in out', group: 'Ease', curve: { id: '', name: 'Ease in out', type: 'cubic-bezier', points: [0.42, 0, 0.58, 1] } },
  { id: 'ease-in-sine', label: 'Sine in', group: 'Ease', curve: { id: '', name: 'Sine in', type: 'cubic-bezier', points: [0.12, 0, 0.39, 0] } },
  { id: 'ease-out-sine', label: 'Sine out', group: 'Ease', curve: { id: '', name: 'Sine out', type: 'cubic-bezier', points: [0.61, 1, 0.88, 1] } },
  { id: 'ease-in-out-sine', label: 'Sine in out', group: 'Ease', curve: { id: '', name: 'Sine in out', type: 'cubic-bezier', points: [0.37, 0, 0.63, 1] } },
  { id: 'ease-in-quad', label: 'Quad in', group: 'Ease', curve: { id: '', name: 'Quad in', type: 'cubic-bezier', points: [0.11, 0, 0.5, 0] } },
  { id: 'ease-out-quad', label: 'Quad out', group: 'Ease', curve: { id: '', name: 'Quad out', type: 'cubic-bezier', points: [0.5, 1, 0.89, 1] } },
  { id: 'ease-in-out-quad', label: 'Quad in out', group: 'Ease', curve: { id: '', name: 'Quad in out', type: 'cubic-bezier', points: [0.45, 0, 0.55, 1] } },
  { id: 'overshoot', label: 'Back / overshoot', group: 'Expressive', curve: { id: '', name: 'Back out', type: 'cubic-bezier', points: [0.34, 1.56, 0.64, 1] } },
  { id: 'spring-gentle', label: 'Spring gentle', group: 'Expressive', curve: { id: '', name: 'Spring gentle', type: 'spring', mass: 1, stiffness: 120, damping: 18 } },
  { id: 'spring-snappy', label: 'Spring snappy', group: 'Expressive', curve: { id: '', name: 'Spring snappy', type: 'spring', mass: 1, stiffness: 210, damping: 20 } },
  { id: 'spring-bouncy', label: 'Spring bouncy', group: 'Expressive', curve: { id: '', name: 'Spring bouncy', type: 'spring', mass: 1, stiffness: 120, damping: 10 } },
]

export function createCurveFromPreset(presetId: string, id: string): CurveResource | undefined {
  const preset = curvePresets.find((candidate) => candidate.id === presetId)
  if (!preset) return undefined
  return preset.curve.type === 'cubic-bezier'
    ? { ...preset.curve, id, points: [...preset.curve.points] }
    : { ...preset.curve, id }
}

export function sampleCurveValue(curve: CurveResource, progress: number) {
  const x = Math.max(0, Math.min(1, progress))
  if (curve.type === 'linear') return x
  if (curve.type === 'spring') {
    const response = (t: number) => {
      if (t === 0) return 0
      const omega = Math.sqrt(curve.stiffness / curve.mass)
      const dampingRatio = curve.damping / (2 * Math.sqrt(curve.stiffness * curve.mass))
      if (dampingRatio < 1) {
        const dampedOmega = omega * Math.sqrt(1 - dampingRatio ** 2)
        return 1 - Math.exp(-dampingRatio * omega * t) * (Math.cos(dampedOmega * t) + dampingRatio / Math.sqrt(1 - dampingRatio ** 2) * Math.sin(dampedOmega * t))
      }
      if (dampingRatio === 1) return 1 - Math.exp(-omega * t) * (1 + omega * t)
      const root = Math.sqrt(dampingRatio ** 2 - 1)
      const slow = -omega * (dampingRatio - root)
      const fast = -omega * (dampingRatio + root)
      return 1 - ((fast * Math.exp(slow * t) - slow * Math.exp(fast * t)) / (fast - slow))
    }
    if (x === 0) return 0
    const duration = 1.2
    const end = response(duration)
    if (x === 1) return 1
    const value = response(x * duration)
    return value + x * (1 - end)
  }
  if (x === 0 || x === 1) return x
  const [x1, y1, x2, y2] = curve.points
  const cubic = (t: number, a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3
  let low = 0
  let high = 1
  for (let iteration = 0; iteration < 20; iteration++) {
    const middle = (low + high) / 2
    if (cubic(middle, x1, x2) < x) low = middle
    else high = middle
  }
  return cubic((low + high) / 2, y1, y2)
}

export type Project = {
  manifest: ProjectManifest
  files: Record<string, string>
}

export type DirectoryHandle = FileSystemDirectoryHandle & {
  requestPermission?: (options: { mode: 'readwrite' }) => Promise<PermissionState>
}

export const starterProject: Project = {
  manifest: {
    formatVersion: 1,
    name: 'Orbit study',
    entry: 'src/main.ts',
    projectType: 'canvas2d',
    renderer: { type: 'canvas2d', width: 960, height: 600, background: '#f2f1ed' },
    curves: [{ id: 'ease-orbit', name: 'Orbit ease', type: 'cubic-bezier', points: [0.42, 0, 0.58, 1] }],
  },
  files: {
    'src/workbench.d.ts': `type WorkbenchParameterDefinition =
  | { type: 'number'; label: string; default: number; min: number; max: number; step?: number; group?: string }
  | { type: 'boolean'; label: string; default: boolean; group?: string }
  | { type: 'color'; label: string; default: string; group?: string }
  | { type: 'select'; label: string; default: string; options: Array<{ label: string; value: string }>; group?: string }

interface WorkbenchParameterApi {
  define<const T extends Record<string, WorkbenchParameterDefinition>>(definitions: T): { [K in keyof T]: T[K]['default'] }
}

interface WorkbenchCurveApi {
  sample(id: string, progress: number): number
}

interface WorkbenchCanvasContext {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  background: string
  params: WorkbenchParameterApi
  curves: WorkbenchCurveApi
}

interface WorkbenchFrame {
  time: number
  delta: number
}

interface WorkbenchScene {
  update?: (frame: WorkbenchFrame) => void
  render?: (frame: WorkbenchFrame) => void
  dispose?: () => void
}
`,
    'src/main.ts': `import { createOrbitScene } from './orbit-scene'

export function create(context: WorkbenchCanvasContext) {
  return createOrbitScene(context)
}
`,
    'src/orbit-scene.ts': `export function createOrbitScene({ canvas, ctx, width, height, params: parameterApi, curves }: WorkbenchCanvasContext): WorkbenchScene {
  const params = parameterApi.define({
    particleCount: { type: 'number', label: 'Particle count', default: 90, min: 20, max: 180, step: 1, group: 'Particles' },
    orbitSpeed: { type: 'number', label: 'Orbit speed', default: 1, min: 0.2, max: 2.5, step: 0.1, group: 'Motion' },
    orbitDirection: { type: 'select', label: 'Orbit direction', default: 'forward', options: [{ label: 'Forward', value: 'forward' }, { label: 'Reverse', value: 'reverse' }], group: 'Motion' },
    showOrbits: { type: 'boolean', label: 'Show orbit guides', default: true, group: 'Display' },
    particleColor: { type: 'color', label: 'Particle color', default: '#438a82', group: 'Display' },
  })
  let time = 0
  let pointerX = Number.NEGATIVE_INFINITY
  let pointerY = Number.NEGATIVE_INFINITY
  let hoverProgress = 0
  const particles = Array.from({ length: 180 }, (_, index) => ({
    phase: (index / 180) * Math.PI * 2,
    radius: 28 + (index % 8) * 11,
    size: 2 + (index % 4) * 0.7,
  }))
  const updatePointer = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect()
    pointerX = (event.clientX - bounds.left) * width / bounds.width
    pointerY = (event.clientY - bounds.top) * height / bounds.height
  }
  const clearPointer = () => { pointerX = pointerY = Number.NEGATIVE_INFINITY }
  canvas.addEventListener('pointermove', updatePointer)
  canvas.addEventListener('pointerleave', clearPointer)

  return {
    update(frame) {
      time += frame.delta
      const distance = Math.hypot(pointerX - width / 2, pointerY - height / 2)
      const target = distance < 48 ? 1 : 0
      hoverProgress += (target - hoverProgress) * Math.min(1, frame.delta * 8)
    },
    render() {
      ctx.fillStyle = '#f2f1ed'
      ctx.fillRect(0, 0, width, height)
      const cx = width / 2
      const cy = height / 2
      const scale = Math.min(width, height) * 0.31
      ctx.strokeStyle = 'rgba(28, 45, 41, 0.10)'
      ctx.lineWidth = 1
      if (params.showOrbits) {
        for (let ring = 1; ring <= 4; ring++) {
          ctx.beginPath()
          ctx.arc(cx, cy, scale * ring / 4, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      for (const particle of particles.slice(0, params.particleCount)) {
        const direction = params.orbitDirection === 'reverse' ? -1 : 1
        const angle = particle.phase + time * params.orbitSpeed * direction * (0.28 + particle.radius / 210)
        const easedPulse = curves.sample('ease-orbit', (Math.sin(time * 0.5) + 1) / 2)
        const radius = particle.radius * (0.9 + easedPulse * 0.2)
        const x = cx + Math.cos(angle) * radius * (scale / 55)
        const y = cy + Math.sin(angle * 1.13) * radius * 0.56 * (scale / 55)
        ctx.beginPath()
        ctx.fillStyle = params.particleColor
        ctx.arc(x, y, particle.size * (scale / 160), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.beginPath()
      ctx.fillStyle = '#d2603f'
      ctx.arc(cx, cy, 5 + curves.sample('ease-orbit', hoverProgress) * 17, 0, Math.PI * 2)
      ctx.fill()
    },
    dispose() {
      canvas.removeEventListener('pointermove', updatePointer)
      canvas.removeEventListener('pointerleave', clearPointer)
    },
  }
}
`,
  },
}

export const starterHtmlProject: Project = {
  manifest: {
    formatVersion: 1,
    name: 'Motion postcard',
    entry: 'index.html',
    projectType: 'html',
    renderer: { type: 'html' },
  },
  files: {
    'index.html': `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Motion postcard</title>\n  <link rel="stylesheet" href="./styles.css" />\n  <script>\n    workbench.params.define({\n      orbitSpeed: { type: 'number', label: 'Orbit speed', default: 1, min: 0.3, max: 2.5, step: 0.1, group: 'Motion' },\n      showOrbits: { type: 'boolean', label: 'Show orbit guides', default: true, group: 'Display' },\n      sunColor: { type: 'color', label: 'Sun color', default: '#f1c870', group: 'Display' },\n      orbitShape: { type: 'select', label: 'Orbit shape', default: '50%', options: [{ label: 'Round', value: '50%' }, { label: 'Soft square', value: '18%' }, { label: 'Sharp', value: '0%' }], group: 'Display' },\n    })\n  </script>\n</head>\n<body>\n  <main class="scene">\n    <div class="orbit orbit-one"><i></i></div>\n    <div class="orbit orbit-two"><i></i></div>\n    <div class="sun"></div>\n    <p>SMALL MOTIONS<br /><span>BIG FEELINGS</span></p>\n    <small>AN HTML + CSS STUDY</small>\n  </main>\n</body>\n</html>\n`,
    'styles.css': `* { box-sizing: border-box; }\nhtml, body { width: 100%; height: 100%; margin: 0; }\nbody { display: grid; place-items: center; overflow: hidden; color: #f5f4ec; background: #224f43; font-family: Georgia, serif; }\n.scene { width: min(78vw, 540px); aspect-ratio: 4 / 3; position: relative; display: grid; place-items: center; overflow: hidden; border-radius: var(--param-orbitShape, 0%); background: #d57c59; }\n.scene::before, .scene::after { content: ''; position: absolute; inset: 8%; border: 1px solid #f5f4ec55; border-radius: 50%; transform: rotate(-24deg) scaleY(.62); opacity: var(--param-showOrbits, 1); }\n.scene::after { inset: 14%; transform: rotate(24deg) scaleY(.62); }\n.sun { position: absolute; width: 25%; aspect-ratio: 1; border-radius: 50%; background: var(--param-sunColor, #f1c870); box-shadow: 0 0 60px #f1c87066; animation: breathe 4s ease-in-out infinite; }\n.orbit { position: absolute; width: 61%; height: 38%; border: 1px solid #fff9; border-radius: 50%; animation: turn calc(9s / var(--param-orbitSpeed, 1)) linear infinite; opacity: var(--param-showOrbits, 1); }\n.orbit-two { width: 76%; height: 53%; transform: rotate(55deg); animation-duration: calc(13s / var(--param-orbitSpeed, 1)); animation-direction: reverse; }\n.orbit i { position: absolute; top: 50%; left: -5px; width: 10px; height: 10px; border-radius: 50%; background: #f5f4ec; }\n.scene p { position: relative; z-index: 1; margin: 0; text-align: center; font-size: clamp(20px, 5vw, 38px); line-height: 1.15; }\n.scene p span { color: #224f43; font-style: italic; }\n.scene small { position: absolute; bottom: 18px; z-index: 1; font: 9px 'Courier New', monospace; letter-spacing: 0; }\n@keyframes turn { to { rotate: 360deg; } }\n@keyframes breathe { 50% { scale: .88; opacity: .75; } }\n`,
  },
}

export const normalizeProjectPath = (path: string) => {
  if (!path || path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)) throw new Error(`Project path must be relative: ${path}`)
  const parts: string[] = []
  for (const part of path.replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (!parts.length) throw new Error(`Project path escapes the project folder: ${path}`)
      parts.pop()
    }
    else parts.push(part)
  }
  if (!parts.length) throw new Error(`Project path is empty: ${path}`)
  return parts.join('/')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validateCurve(value: unknown, ids: Set<string>): CurveResource {
  if (!isRecord(value) || typeof value.id !== 'string' || !/^[A-Za-z][\w-]{0,63}$/.test(value.id) || ids.has(value.id)) throw new Error('Curve IDs must be unique, stable identifiers')
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 120) throw new Error(`Curve ${value.id} has an invalid name`)
  ids.add(value.id)
  if (value.type === 'linear') return value as CurveResource
  if (value.type === 'cubic-bezier') {
    if (!Array.isArray(value.points) || value.points.length !== 4 || value.points.some((point) => typeof point !== 'number' || !Number.isFinite(point)) || value.points[0] < 0 || value.points[0] > 1 || value.points[2] < 0 || value.points[2] > 1) throw new Error(`Curve ${value.id} has invalid cubic-bezier control points`)
    return value as CurveResource
  }
  if (value.type === 'spring') {
    if (typeof value.mass !== 'number' || !Number.isFinite(value.mass) || value.mass <= 0 || typeof value.stiffness !== 'number' || !Number.isFinite(value.stiffness) || value.stiffness <= 0 || typeof value.damping !== 'number' || !Number.isFinite(value.damping) || value.damping < 0) throw new Error(`Curve ${value.id} has invalid spring parameters`)
    return value as CurveResource
  }
  throw new Error(`Curve ${value.id} has an unsupported type`)
}

export function validateProject(value: unknown): Project {
  if (!isRecord(value) || !isRecord(value.manifest) || !isRecord(value.files)) throw new Error('Project data must contain a manifest and source files')
  const manifest = value.manifest
  if (manifest.formatVersion !== 1) throw new Error(`Unsupported project format version: ${String(manifest.formatVersion)}`)
  if (typeof manifest.name !== 'string' || !manifest.name.trim() || manifest.name.length > 120) throw new Error('project.json has an invalid project name')
  if (manifest.projectType !== 'canvas2d' && manifest.projectType !== 'html') throw new Error('project.json has an invalid project type')
  if (!isRecord(manifest.renderer) || manifest.renderer.type !== manifest.projectType) throw new Error('project.json renderer does not match the project type')
  if (manifest.projectType === 'canvas2d') {
    if (typeof manifest.renderer.width !== 'number' || !Number.isFinite(manifest.renderer.width) || manifest.renderer.width <= 0 || typeof manifest.renderer.height !== 'number' || !Number.isFinite(manifest.renderer.height) || manifest.renderer.height <= 0 || typeof manifest.renderer.background !== 'string') throw new Error('Canvas2D renderer settings are invalid')
  }
  if (typeof manifest.entry !== 'string') throw new Error('project.json has no entry path')
  const entry = normalizeProjectPath(manifest.entry)
  if (!isProjectEntry(entry, manifest.projectType)) throw new Error(`Entry file extension does not match project type: ${entry}`)

  const files: Record<string, string> = {}
  for (const [rawPath, contents] of Object.entries(value.files)) {
    const path = normalizeProjectPath(rawPath)
    if (path in files) throw new Error(`Duplicate normalized project path: ${path}`)
    if (typeof contents !== 'string') throw new Error(`Project file is not text: ${path}`)
    if (!isAllowedProjectFile(path, manifest.projectType)) throw new Error(`Unsupported ${manifest.projectType} project source file: ${path}`)
    files[path] = contents
  }
  if (!(entry in files)) throw new Error(`Entry file not found: ${entry}`)

  if (manifest.parameterValues !== undefined) {
    if (!isRecord(manifest.parameterValues) || Object.entries(manifest.parameterValues).some(([id, item]) => !/^[A-Za-z][\w-]{0,63}$/.test(id) || !['string', 'number', 'boolean'].includes(typeof item) || (typeof item === 'number' && !Number.isFinite(item)))) throw new Error('project.json has invalid parameter overrides')
  }
  const curveIds = new Set<string>()
  const curves = manifest.curves === undefined ? undefined : Array.isArray(manifest.curves) ? manifest.curves.map((curve) => validateCurve(curve, curveIds)) : (() => { throw new Error('project.json curves must be an array') })()
  return {
    manifest: { ...manifest, entry, ...(curves ? { curves } : {}) } as ProjectManifest,
    files,
  }
}

export async function readProjectDirectory(handle: DirectoryHandle): Promise<Project> {
  const manifestFile = await handle.getFileHandle('project.json')
  const manifest = JSON.parse(await (await manifestFile.getFile()).text()) as unknown

  const files: Record<string, string> = {}
  const walk = async (directory: FileSystemDirectoryHandle, parent = '') => {
    for await (const [name, entry] of directory.entries()) {
      const path = parent ? `${parent}/${name}` : name
      if ((entry as FileSystemDirectoryHandle).kind === 'directory' && !['.git', 'node_modules', 'dist'].includes(name)) await walk(entry as FileSystemDirectoryHandle, path)
      else if (/\.(?:[cm]?[jt]sx?|html?|css)$/i.test(name)) files[path] = await (await (entry as FileSystemFileHandle).getFile()).text()
    }
  }
  await walk(handle)
  return validateProject({ manifest, files })
}

export async function writeProjectDirectory(handle: DirectoryHandle, project: Project) {
  const validated = validateProject(project)
  const previouslyManaged = new Set<string>()
  try {
    const previousFile = await handle.getFileHandle('project.json')
    const previousManifest = JSON.parse(await (await previousFile.getFile()).text()) as unknown
    if (isRecord(previousManifest) && Array.isArray(previousManifest.sourceFiles)) {
      for (const path of previousManifest.sourceFiles) {
        if (typeof path !== 'string') continue
        try {
          const normalized = normalizeProjectPath(path)
          if (isAllowedProjectFile(normalized, validated.manifest.projectType)) previouslyManaged.add(normalized)
        } catch {
          // Ignore invalid paths in an old manifest; they are never safe to remove.
        }
      }
    }
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'NotFoundError')) throw error
  }
  const manifestFile = await handle.getFileHandle('project.json', { create: true })
  const manifestWriter = await manifestFile.createWritable()
  await manifestWriter.write(`${JSON.stringify({ ...validated.manifest, sourceFiles: Object.keys(validated.files) }, null, 2)}\n`)
  await manifestWriter.close()

  const currentFiles = new Set(Object.keys(validated.files))
  const removeStaleSources = async (directory: FileSystemDirectoryHandle, parent = ''): Promise<void> => {
    for await (const [name, entry] of directory.entries()) {
      if (['.git', 'node_modules', 'dist'].includes(name)) continue
      const path = parent ? `${parent}/${name}` : name
      if (entry.kind === 'directory') {
        await removeStaleSources(entry as FileSystemDirectoryHandle, path)
      } else if (previouslyManaged.has(path) && !currentFiles.has(path)) {
        await directory.removeEntry(name)
      }
    }
  }
  await removeStaleSources(handle)

  for (const [path, contents] of Object.entries(validated.files)) {
    const segments = path.split('/')
    const filename = segments.pop()!
    let directory = handle
    for (const segment of segments) directory = await directory.getDirectoryHandle(segment, { create: true })
    const file = await directory.getFileHandle(filename, { create: true })
    const writer = await file.createWritable()
    await writer.write(contents)
    await writer.close()
  }
}

export function isProjectSource(path: string) {
  return /\.(?:[cm]?[jt]sx?|html?|css)$/i.test(path)
}

export function isProjectEntry(path: string, type: ProjectManifest['projectType']) {
  return type === 'html' ? /\.html?$/i.test(path) : /\.(?:[cm]?[jt]sx?)$/i.test(path)
}

export function isAllowedProjectFile(path: string, type: ProjectManifest['projectType']) {
  return type === 'html' ? /\.(?:html?|css)$/i.test(path) : /\.(?:[cm]?[jt]sx?)$/i.test(path)
}
