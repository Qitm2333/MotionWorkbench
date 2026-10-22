import type { Project } from './project'

export async function prepareHtmlProject(project: Project, compile: (project: Project) => Promise<string>) {
  const files = { ...project.files }
  const directory = project.manifest.entry.split('/').slice(0, -1).join('/')
  const documentBase = `https://project.invalid/${directory ? `${directory}/` : ''}`
  const document = new DOMParser().parseFromString(files[project.manifest.entry], 'text/html')
  let inlineId = 0
  for (const script of document.querySelectorAll('script[type="module"]')) {
    const src = script.getAttribute('src')
    if (src && /^(?:[a-z]+:|\/\/)/i.test(src)) continue
    const path = src
      ? new URL(src, documentBase).pathname.slice(1)
      : `${directory ? `${directory}/` : ''}__inline_${inlineId++}.js`
    if (src && !(decodeURIComponent(path) in files)) throw new Error(`Module not found: ${src}`)
    files[decodeURIComponent(path)] = await compile({ ...project, manifest: { ...project.manifest, entry: decodeURIComponent(path) }, files: { ...project.files, [decodeURIComponent(path)]: src ? files[decodeURIComponent(path)] : script.textContent ?? '' } })
    script.setAttribute('src', src ?? `./__inline_${inlineId - 1}.js`)
    script.textContent = ''
  }
  return { files, assets: project.assets ?? {}, html: `<!doctype html>\n${document.documentElement.outerHTML}` }
}

// Runs entirely inside the sandbox. Blobs must be created here to keep textures
// and fetch readable by WebGL without granting access to the workbench origin.
export function previewBootstrap(session: string) {
  addEventListener('message', function initialize(event: MessageEvent) {
    if (event.source !== parent || event.data?.type !== 'workbench-resource-init' || event.data.session !== session) return
    removeEventListener('message', initialize)
    try {
      const { project, html, entryPath } = event.data as { project: { files: Record<string, string>; assets: Record<string, { mime: string; base64: string }> }; html: string; entryPath: string }
    const root = `https://motion-workbench.invalid/${session}/`
    const base = new URL(entryPath, root).href
    // Some renderers probe Storage for debug flags. Give sandboxed projects
    // their own ephemeral storage, never the host application's storage.
    for (const name of ['localStorage', 'sessionStorage'] as const) {
      try { void window[name].length } catch {
        const values = new Map<string, string>()
        Object.defineProperty(window, name, { configurable: true, value: {
          get length() { return values.size },
          key: (index: number) => [...values.keys()][index] ?? null,
          getItem: (key: string) => values.get(String(key)) ?? null,
          setItem: (key: string, value: string) => { values.set(String(key), String(value)) },
          removeItem: (key: string) => { values.delete(String(key)) },
          clear: () => values.clear(),
        } })
      }
    }
    const urls = new Map<string, string>()
    const created: string[] = []
    const blob = (body: BlobPart, type: string) => { const url = URL.createObjectURL(new Blob([body], { type })); created.push(url); return url }
    for (const [path, asset] of Object.entries(project.assets)) {
      const bytes = Uint8Array.from(atob(asset.base64), (character) => character.charCodeAt(0))
      if (/\.gltf$/i.test(path)) {
        // A blob URL has no directory. Keep external buffers/textures relative
        // to the model's original virtual path before GLTFLoader reads it.
        const model = JSON.parse(new TextDecoder().decode(bytes))
        for (const item of [...(model.buffers ?? []), ...(model.images ?? [])]) {
          if (typeof item.uri === 'string') item.uri = new URL(item.uri, new URL(path, root)).href
        }
        urls.set(path, blob(JSON.stringify(model), asset.mime))
      } else urls.set(path, blob(bytes, asset.mime))
    }
    const key = (input: string, relativeTo = base) => {
      const url = new URL(input, relativeTo)
      if (url.origin !== new URL(root).origin) return null
      return decodeURIComponent(url.pathname.startsWith(`/${session}/`) ? url.pathname.slice(session.length + 2) : url.pathname.slice(1)).replace(/\/{2,}/g, '/')
    }
    const resolve = (input: string, relativeTo = base): string => {
      const path = key(input, relativeTo)
      if (path === null) return input
      if (urls.has(path)) return urls.get(path)!
      const source = project.files[path]
      if (source === undefined) throw new Error(`Project resource not found: ${path}`)
      if (/\.css$/i.test(path)) {
        // Mark cycles before resolving imports.
        urls.set(path, 'data:text/css,')
        const cssBase = new URL(path, root).href
        const css = source.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_match, _quote, ref: string) => `url("${ref.startsWith('#') || ref.startsWith('data:') ? ref : resolve(ref, cssBase)}")`)
          .replace(/@import\s+(['"])(.*?)\1/gi, (_match, _quote, ref: string) => `@import "${resolve(ref, cssBase)}"`)
        urls.set(path, blob(css, 'text/css'))
      } else urls.set(path, blob(source, /\.html?$/i.test(path) ? 'text/html' : 'text/javascript'))
      return urls.get(path)!
    }
    const originalFetch = window.fetch.bind(window)
    window.fetch = (input, init) => {
      try {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const target = resolve(url)
        return originalFetch(input instanceof Request ? new Request(target, input) : target, init)
      } catch (error) { return Promise.reject(error) }
    }
    const originalOpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
      return Reflect.apply(originalOpen, this, [method, resolve(String(url)), ...rest])
    }
    const imageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!
    Object.defineProperty(HTMLImageElement.prototype, 'src', { ...imageSrc, set(value: string) { imageSrc.set!.call(this, resolve(value)) } })
    const originalSetAttribute = Element.prototype.setAttribute
    Element.prototype.setAttribute = function (name, value) {
      if (this instanceof HTMLImageElement && name.toLowerCase() === 'src') value = resolve(value)
      originalSetAttribute.call(this, name, value)
    }
    // Final document scripts use document.baseURI for project-relative URLs.
    const parsed = new DOMParser().parseFromString(html, 'text/html')
    for (const element of parsed.querySelectorAll('[src], link[href], [poster]')) {
      for (const attribute of ['src', 'href', 'poster']) {
        const value = element.getAttribute(attribute)
        if (!value || value.startsWith('#') || /^(?:data:|blob:)/.test(value)) continue
        // External links remain navigable; local script/style/media paths resolve.
        element.setAttribute(attribute, resolve(value))
      }
    }
    for (const anchor of parsed.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href')!
      if (!href || href.startsWith('#')) continue
      const path = key(href)
      // Downloadable project evidence/assets are resources; application route
      // links must keep their original navigation semantics.
      if (path !== null && urls.has(path)) anchor.setAttribute('href', resolve(href))
    }
    for (const style of parsed.querySelectorAll('style')) style.textContent = style.textContent.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_match, _quote, ref: string) => `url("${ref.startsWith('#') || ref.startsWith('data:') ? ref : resolve(ref)}")`)
    const baseElement = parsed.createElement('base')
    baseElement.href = base
    parsed.head.prepend(baseElement)
    // document.open removes event listeners, so the bridge is in the new HTML.
    document.open()
    document.write(`<!doctype html>${parsed.documentElement.outerHTML}`)
    document.close()
      addEventListener('pagehide', () => created.forEach((url) => URL.revokeObjectURL(url)), { once: true })
    } catch (error) {
      parent.postMessage({ type: 'workbench-error', message: error instanceof Error ? error.message : String(error) }, '*')
    }
  })
  parent.postMessage({ type: 'workbench-resource-ready', session }, '*')
}
