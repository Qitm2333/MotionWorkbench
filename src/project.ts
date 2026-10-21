export type ProjectManifest = {
  formatVersion: 1
  name: string
  entry: string
  projectType: 'canvas2d' | 'html'
  renderer: { type: 'canvas2d'; width: number; height: number; background: string } | { type: 'html' }
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

interface WorkbenchCanvasContext {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  background: string
  params: WorkbenchParameterApi
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
    'src/orbit-scene.ts': `export function createOrbitScene({ ctx, width, height, params: parameterApi }: WorkbenchCanvasContext): WorkbenchScene {
  const params = parameterApi.define({
    particleCount: { type: 'number', label: 'Particle count', default: 90, min: 20, max: 180, step: 1, group: 'Particles' },
    orbitSpeed: { type: 'number', label: 'Orbit speed', default: 1, min: 0.2, max: 2.5, step: 0.1, group: 'Motion' },
    showOrbits: { type: 'boolean', label: 'Show orbit guides', default: true, group: 'Display' },
    particleColor: { type: 'color', label: 'Particle color', default: '#438a82', group: 'Display' },
  })
  let time = 0
  const particles = Array.from({ length: 180 }, (_, index) => ({
    phase: (index / 180) * Math.PI * 2,
    radius: 28 + (index % 8) * 11,
    size: 2 + (index % 4) * 0.7,
  }))

  return {
    update(frame) { time += frame.delta },
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
        const angle = particle.phase + time * params.orbitSpeed * (0.28 + particle.radius / 210)
        const x = cx + Math.cos(angle) * particle.radius * (scale / 55)
        const y = cy + Math.sin(angle * 1.13) * particle.radius * 0.56 * (scale / 55)
        ctx.beginPath()
        ctx.fillStyle = params.particleColor
        ctx.arc(x, y, particle.size * (scale / 160), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.beginPath()
      ctx.fillStyle = '#d2603f'
      ctx.arc(cx, cy, 5, 0, Math.PI * 2)
      ctx.fill()
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

const normalizePath = (path: string) => {
  const parts: string[] = []
  for (const part of path.replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

export async function readProjectDirectory(handle: DirectoryHandle): Promise<Project> {
  const manifestFile = await handle.getFileHandle('project.json')
  const manifest = JSON.parse(await (await manifestFile.getFile()).text()) as ProjectManifest
  if (manifest.formatVersion !== 1) throw new Error(`Unsupported project format version: ${manifest.formatVersion}`)
  if (!manifest.entry || !['canvas2d', 'html'].includes(manifest.projectType) || manifest.renderer?.type !== manifest.projectType) throw new Error('project.json is missing a valid project type, entry, or renderer')

  const files: Record<string, string> = {}
  const walk = async (directory: FileSystemDirectoryHandle, parent = '') => {
    for await (const [name, entry] of directory.entries()) {
      const path = parent ? `${parent}/${name}` : name
      if ((entry as FileSystemDirectoryHandle).kind === 'directory' && !['.git', 'node_modules', 'dist'].includes(name)) await walk(entry as FileSystemDirectoryHandle, path)
      else if (/\.(?:[cm]?[jt]sx?|html?|css)$/i.test(name)) files[path] = await (await (entry as FileSystemFileHandle).getFile()).text()
    }
  }
  await walk(handle)
  if (manifest.projectType === 'html' ? !/\.html?$/i.test(manifest.entry) : !/\.(?:[cm]?[jt]sx?)$/i.test(manifest.entry)) {
    throw new Error(`Entry file extension does not match project type: ${manifest.entry}`)
  }
  if (!files[normalizePath(manifest.entry)]) throw new Error(`Entry file not found: ${manifest.entry}`)
  return { manifest, files }
}

export async function writeProjectDirectory(handle: DirectoryHandle, project: Project) {
  const manifestFile = await handle.getFileHandle('project.json', { create: true })
  const manifestWriter = await manifestFile.createWritable()
  await manifestWriter.write(`${JSON.stringify(project.manifest, null, 2)}\n`)
  await manifestWriter.close()

  for (const [rawPath, contents] of Object.entries(project.files)) {
    const path = normalizePath(rawPath)
    if (!path || path.startsWith('..')) throw new Error(`Invalid project path: ${rawPath}`)
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
