import { build, initialize } from 'esbuild-wasm'
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url'
import { normalizeProjectPath, sampleCurveValue } from './project'
import type { CurveResource, Project } from './project'
import { opaqueOriginHistoryCompatibilityScript } from './historyCompatibility'

let initialized: Promise<void> | undefined

function normalize(path: string) {
  return normalizeProjectPath(path)
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
  parameters: ParameterDefinition[]
  getParameterValues: () => Record<string, ParameterValue>
  setParameter: (id: string, value: ParameterValue) => void
  resetParameters: () => void
  setCurve?: (curve: CurveResource) => void
  removeCurve?: (id: string) => void
}

export type ParameterValue = number | boolean | string

export type ParameterDefinition = {
  id: string
  label: string
  group?: string
} & (
  | { type: 'number'; default: number; min: number; max: number; step?: number }
  | { type: 'boolean'; default: boolean }
  | { type: 'color'; default: string }
  | { type: 'select'; default: string; options: Array<{ label: string; value: string }> }
)

function isHtmlParameterDefinition(value: unknown): value is ParameterDefinition {
  if (!value || typeof value !== 'object') return false
  const parameter = value as Record<string, unknown>
  if (typeof parameter.id !== 'string' || !/^[A-Za-z][\w-]{0,63}$/.test(parameter.id)) return false
  if (typeof parameter.label !== 'string' || !parameter.label.trim() || parameter.label.length > 120) return false
  if (parameter.group !== undefined && (typeof parameter.group !== 'string' || parameter.group.length > 120)) return false
  if (parameter.type === 'number') {
    return typeof parameter.default === 'number' && Number.isFinite(parameter.default)
      && typeof parameter.min === 'number' && Number.isFinite(parameter.min)
      && typeof parameter.max === 'number' && Number.isFinite(parameter.max)
      && parameter.min <= parameter.default && parameter.default <= parameter.max
      && (parameter.step === undefined || (typeof parameter.step === 'number' && Number.isFinite(parameter.step) && parameter.step > 0))
  }
  if (parameter.type === 'boolean') return typeof parameter.default === 'boolean'
  if (parameter.type === 'color') return typeof parameter.default === 'string' && /^#[\da-f]{6}$/i.test(parameter.default)
  if (parameter.type === 'select') {
    return typeof parameter.default === 'string' && Array.isArray(parameter.options)
      && parameter.options.length > 0
      && parameter.options.every((option) => option && typeof option.label === 'string' && typeof option.value === 'string')
      && parameter.options.some((option) => option.value === parameter.default)
  }
  return false
}

function isParameterValue(parameter: ParameterDefinition, value: unknown): value is ParameterValue {
  if (parameter.type === 'number') return typeof value === 'number' && Number.isFinite(value) && value >= parameter.min && value <= parameter.max
  if (parameter.type === 'boolean') return typeof value === 'boolean'
  if (parameter.type === 'color') return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)
  return typeof value === 'string' && parameter.options.some((option) => option.value === value)
}

type WithoutParameterId<T> = T extends { id: string } ? Omit<T, 'id'> : never
type ParameterDeclaration = WithoutParameterId<ParameterDefinition>

type ParameterApi = {
  define: (definitions: Record<string, ParameterDeclaration>) => Record<string, ParameterValue>
}

type CurveApi = { sample: (id: string, progress: number) => number }

