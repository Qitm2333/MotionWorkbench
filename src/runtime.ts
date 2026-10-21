import { build, initialize } from 'esbuild-wasm'
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url'
import type { Project } from './project'

let initialized: Promise<void> | undefined

function normalize(path: string) {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function candidates(path: string) {
  return [path, ...['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'].map((suffix) => `${path}${suffix}`)]
}

export async function compileProject(project: Project) {
  initialized ??= initialize({ wasmURL: wasmUrl })
  await initialized
  const files = project.files
  const result = await build({
    entryPoints: [normalize(project.manifest.entry)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    sourcemap: 'inline',
    plugins: [{
      name: 'workbench-project-files',
      setup(plugin) {
        plugin.onResolve({ filter: /.*/ }, (args) => {
          if (args.kind === 'entry-point') return { path: normalize(args.path), namespace: 'project' }
          if (!args.path.startsWith('.')) return { errors: [{ text: `Only project-relative imports are supported: ${args.path}` }] }
          const base = normalize(`${args.importer.split('/').slice(0, -1).join('/')}/${args.path}`)
          const resolved = candidates(base).find((candidate) => candidate in files)
          return resolved ? { path: resolved, namespace: 'project' } : { errors: [{ text: `Cannot resolve ${args.path} from ${args.importer}` }] }
        })
        plugin.onLoad({ filter: /.*/, namespace: 'project' }, (args) => {
          const contents = files[args.path]
          if (contents === undefined) return { errors: [{ text: `File not found: ${args.path}` }] }
          const extension = args.path.split('.').pop()?.toLowerCase()
          const loader = extension === 'tsx' ? 'tsx' : extension === 'jsx' ? 'jsx' : extension === 'ts' || extension === 'mts' || extension === 'cts' ? 'ts' : 'js'
          return { contents, loader, resolveDir: args.path.split('/').slice(0, -1).join('/') }
        })
      },
    }],
  })
  return result.outputFiles[0].text
}

export type PreviewRuntime = {
  pause: () => void
  resume: () => void
  reset: () => void
  dispose: () => void
  getPaused: () => boolean
}

export async function startPreview(canvas: HTMLCanvasElement, project: Project, onError: (error: Error) => void): Promise<PreviewRuntime> {
  if (project.manifest.renderer.type !== 'canvas2d') throw new Error('Canvas preview requires a Canvas2D project')
  const output = await compileProject(project)
  const moduleUrl = URL.createObjectURL(new Blob([output], { type: 'text/javascript' }))
  try {
    const module = await import(/* @vite-ignore */ moduleUrl) as { create?: (context: Record<string, unknown>) => Instance }
    if (typeof module.create !== 'function') throw new Error('Entry module must export create(context)')

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas2D is not available')
    const instance = { current: undefined as Instance | undefined }
    let animationFrame = 0
    let previous = 0
    let elapsed = 0
    let paused = false
    let disposed = false
    const width = project.manifest.renderer.width
    const height = project.manifest.renderer.height
    const background = project.manifest.renderer.background
    canvas.width = width
    canvas.height = height

    const createInstance = () => {
      instance.current?.dispose?.()
      instance.current = module.create!({ canvas, ctx: context, width, height, background })
      instance.current.render?.({ time: elapsed, delta: 0 })
    }
    createInstance()

    const tick = (now: number) => {
      if (disposed) return
      animationFrame = requestAnimationFrame(tick)
      if (paused) return
      const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0
      previous = now
      elapsed += delta
      const frame = { time: elapsed, delta }
      try {
        instance.current?.update?.(frame)
        instance.current?.render?.(frame)
      } catch (error) {
        paused = true
        onError(error instanceof Error ? error : new Error(String(error)))
      }
    }
    animationFrame = requestAnimationFrame(tick)

    return {
      pause() { paused = true; previous = 0 },
      resume() { paused = false; previous = 0 },
      reset() { elapsed = 0; previous = 0; createInstance() },
      dispose() { disposed = true; cancelAnimationFrame(animationFrame); instance.current?.dispose?.(); URL.revokeObjectURL(moduleUrl) },
      getPaused() { return paused },
    }
  } catch (error) {
    URL.revokeObjectURL(moduleUrl)
    throw error
  }
}

function normalizeAssetPath(path: string) {
  const parts: string[] = []
  for (const part of path.replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (!parts.length) throw new Error(`Project reference escapes the project folder: ${path}`)
      parts.pop()
    } else parts.push(part)
  }
  return parts.join('/')
}

export function startHtmlPreview(frame: HTMLIFrameElement, project: Project): PreviewRuntime {
  if (project.manifest.projectType !== 'html') throw new Error('HTML preview requires an HTML/CSS project')
  const entryPath = normalizeAssetPath(project.manifest.entry)
  let html = project.files[entryPath]
  if (html === undefined) throw new Error(`Entry file not found: ${entryPath}`)
  const entryDirectory = entryPath.split('/').slice(0, -1).join('/')
  const linkedStyles: string[] = []
  html = html.replace(/<link\b([^>]*?)\bhref\s*=\s*(["'])(.*?)\2([^>]*)>/gi, (tag, before: string, _quote: string, href: string, after: string) => {
    if (!/\brel\s*=\s*(["'])?stylesheet\1?/i.test(`${before} ${after}`)) return tag
    if (/^(?:[a-z]+:|\/\/|\/|#)/i.test(href)) return tag
    const relative = href.split(/[?#]/, 1)[0]
    const path = normalizeAssetPath(`${entryDirectory}/${relative}`)
    const css = project.files[path]
    if (css === undefined) throw new Error(`Stylesheet not found: ${href} (resolved to ${path})`)
    linkedStyles.push(css.replace(/<\/style/gi, '<\\/style'))
    return ''
  })
  const pauseScript = `<script>addEventListener('message',event=>{if(event.data?.type==='workbench-pause'){document.documentElement.classList.toggle('workbench-paused',Boolean(event.data.paused))}})</script>`
  const pauseStyle = `<style>.workbench-paused *, .workbench-paused *::before, .workbench-paused *::after { animation-play-state: paused !important; }</style>`
  const styles = `${linkedStyles.map((css) => `<style>${css}</style>`).join('')} ${pauseStyle}`
  const srcdoc = html.includes('</head>')
    ? html.replace('</head>', `${styles}</head>`)
    : `${styles}${html}`
  let paused = false
  let disposed = false
  const renderDocument = () => { frame.srcdoc = `${srcdoc}${pauseScript}` }
  const syncPausedState = () => frame.contentWindow?.postMessage({ type: 'workbench-pause', paused }, '*')
  frame.addEventListener('load', syncPausedState)
  renderDocument()
  return {
    pause() { paused = true; syncPausedState() },
    resume() { paused = false; syncPausedState() },
    reset() { if (!disposed) renderDocument() },
    dispose() { disposed = true; frame.removeEventListener('load', syncPausedState) },
    getPaused() { return paused },
  }
}

type Instance = {
  update?: (frame: { time: number; delta: number }) => void
  render?: (frame: { time: number; delta: number }) => void
  dispose?: () => void
}
