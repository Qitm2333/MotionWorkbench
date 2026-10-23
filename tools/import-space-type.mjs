import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { sourceControlBindings, sourceControlSpecs, sourcePresetLabels } from './space-type-bridge.mjs'

const bridgeRuntime = await readFile(new URL('./space-type-bridge-runtime.js', import.meta.url), 'utf8')

const root = path.resolve('public/examples')
const routes = [
  ['stripes', 'Stripes'], ['coil', 'Coil'], ['flag', 'Flag'], ['morisawa', 'Morisawa'],
  ['cascade', 'Cascade'], ['ribbon', 'Ribbon'], ['layers', 'Layers'], ['danger', 'Danger'],
  ['string', 'String'], ['badge', 'Badge'], ['clutter', 'Clutter'], ['construct', 'Construct'],
  ['snap', 'Snap'], ['flash', 'Flash'], ['pow', 'Pow'], ['crash', 'Crash'],
  ['crashclock', 'Crash Clock'], ['vessel', 'Vessel'], ['shine', 'Shine'], ['boost', 'Boost'],
  ['boxsquad', 'BoxSquad'],
]
const requested = new Set(process.argv.slice(2))

const sourceExtension = /\.(?:html?|css|js)$/i
const assetExtension = /\.(?:otf|ttf|woff2?|png|jpe?g|gif|svg|mp3|wav|mp4|webm|json)$/i
const analytics = /<script[^>]+(?:googletagmanager|cloudflareinsights|email-decode)[\s\S]*?<\/script>/gi

function localPath(url) {
  return decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '')
}