export async function startPreview(canvas: HTMLCanvasElement, project: Project, onError: (error: Error) => void, parameterOverrides: Record<string, ParameterValue> = {}, shouldCommit: () => boolean = () => true): Promise<PreviewRuntime> {
  if (project.manifest.renderer.type !== 'canvas2d') throw new Error('Canvas preview requires a Canvas2D project')
  const output = await compileProject(project)
  if (!shouldCommit()) throw new Error('Preview build was superseded by a newer version')
  const moduleUrl = URL.createObjectURL(new Blob([output], { type: 'text/javascript' }))
  try {
    const module = await import(/* @vite-ignore */ moduleUrl) as { create?: (context: Record<string, unknown>) => Instance }
    if (typeof module.create !== 'function') throw new Error('Entry module must export create(context)')

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas2D is not available')
    const instance = { current: undefined as Instance | undefined }
    const parameterValues: Record<string, ParameterValue> = {}
    let parameters: ParameterDefinition[] = []
    const parameterApi: ParameterApi = {
      define(definitions) {
        const nextParameters = Object.entries(definitions).map(([id, definition]) => ({ id, ...definition })) as ParameterDefinition[]
        for (const parameter of nextParameters) {
          if (!isHtmlParameterDefinition(parameter)) throw new Error('Invalid parameter definition')
          if (!(parameter.id in parameterValues)) parameterValues[parameter.id] = parameter.default
        }
        parameters = nextParameters
        for (const parameter of parameters) {
          const value = parameterOverrides[parameter.id]
          if (value !== undefined && isParameterValue(parameter, value)) parameterValues[parameter.id] = value
        }
        return parameterValues
      },
    }
    const curves = (project.manifest.curves ?? []).map((curve) => curve.type === 'cubic-bezier'
      ? { ...curve, points: [...curve.points] as typeof curve.points }
      : { ...curve })
    const curveApi: CurveApi = {
      sample(id, progress) {
        const curve = curves.find((candidate) => candidate.id === id)
        if (!curve) throw new Error(`Unknown curve: ${id}`)
        if (!Number.isFinite(progress)) throw new Error('Curve progress must be a finite number')
        return sampleCurveValue(curve, progress)
      },
    }
    let animationFrame = 0
    let previous = 0
    let elapsed = 0
    let paused = false
    let disposed = false
    const width = project.manifest.renderer.width
    const height = project.manifest.renderer.height
    const background = project.manifest.renderer.background
    let pixelRatio = 0
    const syncCanvasResolution = () => {
      const nextRatio = Math.max(1, window.devicePixelRatio || 1)
      if (nextRatio === pixelRatio && canvas.width === Math.round(width * nextRatio) && canvas.height === Math.round(height * nextRatio)) return false
      pixelRatio = nextRatio
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      canvas.style.aspectRatio = `${width} / ${height}`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      return true
    }
    syncCanvasResolution()

    const redrawAfterResize = () => {
      if (syncCanvasResolution()) instance.current?.render?.({ time: elapsed, delta: 0 })
    }
    window.addEventListener('resize', redrawAfterResize)

    const createInstance = () => {
      instance.current?.dispose?.()
      instance.current = module.create!({ canvas, ctx: context, width, height, background, params: parameterApi, curves: curveApi })
      instance.current.render?.({ time: elapsed, delta: 0 })
    }
    createInstance()

    const tick = (now: number) => {
      animationFrame = 0
      if (disposed || paused) return
      syncCanvasResolution()
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
        return
      }
      animationFrame = requestAnimationFrame(tick)
    }
    animationFrame = requestAnimationFrame(tick)

    return {
      pause() { paused = true; previous = 0; if (animationFrame) cancelAnimationFrame(animationFrame); animationFrame = 0 },
      resume() { if (!paused || disposed) return; paused = false; previous = 0; animationFrame = requestAnimationFrame(tick) },
      reset() { elapsed = 0; previous = 0; createInstance() },
      dispose() { disposed = true; cancelAnimationFrame(animationFrame); window.removeEventListener('resize', redrawAfterResize); instance.current?.dispose?.(); URL.revokeObjectURL(moduleUrl) },
      getPaused() { return paused },
      get parameters() { return parameters },
      getParameterValues() { return { ...parameterValues } },
      setParameter(id, value) {
        const parameter = parameters.find((candidate) => candidate.id === id)
        if (!parameter) throw new Error(`Unknown parameter: ${id}`)
        if (parameter.type === 'number') {
          if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid value for parameter: ${id}`)
          parameterValues[id] = Math.min(parameter.max, Math.max(parameter.min, value))
        } else if (parameter.type === 'boolean') {
          if (typeof value !== 'boolean') throw new Error(`Invalid value for parameter: ${id}`)
          parameterValues[id] = value
        } else if (parameter.type === 'color') {
          if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) throw new Error(`Invalid color for parameter: ${id}`)
          parameterValues[id] = value
        } else {
          if (typeof value !== 'string' || !parameter.options.some((option) => option.value === value)) throw new Error(`Invalid option for parameter: ${id}`)
          parameterValues[id] = value
        }
        instance.current?.render?.({ time: elapsed, delta: 0 })
      },
      resetParameters() {
        for (const parameter of parameters) parameterValues[parameter.id] = parameter.default
        instance.current?.render?.({ time: elapsed, delta: 0 })
      },
      setCurve(resource) {
        if (resource.type === 'cubic-bezier' && (resource.points.length !== 4 || resource.points.some((point) => !Number.isFinite(point)) || resource.points[0] < 0 || resource.points[0] > 1 || resource.points[2] < 0 || resource.points[2] > 1)) {
          throw new Error(`Invalid cubic-bezier control points for curve: ${resource.id}`)
        }
        if (resource.type === 'spring' && (!Number.isFinite(resource.mass) || !Number.isFinite(resource.stiffness) || !Number.isFinite(resource.damping) || resource.mass <= 0 || resource.stiffness <= 0 || resource.damping < 0)) {
          throw new Error(`Invalid spring parameters for curve: ${resource.id}`)
        }
        const index = curves.findIndex((candidate) => candidate.id === resource.id)
        if (index >= 0) curves[index] = resource
        else curves.push(resource)
        instance.current?.render?.({ time: elapsed, delta: 0 })
      },
      removeCurve(id) {
        const index = curves.findIndex((candidate) => candidate.id === id)
        if (index >= 0) curves.splice(index, 1)
        instance.current?.render?.({ time: elapsed, delta: 0 })
      },
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

export function startHtmlPreview(frame: HTMLIFrameElement, project: Project, onParameters: (parameters: ParameterDefinition[], values: Record<string, ParameterValue>) => void, parameterOverrides: Record<string, ParameterValue> = {}, onError: (error: Error) => void = () => {}): PreviewRuntime {
  if (project.manifest.projectType !== 'html') throw new Error('HTML preview requires an HTML/CSS project')
  const entryPath = normalizeAssetPath(project.manifest.entry)
  let html = project.files[entryPath]
  if (html === undefined) throw new Error(`Entry file not found: ${entryPath}`)
  const entryDirectory = entryPath.split('/').slice(0, -1).join('/')
  const linkedStyles: string[] = []
  html = html.replace(/<script\b([^>]*?)\bsrc\s*=\s*(["'])(.*?)\2([^>]*)>\s*<\/script>/gi, (tag, before: string, _quote: string, src: string, after: string) => {
    if (/^(?:[a-z]+:|\/\/|\/|#|data:)/i.test(src)) return tag
    const relative = src.split(/[?#]/, 1)[0]
    const path = normalizeAssetPath(`${entryDirectory}/${relative}`)
    const script = project.files[path]
    if (script === undefined) throw new Error(`Script not found: ${src} (resolved to ${path})`)
    return `<script${before}${after}>${script.replace(/<\/script/gi, '<\\/script')}</script>`
  })
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
  const bridgeScript = `<script>
${opaqueOriginHistoryCompatibilityScript};
(() => {
  addEventListener('error', (event) => parent.postMessage({ type: 'workbench-error', message: event.message || 'Page script failed' }, '*'))
  addEventListener('unhandledrejection', (event) => parent.postMessage({ type: 'workbench-error', message: String(event.reason || 'Unhandled page promise rejection') }, '*'))
  const values = Object.create(null)
  let definitions = []
  const setCssValue = (id, value) => document.documentElement.style.setProperty('--param-' + id, typeof value === 'boolean' ? (value ? '1' : '0') : String(value))
  const define = (input) => {
    definitions = Object.entries(input).map(([id, definition]) => ({ id, ...definition }))
    for (const parameter of definitions) {
      values[parameter.id] = parameter.default
      setCssValue(parameter.id, parameter.default)
    }
    document.dispatchEvent(new CustomEvent('workbench:params', { detail: values }))
    parent.postMessage({ type: 'workbench-parameters', parameters: definitions, values: { ...values } }, '*')
    return values
  }
  addEventListener('message', (event) => {
    const data = event.data
    if (data?.type === 'workbench-pause') document.documentElement.classList.toggle('workbench-paused', Boolean(data.paused))
    if (data?.type === 'workbench-set-parameter' && data.id in values) {
      values[data.id] = data.value
      setCssValue(data.id, data.value)
      document.dispatchEvent(new CustomEvent('workbench:params', { detail: values }))
    }
    if (data?.type === 'workbench-reset-parameters') {
      for (const parameter of definitions) {
        values[parameter.id] = parameter.default
        setCssValue(parameter.id, parameter.default)
      }
      document.dispatchEvent(new CustomEvent('workbench:params', { detail: values }))
      parent.postMessage({ type: 'workbench-parameters', parameters: definitions, values: { ...values } }, '*')
    }
  })
  window.workbench = { params: { define, values } }
})()
</script>`
  const pauseStyle = `<style>.workbench-paused *, .workbench-paused *::before, .workbench-paused *::after { animation-play-state: paused !important; }</style>`
  const styles = `${linkedStyles.map((css) => `<style>${css}</style>`).join('')} ${pauseStyle}`
  const withBridge = html.replace(/<head\b[^>]*>/i, (head) => `${head}${bridgeScript}`)
  const srcdoc = /<head\b/i.test(html)
    ? withBridge.replace('</head>', `${styles}</head>`)
    : `${styles}${bridgeScript}${html}`
  let paused = false
  let disposed = false
  const renderDocument = () => { frame.srcdoc = srcdoc }
  const syncPausedState = () => frame.contentWindow?.postMessage({ type: 'workbench-pause', paused }, '*')
  let parameters: ParameterDefinition[] = []
  const parameterValues: Record<string, ParameterValue> = {}
  let initialized = false
  const onMessage = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow) return
    if (event.data?.type === 'workbench-error' && typeof event.data.message === 'string') {
      onError(new Error(event.data.message.slice(0, 1000)))
      return
    }
    if (event.data?.type !== 'workbench-parameters') return
    if (!Array.isArray(event.data.parameters) || event.data.parameters.length > 100 || !event.data.parameters.every(isHtmlParameterDefinition)) return
    const nextParameters = event.data.parameters as ParameterDefinition[]
    const nextValues = event.data.values
    if (!nextValues || typeof nextValues !== 'object' || Array.isArray(nextValues)) return
    if (nextParameters.some((parameter) => !isParameterValue(parameter, nextValues[parameter.id]))) return
    const overrides = initialized ? { ...parameterValues } : parameterOverrides
    parameters = nextParameters
    for (const id of Object.keys(parameterValues)) delete parameterValues[id]
    Object.assign(parameterValues, nextValues)
    for (const parameter of parameters) {
      const value = overrides[parameter.id]
      if (value !== undefined && isParameterValue(parameter, value)) {
        parameterValues[parameter.id] = value
        frame.contentWindow?.postMessage({ type: 'workbench-set-parameter', id: parameter.id, value }, '*')
      }
    }
    initialized = true
    onParameters(parameters, { ...parameterValues })
  }
  const syncState = () => {
    syncPausedState()
    for (const [id, value] of Object.entries(parameterValues)) frame.contentWindow?.postMessage({ type: 'workbench-set-parameter', id, value }, '*')
  }
  window.addEventListener('message', onMessage)
  frame.addEventListener('load', syncState)
  renderDocument()
  return {
    pause() { paused = true; syncPausedState() },
    resume() { paused = false; syncPausedState() },
    reset() { if (!disposed) renderDocument() },
    dispose() { disposed = true; frame.removeEventListener('load', syncState); window.removeEventListener('message', onMessage) },
    getPaused() { return paused },
    get parameters() { return parameters },
    getParameterValues() { return { ...parameterValues } },
    setParameter(id, value) {
      const parameter = parameters.find((candidate) => candidate.id === id)
      if (!parameter) throw new Error(`Unknown parameter: ${id}`)
      if (!isParameterValue(parameter, value)) throw new Error(`Invalid value for parameter: ${id}`)
      parameterValues[id] = value
      frame.contentWindow?.postMessage({ type: 'workbench-set-parameter', id, value }, '*')
    },
    resetParameters() {
      for (const parameter of parameters) parameterValues[parameter.id] = parameter.default
      frame.contentWindow?.postMessage({ type: 'workbench-reset-parameters' }, '*')
    },
  }
}

type Instance = {
  update?: (frame: { time: number; delta: number }) => void
  render?: (frame: { time: number; delta: number }) => void
  dispose?: () => void
}