function localReference(value) {
  return value && !/^(?:https?:|\/\/|data:|blob:|#|mailto:)/i.test(value) && !value.startsWith('/cdn-cgi/')
}

function sourceReferences(html, tag, attribute) {
  const expression = new RegExp(`<${tag}[^>]+${attribute}=["']([^"']+)["']`, 'gi')
  return [...html.matchAll(expression)].map((match) => match[1])
}

function bridgeSource(specs, presetLabels) {
  return 'window.__SPACE_TYPE_WORKBENCH__ = ' + JSON.stringify({ dynamicSpecs: specs, presetLabels }) + ';\n' + sourceControlBindings(specs) + bridgeRuntime
}

async function fetchBytes(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return new Uint8Array(await response.arrayBuffer())
}

async function importRoute(route, name) {
  const pageUrl = new URL(`/${route}`, 'https://spacetypegenerator.com/')
  let html = new TextDecoder().decode(await fetchBytes(pageUrl))
  html = html.replace(analytics, '')
  const directory = path.join(root, `space-type-${route}`)
  const sourceFiles = new Map([['index.html', html]])
  const assetFiles = new Map()
  const localUrls = []
  for (const value of sourceReferences(html, 'script', 'src')) if (localReference(value)) localUrls.push(new URL(value, pageUrl))
  for (const value of sourceReferences(html, 'link', 'href')) if (localReference(value) && /stylesheet/i.test(html.slice(Math.max(0, html.indexOf(value) - 80), html.indexOf(value) + value.length + 80))) localUrls.push(new URL(value, pageUrl))

  for (const url of localUrls) {
    const file = localPath(url)
    const bytes = await fetchBytes(url)
    if (sourceExtension.test(file)) sourceFiles.set(file, new TextDecoder().decode(bytes))
    else assetFiles.set(file, bytes)
  }

  const references = []
  for (const [file, source] of sourceFiles) {
    if (file === 'index.html') continue
    // p5 loadFont/loadImage resolve relative to the document, not the script.
    const base = /\.css$/i.test(file) ? new URL(file, 'https://spacetypegenerator.com/') : pageUrl
    for (const match of source.matchAll(/["']([^"'?#]+\.(?:otf|ttf|woff2?|png|jpe?g|gif|svg|mp3|wav|mp4|webm|json))["']/gi)) {
      if (localReference(match[1])) references.push(new URL(match[1], base))
    }
    if (/\.css$/i.test(file)) for (const match of source.matchAll(/url\(\s*["']?([^"')?#]+)["']?\s*\)/gi)) if (localReference(match[1])) references.push(new URL(match[1], base))
  }
  for (const value of [...sourceReferences(html, 'img', 'src'), ...sourceReferences(html, 'source', 'src')]) if (localReference(value)) references.push(new URL(value, pageUrl))
  // Construct's preload loop uses a concatenated path, outside literal scanning.
  if (route === 'construct') for (let index = 0; index < 11; index++) references.push(new URL(`construct/resources/gifs/${index}.gif`, pageUrl))
  for (const url of references) {
    const file = localPath(url)
    if (!assetExtension.test(file) || assetFiles.has(file) || sourceFiles.has(file)) continue
    try { assetFiles.set(file, await fetchBytes(url)) } catch { /* Some optional recording assets are generated at runtime. */ }
  }

  const scriptSources = localUrls.filter((url) => /\.js$/i.test(url.pathname)).map((url) => sourceFiles.get(localPath(url)) || '')
  const specs = sourceControlSpecs(scriptSources)
  const presetLabels = sourcePresetLabels(scriptSources, html)
  sourceFiles.set('workbench-parameters.js', bridgeSource(specs, presetLabels))
  html = html.replace(/<\/body>/i, '<script src="./workbench-parameters.js"></script></body>')
  sourceFiles.set('index.html', html)
  const licensed = scriptSources.some((source) => /Creative Commons Attribution-NonCommercial-ShareAlike 4\.0/i.test(source))
  if (!licensed) return { route, name, licensed, controls: specs.length, skipped: 'No route-level redistribution license found' }
  const evidence = `# ${name} source audit\n\n- Reference: ${pageUrl.href}\n- Retrieved: 2026-10-23\n- Loaded local sources: ${localUrls.map((url) => `\`${localPath(url)}\``).join(', ')}\n- Source license marker: ${licensed ? 'CC BY-NC-SA 4.0 found in the loaded source.' : 'No route-level license marker found; retained for audit but not eligible for publication without rights confirmation.'}\n- Workbench bridge: ${specs.length} dynamically created controls were found in source. After p5 setup, the bridge mirrors actual DOM range, checkbox, radio, color, select, and string controls into Parameters.\n- Source presets/actions: ${presetLabels.length ? presetLabels.join(', ') : 'No preset buttons in this route.'}.\n- Boundary: the route keeps its own source renderer and control lifecycle. Analytics and Cloudflare instrumentation are removed. Third-party CDN libraries retain the exact versions requested by the live page.\n`
  assetFiles.set('EVIDENCE.md', new TextEncoder().encode(evidence))
  if (licensed) assetFiles.set('CC-BY-NC-SA-4.0.md', new TextEncoder().encode('Source code by Kiel Mutschelknaus is redistributed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International.\n\nhttps://creativecommons.org/licenses/by-nc-sa/4.0/\n'))
  const manifest = {
    formatVersion: 1,
    name,
    projectType: 'html',
    entry: 'index.html',
    renderer: { type: 'html' },
    sourceFiles: [...sourceFiles.keys()],
    assetFiles: [...assetFiles.keys()],
    metadata: { source: pageUrl.href, referenceRoute: `/${route}`, referenceRenderer: 'upstream p5.js sketch', licenseNote: licensed ? 'Upstream source retains CC BY-NC-SA 4.0 notice; see evidence and license.' : 'License confirmation required before publication.' },
  }
  await mkdir(directory, { recursive: true })
  for (const [file, source] of sourceFiles) { const target = path.join(directory, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, source) }
  for (const [file, bytes] of assetFiles) { const target = path.join(directory, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes) }
  await writeFile(path.join(directory, 'project.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return { route, name, licensed, controls: specs.length, sources: sourceFiles.size, assets: assetFiles.size }
}

const results = []
for (const [route, name] of routes) {
  if (requested.size && !requested.has(route)) continue
  try { results.push(await importRoute(route, name)) }
  catch (error) { results.push({ route, error: error instanceof Error ? error.message : String(error) }) }
}
console.table(results)
